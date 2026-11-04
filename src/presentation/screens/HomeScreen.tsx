// Improvement 11

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { Animated, BackHandler, Easing, Keyboard, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Product, ProductBrand, ProductCategory } from '@/domain/entities/Product';
import type { CheckoutInput, Order, OrderStatus } from '@/domain/entities/Order';
import type { HomeProductCollections } from '@/domain/repositories/IProductRepository';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useCart } from '@/infrastructure/context/CartContext';
import { useOrders } from '@/infrastructure/context/OrderContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import { productRepository } from '@/infrastructure/container';
import { BrandLogo } from '@/presentation/components/BrandLogo';
import { CatalogFeed, type CatalogInitialFilters } from '@/presentation/components/CatalogFeed';
import { CartFeed } from '@/presentation/components/CartFeed';
import { ProductDetailModal } from '@/presentation/components/ProductDetailModal';
import { OrderDetailsModal } from '@/presentation/components/OrderDetailsModal';
import { HomeFeed, type CatalogEntryOptions } from '@/presentation/components/HomeFeed';
import { ProductSearchBar } from '@/presentation/components/ProductSearchBar';
import { styles } from '@/presentation/screens/HomeScreen.styles';
import { colors } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/formatCurrency';

type Section = 'Inicio' | 'Catálogo' | 'Carrito' | 'Perfil';
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, logout } = useAuth();
  const { itemCount, lines: cartLines, addProduct } = useCart();
  const { orders, cancelOrder, updateOrder, unreadOrderCount, markOrdersRead } = useOrders();
  const { show } = useToast();
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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
      if (isSearchMode) {
        setIsSearchMode(false);
        setIsSearchSuggestionsVisible(false);
        setSearchDraft(searchDraftBeforeSearchMode.current);
        Keyboard.dismiss();
        return true;
      }
      BackHandler.exitApp();
      return true;
    });
    return () => subscription.remove();
  }, [isSearchMode]);

  const handleLogout = useCallback(() => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    Animated.timing(logoutFlight, {
      toValue: 1,
      duration: 1100,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) logout();
    });
  }, [isLoggingOut, logout, logoutFlight]);

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
    if (nextSection === 'Perfil') setShowOrderHistory(false);
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
    Promise.all([productRepository.listCategories(), productRepository.listHomeCollections(), productRepository.listBrands()]).then(([nextCategories, collections, nextBrands]) => {
      if (active) {
        setCategories(nextCategories);
        setHomeCollections(collections);
        setBrands(nextBrands);
      }
    });
    return () => { active = false; };
  }, []);

  const { userOrders, activeOrders, deliveredOrders, cancelledOrders } = useMemo(() => {
    const userOrders = currentUser
      ? orders
        .filter((order) => order.userId === currentUser.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];
    const grouped = {
      userOrders,
      activeOrders: [] as Order[],
      deliveredOrders: [] as Order[],
      cancelledOrders: [] as Order[],
    };

    for (const order of userOrders) {
      if (order.status === 'pending' || order.status === 'paid' || order.status === 'shipped') {
        grouped.activeOrders.push(order);
      } else if (order.status === 'delivered') {
        grouped.deliveredOrders.push(order);
      } else {
        grouped.cancelledOrders.push(order);
      }
    }

    return grouped;
  }, [orders, currentUser]);
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  if (!currentUser) return <Redirect href={'/login' as never} />;

  const firstName = currentUser.fullName.trim().split(/\s+/)[0];
  const unreadOrders = unreadOrderCount(currentUser.id);
  const cancelledOrderCount = cancelledOrders.length;
  const orderSummary = [
    activeOrders.length > 0 && `${activeOrders.length} en curso`,
    deliveredOrders.length > 0 && `${deliveredOrders.length} entregado${deliveredOrders.length === 1 ? '' : 's'}`,
    cancelledOrderCount > 0 && `${cancelledOrderCount} cancelado${cancelledOrderCount === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ') || 'Sin pedidos';

  const openOrderHistory = () => {
    markOrdersRead(currentUser.id);
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
          <View style={styles.brand}>
            <BrandLogo size={42} iconSize={27} />
            <View>
              <Text style={styles.brandText}>SkyNova</Text>
              <Text style={styles.brandCaption}>DRONES, ACCESORIOS Y REPUESTOS</Text>
            </View>
          </View>
        </View>

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
        ) : (
          showOrderHistory ? (
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
                  <OrderSection title="En curso" orders={activeOrders} onSelect={setSelectedOrderId} />
                  <OrderSection title="Entregados" orders={deliveredOrders} onSelect={setSelectedOrderId} />
                  <OrderSection
                    title="Cancelados"
                    orders={cancelledOrders}
                    onSelect={setSelectedOrderId}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{firstName.slice(0, 1).toUpperCase()}</Text></View>
              <Text style={styles.profileName}>{currentUser.fullName}</Text>
              <Text style={styles.profileEmail}>{currentUser.email}</Text>
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
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isLoggingOut}>
                <MaterialCommunityIcons name="logout" size={19} color={colors.danger} /><Text style={styles.logoutText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          )
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
        onClose={() => setSelectedProduct(null)}
        onAdd={handleAddProduct}
        onBuyNow={(product) => {
          if (cartLines.some((line) => line.product.id === product.id)) show('Este producto ya está en tu carrito; puedes revisar la cantidad allí.', 'info');
          else handleAddProduct(product);
          setSelectedProduct(null);
          navigateToSection('Carrito');
        }}
      />
      <OrderDetailsModal
        key={selectedOrder?.id ?? 'no-order'}
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onSaveAddress={async (address: CheckoutInput) => {
          if (!selectedOrder) return;
          await updateOrder(selectedOrder.id, currentUser.id, {
            shippingAddress: {
              ...selectedOrder.shippingAddress,
              recipient: address.recipient.trim(),
              phone: address.phone.trim(),
              line1: address.line1.trim(),
              city: address.city.trim(),
              region: address.region.trim() || undefined,
              postalCode: address.postalCode.trim() || undefined,
              countryCode: address.countryCode.trim().toUpperCase(),
            },
          });
        }}
        onCancel={async () => {
          if (!selectedOrder) return;
          await cancelOrder(selectedOrder.id, currentUser.id);
        }}
      />
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

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pendiente', paid: 'Pagado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
  };
  const statusStyle = {
    pending: styles.orderStatusPending,
    paid: styles.orderStatusPaid,
    shipped: styles.orderStatusShipped,
    delivered: styles.orderStatusDelivered,
    cancelled: styles.orderStatusCancelled,
  }[status];
  const textStyle = {
    pending: styles.orderStatusTextPending,
    paid: styles.orderStatusTextPaid,
    shipped: styles.orderStatusTextShipped,
    delivered: styles.orderStatusTextDelivered,
    cancelled: styles.orderStatusTextCancelled,
  }[status];
  return <View style={[styles.orderStatusBadge, statusStyle]}><Text style={[styles.orderStatusText, textStyle]}>{labels[status]}</Text></View>;
}

function formatOrderTotal(items: { quantity: number; unitPrice: number }[], currency: string) {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return formatCurrency(total, currency);
}

function OrderSection({
  title,
  orders,
  onSelect,
}: {
  title: string;
  orders: Order[];
  onSelect: (orderId: string) => void;
}) {
  if (orders.length === 0) return null;

  return (
    <View style={styles.orderSection}>
      <View style={styles.orderSectionHeading}>
        <Text style={styles.orderSectionTitle}>{title}</Text>
        <Text style={styles.orderSectionCount}>{orders.length}</Text>
      </View>
      {orders.map((order) => (
        <View key={order.id} style={styles.orderCard}>
          <View style={styles.orderCardHeader}>
            <Text style={styles.orderNumber}>Pedido #{order.id.slice(-8).toUpperCase()}</Text>
            <OrderStatusBadge status={order.status} />
          </View>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString('es-CO')} · {order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'}
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
            <Text style={styles.orderDetailButtonText}>Ver detalle y gestionar</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
