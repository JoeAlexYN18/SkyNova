// Improvement 11

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, router, useIsFocused } from 'expo-router';
import { ActivityIndicator, Animated, BackHandler, Easing, Image, Keyboard, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Product, ProductBrand, ProductCategory } from '@/domain/entities/Product';
import type { Order } from '@/domain/entities/Order';
import type { HomeProductCollections, UserReviewItem } from '@/domain/repositories/IProductRepository';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useCart } from '@/infrastructure/context/CartContext';
import { useOrders } from '@/infrastructure/context/OrderContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import { productRepository } from '@/infrastructure/container';
import { hasNetworkConnection } from '@/infrastructure/data/firebaseDataSync';
import { BrandLogo } from '@/presentation/components/BrandLogo';
import { CatalogFeed, type CatalogInitialFilters } from '@/presentation/components/CatalogFeed';
import { CartFeed } from '@/presentation/components/CartFeed';
import { ProductDetailModal } from '@/presentation/components/ProductDetailModal';
import { AboutSkyNovaModal } from '@/presentation/components/AboutSkyNovaModal';
import { AccountSettingsModal } from '@/presentation/components/AccountSettingsModal';
import { HomeFeed, type CatalogEntryOptions } from '@/presentation/components/HomeFeed';
import { ProductSearchBar } from '@/presentation/components/ProductSearchBar';
import { useNetworkStatus } from '@/presentation/hooks/useNetworkStatus';
import { styles } from '@/presentation/screens/HomeScreen.styles';
import { colors } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { getOrderDisplayState, groupOrders, type OrderDisplayTone } from '@/shared/utils/orderDisplay';

type Section = 'Inicio' | 'Catálogo' | 'Carrito' | 'Perfil';
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { currentUser, isInitializing, logout, updateProfile, deleteAccount } = useAuth();
  const { itemCount, lines: cartLines, addProduct, waitForPendingWrites, forgetAccountCart } = useCart();
  const { orders, unreadOrderCount, markOrdersRead, forgetUserData } = useOrders();
  const isOnline = useNetworkStatus();
  const { show } = useToast();
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showMyReviews, setShowMyReviews] = useState(false);
  const [myReviews, setMyReviews] = useState<UserReviewItem[]>([]);
  const [myReviewsLoaded, setMyReviewsLoaded] = useState(false);
  const [myReviewsError, setMyReviewsError] = useState(false);
  const [reviewProducts, setReviewProducts] = useState<Record<string, Product>>({});
  const [showAbout, setShowAbout] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [homeCollections, setHomeCollections] = useState<HomeProductCollections>({ featuredDrones: [], bestSellingAccessories: [] });
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [searchTransition] = useState(() => new Animated.Value(0));
  const [section, setSection] = useState<Section>('Inicio');
  const [catalogInitialFilters, setCatalogInitialFilters] = useState<CatalogInitialFilters>({});
  const [catalogFeedKey, setCatalogFeedKey] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [openCatalogFilters, setOpenCatalogFilters] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutFlight] = useState(() => new Animated.Value(0));
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchSuggestionsVisible, setIsSearchSuggestionsVisible] = useState(false);
  const catalogSearchHandler = useRef<((query: string) => void) | null>(null);
  const searchDraftBeforeSearchMode = useRef('');

  useEffect(() => {
    if (!isSearchMode) return;
    searchTransition.setValue(0);
    const animation = Animated.timing(searchTransition, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [isSearchMode, searchTransition]);

  const rememberSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    setRecentSearches((current) => [
      trimmedQuery,
      ...current.filter((recent) => recent.toLocaleLowerCase() !== trimmedQuery.toLocaleLowerCase()),
    ].slice(0, 5));
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isFocused) return false;
      if (isSearchMode) {
        setIsSearchMode(false);
        setIsSearchSuggestionsVisible(false);
        setSearchDraft(searchDraftBeforeSearchMode.current);
        Keyboard.dismiss();
        return true;
      }
      if (showMyReviews) {
        setShowMyReviews(false);
        return true;
      }
      if (showOrderHistory) {
        setShowOrderHistory(false);
        return true;
      }
      if (section !== 'Inicio') {
        setSection('Inicio');
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return true;
      }
      BackHandler.exitApp();
      return true;
    });
    return () => subscription.remove();
  }, [isFocused, isSearchMode, showMyReviews, showOrderHistory, section]);

  const handleLogout = useCallback(() => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    Animated.timing(logoutFlight, {
      toValue: 1,
      duration: 1100,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      void logout().catch((error: unknown) => {
        setIsLoggingOut(false);
        logoutFlight.setValue(0);
        show(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.', 'error');
      });
    });
  }, [isLoggingOut, logout, logoutFlight, show]);

  const navigateToCatalog = useCallback((options: CatalogEntryOptions = {}) => {
    const { openFilters = false, ...filters } = options;
    if (section === 'Catálogo' && (filters.categoryId || filters.brand || openFilters)) {
      setCatalogFeedKey((current) => current + 1);
    }
    setIsSearchMode(false);
    setIsSearchSuggestionsVisible(false);
    setSearchDraft(filters.search ?? '');
    setCatalogInitialFilters(filters);
    setOpenCatalogFilters(openFilters);
    setSection('Cat\u00e1logo');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [section]);

  const navigateToSection = useCallback((nextSection: Section) => {
    setIsSearchMode(false);
    setIsSearchSuggestionsVisible(false);
    setSection(nextSection);
    if (nextSection === 'Perfil') {
      setShowOrderHistory(false);
      setShowMyReviews(false);
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const enterSearchMode = useCallback(() => {
    searchDraftBeforeSearchMode.current = searchDraft;
    setIsSearchSuggestionsVisible(false);
    setIsSearchMode(true);
  }, [searchDraft]);

  const registerCatalogSearchHandler = useCallback((handler: ((query: string) => void) | null) => {
    catalogSearchHandler.current = handler;
  }, []);

  const leaveSearchMode = useCallback(() => {
    setIsSearchMode(false);
    setIsSearchSuggestionsVisible(false);
    Keyboard.dismiss();
  }, []);

  const cancelSearchMode = useCallback(() => {
    setSearchDraft(searchDraftBeforeSearchMode.current);
    leaveSearchMode();
  }, [leaveSearchMode]);

  const applySearch = useCallback((query: string) => {
    setSearchDraft(query);
    setIsSearchMode(false);
    setIsSearchSuggestionsVisible(false);
    Keyboard.dismiss();
    if (section === 'Catálogo') {
      catalogSearchHandler.current?.(query);
      return;
    }
    navigateToCatalog({ search: query || undefined });
  }, [navigateToCatalog, section]);

  const handleAddProduct = useCallback((product: Parameters<typeof addProduct>[0]) => {
    const added = addProduct(product);
    show(
      added ? 'Agregado al carrito' : product.isActive && product.stockQuantity > 0 ? 'Ya alcanzaste el máximo disponible' : 'Producto sin stock',
      added ? 'success' : 'info',
    );
  }, [addProduct, show]);

  useEffect(() => {
    let active = true;
    const loadLocalCatalog = async () => {
      const [nextCategories, collections, nextBrands] = await Promise.all([
        productRepository.listCategories(),
        productRepository.listHomeCollections(),
        productRepository.listBrands(),
      ]);
      if (active) {
        setCategories(nextCategories);
        setHomeCollections(collections);
        setBrands(nextBrands);
      }
    };
    void (async () => {
      try {
        await loadLocalCatalog();
      } catch (error) {
        if (active) show(error instanceof Error ? error.message : 'No se pudo cargar el catálogo local.', 'error');
      }
      try {
        const catalogChanged = await productRepository.syncCatalog();
        if (catalogChanged && active) {
          await loadLocalCatalog();
          setCatalogFeedKey((key) => key + 1);
        }
      } catch (error) {
        if (active) {
          void hasNetworkConnection().then((online) => {
            if (!active || !online) return;
            show(error instanceof Error
              ? `Se usará el catálogo local: ${error.message}`
              : 'No se pudo sincronizar el catálogo; se usará la copia local.', 'info');
          });
        }
      }
    })();
    return () => { active = false; };
  }, [show]);

  useEffect(() => {
    if (!isOnline || !currentUser) return;
    void productRepository.syncPendingReviews(() => {
      show('No se pudieron publicar las reseñas pendientes; se reintentará automáticamente.', 'info');
    }).then((count) => {
      if (count > 0) show('Tus reseñas pendientes ya están sincronizadas.', 'success');
    }).catch(() => {});
  }, [isOnline, currentUser, show]);

  const { all: userOrders, needsAttention, active: activeOrders, delivered: deliveredOrders, cancelled: cancelledOrders } = useMemo(
    () => groupOrders(orders),
    [orders],
  );
  const openOrder = (orderId: string) => {
    router.push({ pathname: '/order/[id]', params: { id: orderId } });
  };

  const loadMyReviews = useCallback(async () => {
    if (!currentUser) return;
    try {
      const items = await productRepository.listUserReviews(currentUser.id);
      setMyReviews(items);
      setMyReviewsError(false);
    } catch {
      setMyReviewsError(true);
    } finally {
      setMyReviewsLoaded(true);
    }
  }, [currentUser]);

  const ensureReviewProducts = useCallback(async () => {
    try {
      const page = await productRepository.listProducts({ page: 1, pageSize: 1000 });
      const map: Record<string, Product> = {};
      for (const item of page.items) map[item.id] = item;
      setReviewProducts(map);
    } catch {
      // El catálogo local puede no estar listo todavía; las reseñas igual se muestran.
    }
  }, []);

  const reviewsSectionVisible = section === 'Perfil' && !showOrderHistory;
  useEffect(() => {
    if (!currentUser || !reviewsSectionVisible) return;
    void loadMyReviews();
    void ensureReviewProducts();
  }, [currentUser, reviewsSectionVisible, isOnline, loadMyReviews, ensureReviewProducts]);

  if (isInitializing) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} />
    </SafeAreaView>;
  }
  if (!currentUser) return <Redirect href={'/login' as never} />;

  const firstName = currentUser.fullName.trim().split(/\s+/)[0];
  const unreadOrders = unreadOrderCount(currentUser.id);
  const orderSummary = [
    needsAttention.length > 0 && `${needsAttention.length} por confirmar`,
    activeOrders.length > 0 && `${activeOrders.length} en curso`,
    deliveredOrders.length > 0 && `${deliveredOrders.length} entregado${deliveredOrders.length === 1 ? '' : 's'}`,
    cancelledOrders.length > 0 && `${cancelledOrders.length} cancelado${cancelledOrders.length === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ') || 'Sin pedidos';
  const pendingReviewCount = myReviews.filter((review) => review.syncStatus !== 'synced').length;
  const reviewsSummary = !myReviewsLoaded
    ? 'Tus calificaciones y opiniones'
    : [
      myReviews.length > 0 && `${myReviews.length} reseña${myReviews.length === 1 ? '' : 's'}`,
      pendingReviewCount > 0 && `${pendingReviewCount} pendiente${pendingReviewCount === 1 ? '' : 's'}`,
    ].filter(Boolean).join(' · ') || 'Sin reseñas';

  const openMyReviews = () => {
    setShowOrderHistory(false);
    setShowMyReviews(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openOrderHistory = () => {
    markOrdersRead(currentUser.id);
    setShowMyReviews(false);
    setShowOrderHistory(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openOrdersFromCheckout = () => {
    setSection('Perfil');
    openOrderHistory();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.brand}
            onPress={() => setShowAbout(true)}
            accessibilityRole="button"
            accessibilityLabel="Acerca de SkyNova"
            accessibilityHint="Abre información sobre la tienda y sus datos de contacto"
          >
            <BrandLogo size={42} iconSize={27} />
            <View>
              <Text style={styles.brandText}>SkyNova</Text>
              <Text style={styles.brandCaption}>DRONES, ACCESORIOS Y REPUESTOS</Text>
            </View>
          </TouchableOpacity>
        </View>

        {!isOnline && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <MaterialCommunityIcons name="cloud-off-outline" size={17} color={colors.warning} />
            <Text style={styles.offlineBannerText}>Sin conexión. Tus cambios se guardan en el dispositivo y se sincronizan automáticamente.</Text>
          </View>
        )}

        {section === 'Inicio' ? (
          <HomeFeed
            firstName={firstName}
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            onEnterSearchMode={enterSearchMode}
            categories={categories}
            brands={brands}
            recentSearches={recentSearches}
            onRememberSearch={rememberSearch}
            suggestionsVisible={isSearchSuggestionsVisible}
            onSuggestionsVisibilityChange={setIsSearchSuggestionsVisible}
            featured={homeCollections.featuredDrones}
            accessories={homeCollections.bestSellingAccessories}
            onNavigateCatalog={navigateToCatalog}
            onAddProduct={handleAddProduct}
            onOpenProduct={setSelectedProduct}
          />
        ) : section === 'Catálogo' ? (
          <CatalogFeed
            key={catalogFeedKey}
            initialFilters={catalogInitialFilters}
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            onEnterSearchMode={enterSearchMode}
            onRegisterSearchHandler={registerCatalogSearchHandler}
            openFiltersOnStart={openCatalogFilters}
            onAddProduct={handleAddProduct}
            onOpenProduct={setSelectedProduct}
            recentSearches={recentSearches}
            onRememberSearch={rememberSearch}
            suggestionsVisible={isSearchSuggestionsVisible}
            onSuggestionsVisibilityChange={setIsSearchSuggestionsVisible}
          />
        ) : section === 'Carrito' ? (
          <CartFeed
            key={currentUser.id}
            onBrowseCatalog={navigateToCatalog}
            onOpenProduct={setSelectedProduct}
            onViewOrders={openOrdersFromCheckout}
          />
        ) : showMyReviews ? (
          <View style={styles.orderPage}>
            <TouchableOpacity style={styles.orderBackButton} onPress={() => setShowMyReviews(false)} accessibilityRole="button">
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} />
              <Text style={styles.orderBackText}>Perfil</Text>
            </TouchableOpacity>
            <View style={styles.orderPageHeading}>
              <View>
                <Text style={styles.sectionTitle}>Mis reseñas</Text>
                <Text style={styles.sectionSubtitle}>{myReviews.length} {myReviews.length === 1 ? 'reseña' : 'reseñas'} en total</Text>
              </View>
              <View style={styles.profileOrdersIcon}><MaterialCommunityIcons name="star-outline" size={21} color={colors.primary} /></View>
            </View>
            {!myReviewsLoaded ? (
              <View style={styles.centerState}><ActivityIndicator color={colors.primary} /></View>
            ) : myReviewsError ? (
              <View style={styles.orderEmptyCard}>
                <View style={styles.emptyIcon}><MaterialCommunityIcons name="cloud-alert-outline" size={36} color={colors.danger} /></View>
                <Text style={styles.orderEmptyTitle}>No se pudieron cargar tus reseñas</Text>
                <Text style={styles.orderEmpty}>Revisa tu conexión e inténtalo de nuevo.</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => { setMyReviewsLoaded(false); void loadMyReviews(); }}>
                  <Text style={styles.primaryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : myReviews.length === 0 ? (
              <View style={styles.orderEmptyCard}>
                <View style={styles.emptyIcon}><MaterialCommunityIcons name="star-outline" size={36} color={colors.primary} /></View>
                <Text style={styles.orderEmptyTitle}>Aún no tienes reseñas</Text>
                <Text style={styles.orderEmpty}>Califica los productos que hayas probado y compártenos tu opinión.</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => navigateToSection('Catálogo')}>
                  <Text style={styles.primaryButtonText}>Explorar catálogo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.orderHistory}>
                {myReviews.map((review) => (
                  <MyReviewCard
                    key={review.id}
                    review={review}
                    product={reviewProducts[review.productId]}
                    onOpenProduct={(product) => setSelectedProduct(product)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : showOrderHistory ? (
          <View style={styles.orderPage}>
            <TouchableOpacity style={styles.orderBackButton} onPress={() => setShowOrderHistory(false)} accessibilityRole="button">
                <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} />
                <Text style={styles.orderBackText}>Perfil</Text>
              </TouchableOpacity>
              <View style={styles.orderPageHeading}>
                <View>
                  <Text style={styles.sectionTitle}>Mis pedidos</Text>
                  <Text style={styles.sectionSubtitle}>{userOrders.length} {userOrders.length === 1 ? 'pedido' : 'pedidos'} en total</Text>
                </View>
                <View style={styles.profileOrdersIcon}><MaterialCommunityIcons name="clipboard-list-outline" size={21} color={colors.primary} /></View>
              </View>
              {userOrders.length === 0 ? (
                <View style={styles.orderEmptyCard}>
                  <View style={styles.emptyIcon}><MaterialCommunityIcons name="package-variant-closed" size={36} color={colors.primary} /></View>
                  <Text style={styles.orderEmptyTitle}>Aún no tienes pedidos</Text>
                  <Text style={styles.orderEmpty}>Cuando confirmes una compra, podrás seguir su estado aquí.</Text>
                  <TouchableOpacity style={styles.primaryButton} onPress={() => navigateToSection('Catálogo')}>
                    <Text style={styles.primaryButtonText}>Explorar catálogo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.orderHistory}>
                  <OrderSection title="Por confirmar" orders={needsAttention} onSelect={openOrder} />
                  <OrderSection title="En curso" orders={activeOrders} onSelect={openOrder} />
                  <OrderSection title="Entregados" orders={deliveredOrders} onSelect={openOrder} defaultVisible={5} />
                  <OrderSection title="Cancelados" orders={cancelledOrders} onSelect={openOrder} defaultVisible={3} />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{firstName.slice(0, 1).toUpperCase()}</Text></View>
              <Text style={styles.profileName}>{currentUser.fullName}</Text>
              <Text style={styles.profileEmail}>{currentUser.email}</Text>
              <View style={styles.profileDivider} />
              <View style={styles.profileAccountDetails}>
                <Text style={styles.profileAccountHeading}>Datos de tu cuenta</Text>
                <ProfileDetailRow label="Teléfono" value={`${currentUser.phone.dialCode} ${currentUser.phone.number}`} />
                <ProfileDetailRow label="Miembro desde" value={new Date(currentUser.createdAt).toLocaleDateString('es-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
                <TouchableOpacity
                  style={styles.profileEditButton}
                  onPress={() => setShowAccountSettings(true)}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="account-edit-outline" size={18} color={colors.onPrimary} />
                  <Text style={styles.profileEditButtonText}>Editar información y seguridad</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.profileDivider} />
              <TouchableOpacity style={styles.profileOrdersButton} onPress={openOrderHistory} accessibilityRole="button">
                <View style={styles.profileOrdersIcon}><MaterialCommunityIcons name="clipboard-list-outline" size={20} color={colors.primary} /></View>
                <View style={styles.profileOrdersCopy}><Text style={styles.profileOrdersTitle}>Mis pedidos</Text><Text style={styles.profileOrdersSubtitle}>{orderSummary}</Text></View>
                <View style={styles.orderRowActions}>
                  {unreadOrders > 0 && <View style={styles.profileOrdersBadge}><Text style={styles.profileOrdersBadgeText}>{unreadOrders > 99 ? '99+' : unreadOrders}</Text></View>}
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
              <View style={styles.profileDivider} />
              <TouchableOpacity style={styles.profileOrdersButton} onPress={openMyReviews} accessibilityRole="button">
                <View style={styles.profileOrdersIcon}><MaterialCommunityIcons name="star-outline" size={20} color={colors.primary} /></View>
                <View style={styles.profileOrdersCopy}><Text style={styles.profileOrdersTitle}>Mis reseñas</Text><Text style={styles.profileOrdersSubtitle}>{reviewsSummary}</Text></View>
                <View style={styles.orderRowActions}>
                  {pendingReviewCount > 0 && <View style={styles.profileOrdersBadge}><Text style={styles.profileOrdersBadgeText}>{pendingReviewCount > 99 ? '99+' : pendingReviewCount}</Text></View>}
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
              <View style={styles.profileDivider} />
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isLoggingOut}>
                <MaterialCommunityIcons name="logout" size={19} color={colors.danger} /><Text style={styles.logoutText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {([
          ['Inicio', 'home-variant-outline'], ['Catálogo', 'view-grid-outline'], ['Carrito', 'cart-outline'], ['Perfil', 'account-outline'],
        ] as const).map(([label, icon]) => (
          <TouchableOpacity key={label} style={styles.tab} onPress={() => label === 'Cat\u00e1logo' ? navigateToCatalog() : navigateToSection(label)} accessibilityRole="button" accessibilityState={{ selected: section === label }}>
            <View style={styles.tabIconWrap}>
              <MaterialCommunityIcons name={icon} size={21} color={section === label ? colors.primary : colors.textMuted} />
              {label === 'Carrito' && itemCount > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text></View>}
              {label === 'Perfil' && unreadOrders > 0 && <View style={styles.tabDot} />}
            </View>
            <Text style={[styles.tabText, section === label && styles.tabTextActive]}>{label}</Text>
            {section === label && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {isSearchMode && (
        <Animated.View
          style={[
            styles.searchScreenOverlay,
            {
              top: insets.top,
              right: insets.right,
              bottom: insets.bottom,
              left: insets.left,
              opacity: searchTransition.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              transform: [{ translateY: searchTransition.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          <ProductSearchBar
            value={searchDraft}
            suggestionsVisible={isSearchSuggestionsVisible}
            onDraftChange={setSearchDraft}
            categories={categories}
            brands={brands}
            recentSearches={recentSearches}
            onSearch={applySearch}
            onRememberSearch={rememberSearch}
            onOpenProduct={(product) => {
              leaveSearchMode();
              setSelectedProduct(product);
            }}
            onSelectCategory={(category) => navigateToCatalog({ categoryId: category.id })}
            onSelectBrand={(brand) => navigateToCatalog({ brand: brand.name })}
            onSuggestionsVisibilityChange={setIsSearchSuggestionsVisible}
            dedicated
            onBack={cancelSearchMode}
            catalog={section === 'Catálogo'}
          />
        </Animated.View>
      )}

      <ProductDetailModal
        key={selectedProduct?.id ?? 'no-product'}
        product={selectedProduct}
        categories={categories}
        onClose={() => {
          setSelectedProduct(null);
          if (showMyReviews) void loadMyReviews();
        }}
        onAdd={handleAddProduct}
        onBuyNow={(product) => {
          if (cartLines.some((line) => line.product.id === product.id)) show('Este producto ya está en tu carrito; puedes revisar la cantidad allí.', 'info');
          else handleAddProduct(product);
          setSelectedProduct(null);
          navigateToSection('Carrito');
        }}
      />
      <AboutSkyNovaModal visible={showAbout} onClose={() => setShowAbout(false)} />
      {showAccountSettings && (
        <AccountSettingsModal
          key={currentUser.id}
          user={currentUser}
          visible
          onClose={() => setShowAccountSettings(false)}
          onSave={async (input) => { await updateProfile(input); }}
          onDeleteAccount={async (password) => {
            await waitForPendingWrites();
            await deleteAccount(password);
            forgetAccountCart(currentUser.id);
            forgetUserData(currentUser.id);
          }}
        />
      )}
      {isLoggingOut && (
        <Modal visible transparent={false} animationType="none" statusBarTranslucent onRequestClose={() => {}}>
        <View style={logoutStyles.overlay}>
          <Animated.View
            style={{
              opacity: logoutFlight.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 1] }),
              transform: [
                { translateY: logoutFlight.interpolate({ inputRange: [0, 1], outputRange: [-100, 140] }) },
                { translateX: logoutFlight.interpolate({ inputRange: [0, 0.5, 1], outputRange: [45, -20, -65] }) },
                { scale: logoutFlight.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.7, 1.2, 0.65] }) },
                { rotate: logoutFlight.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['14deg', '-10deg', '18deg'] }) },
              ],
            }}
          >
            <MaterialCommunityIcons name="quadcopter" size={100} color={colors.primary} />
          </Animated.View>
          <Text style={logoutStyles.label}>CERRANDO SESIÓN</Text>
          <Text style={logoutStyles.brand}>SkyNova</Text>
        </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

function ProfileDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileDetailRow}>
      <Text style={styles.profileDetailLabel}>{label}</Text>
      <Text style={styles.profileDetailValue} numberOfLines={1}>{value || 'No registrado'}</Text>
    </View>
  );
}

const logoutStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 28 },
  brand: { color: colors.textPrimary, fontSize: 28, fontWeight: '800', marginTop: 8 },
});

const ORDER_TONE_STYLES: Record<OrderDisplayTone, { background: object; text: object }> = {
  warning: { background: styles.orderStatusPending, text: styles.orderStatusTextPending },
  danger: { background: styles.orderStatusDanger, text: styles.orderStatusTextDanger },
  success: { background: styles.orderStatusPaid, text: styles.orderStatusTextPaid },
  info: { background: styles.orderStatusShipped, text: styles.orderStatusTextShipped },
  primary: { background: styles.orderStatusDelivered, text: styles.orderStatusTextDelivered },
  muted: { background: styles.orderStatusCancelled, text: styles.orderStatusTextCancelled },
};

function OrderStateChip({ order }: { order: Order }) {
  const display = getOrderDisplayState(order);
  const tone = ORDER_TONE_STYLES[display.tone];
  return (
    <View style={[styles.orderStatusBadge, tone.background]}>
      <Text style={[styles.orderStatusText, tone.text]}>{display.label}</Text>
    </View>
  );
}

function formatOrderTotal(items: { quantity: number; unitPrice: number }[], currency: string) {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return formatCurrency(total, currency);
}

function OrderSection({
  title,
  orders,
  onSelect,
  defaultVisible = orders.length,
}: {
  title: string;
  orders: Order[];
  onSelect: (orderId: string) => void;
  defaultVisible?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  if (orders.length === 0) return null;

  const visibleOrders = showAll ? orders : orders.slice(0, defaultVisible);
  const hiddenCount = orders.length - visibleOrders.length;

  return (
    <View style={styles.orderSection}>
      <View style={styles.orderSectionHeading}>
        <Text style={styles.orderSectionTitle}>{title}</Text>
        <Text style={styles.orderSectionCount}>{orders.length}</Text>
      </View>
      {visibleOrders.map((order) => {
        const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
        return (
        <View key={order.id} style={styles.orderCard}>
          <View style={styles.orderCardHeader}>
            <Text style={styles.orderNumber}>Pedido #{order.id.slice(-8).toUpperCase()}</Text>
            <OrderStateChip order={order} />
          </View>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString('es-CO')} · {totalUnits} {totalUnits === 1 ? 'artículo' : 'artículos'}
          </Text>
          <Text style={styles.orderItemNames} numberOfLines={2}>
            {order.items.map((item) => `${item.productName} ×${item.quantity}`).join(' · ')}
          </Text>
          <View style={styles.orderDetailsRow}>
            <Text style={styles.orderAddress} numberOfLines={1}>
              {order.shippingAddress.line1}, {order.shippingAddress.city}
            </Text>
            <Text style={styles.orderTotal}>{formatOrderTotal(order.items, order.currency)}</Text>
          </View>
          <TouchableOpacity onPress={() => onSelect(order.id)} style={styles.orderDetailButton} accessibilityRole="button">
            <Text style={styles.orderDetailButtonText}>Ver detalle</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        );
      })}
      {hiddenCount > 0 && (
        <TouchableOpacity onPress={() => setShowAll(true)} style={styles.orderExpandButton} accessibilityRole="button">
          <Text style={styles.orderExpandText}>Ver {hiddenCount} más</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
      {showAll && orders.length > defaultVisible && (
        <TouchableOpacity onPress={() => setShowAll(false)} style={styles.orderExpandButton} accessibilityRole="button">
          <Text style={styles.orderExpandText}>Ver menos</Text>
          <MaterialCommunityIcons name="chevron-up" size={16} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <View style={styles.reviewStarsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons key={star} name={star <= rating ? 'star' : 'star-outline'} size={12} color={colors.warning} />
      ))}
    </View>
  );
}

function MyReviewCard({
  review,
  product,
  onOpenProduct,
}: {
  review: UserReviewItem;
  product?: Product;
  onOpenProduct: (product: Product) => void;
}) {
  const syncBadge = review.syncStatus && review.syncStatus !== 'synced' ? (
    <View style={[styles.reviewSyncBadge, review.syncStatus === 'pending' ? styles.reviewSyncPending : styles.reviewSyncError]}>
      <Text style={review.syncStatus === 'pending' ? styles.reviewSyncPendingText : styles.reviewSyncErrorText}>
        {review.syncStatus === 'pending' ? 'Pendiente de publicación' : 'Error al publicar'}
      </Text>
    </View>
  ) : null;

  const body = (
    <>
      <View style={styles.reviewCardTop}>
        <View style={styles.reviewThumb}>
          {review.productImageUrl
            ? <Image source={{ uri: review.productImageUrl }} style={styles.reviewThumbImage} resizeMode="contain" />
            : <MaterialCommunityIcons name="package-variant" size={22} color={colors.primary} />}
        </View>
        <View style={styles.reviewBody}>
          <Text style={styles.reviewProductName} numberOfLines={2}>{review.productName}</Text>
          <View style={styles.reviewMetaRow}>
            <ReviewStars rating={review.rating} />
            <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString('es-CO')}</Text>
            {review.productPrice !== undefined && (
              <Text style={styles.reviewDate}>{formatCurrency(review.productPrice, review.productCurrency ?? 'USD')}</Text>
            )}
            {syncBadge}
          </View>
        </View>
        {product && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />}
      </View>
      {!!review.reviewText && <Text style={styles.reviewText}>{review.reviewText}</Text>}
    </>
  );

  if (!product) return <View style={styles.reviewCard}>{body}</View>;
  return (
    <TouchableOpacity
      style={styles.reviewCard}
      onPress={() => onOpenProduct(product)}
      accessibilityRole="button"
      accessibilityLabel={`Ver producto ${review.productName}`}
    >
      {body}
    </TouchableOpacity>
  );
}
