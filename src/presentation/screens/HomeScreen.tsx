import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Product, ProductBrand, ProductCategory } from '@/domain/entities/Product';
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
import { HomeFeed, type CatalogEntryOptions } from '@/presentation/components/HomeFeed';
import { styles } from '@/presentation/screens/HomeScreen.styles';
import { colors } from '@/shared/theme';

type Section = 'Inicio' | 'Catálogo' | 'Carrito' | 'Perfil';
export function HomeScreen() {
  const { currentUser, logout } = useAuth();
  const { itemCount, lines: cartLines, addProduct } = useCart();
  const { orders, cancelOrder } = useOrders();
  const { show } = useToast();
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [homeCollections, setHomeCollections] = useState<HomeProductCollections>({ featuredDrones: [], bestSellingAccessories: [] });
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [section, setSection] = useState<Section>('Inicio');
  const [catalogInitialFilters, setCatalogInitialFilters] = useState<CatalogInitialFilters>({});
  const [openCatalogFilters, setOpenCatalogFilters] = useState(false);

  const navigateToCatalog = useCallback((options: CatalogEntryOptions = {}) => {
    const { openFilters = false, ...filters } = options;
    setCatalogInitialFilters(filters);
    setOpenCatalogFilters(openFilters);
    setSection('Cat\u00e1logo');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const navigateToSection = useCallback((nextSection: Section) => {
    setSection(nextSection);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleAddProduct = useCallback((product: Parameters<typeof addProduct>[0]) => {
    const added = addProduct(product);
    show(added ? 'Agregado al carrito' : product.stockQuantity > 0 ? 'Ya alcanzaste el máximo disponible' : 'Producto sin stock', added ? 'success' : 'info');
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

  if (!currentUser) return <Redirect href={'/login' as never} />;

  const firstName = currentUser.fullName.trim().split(/\s+/)[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <BrandLogo size={42} iconSize={27} />
            <View>
              <Text style={styles.brandText}>SkyNova</Text>
              <Text style={styles.brandCaption}>DRONES & AEROSPACE</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} accessibilityLabel="Notificaciones">
              <MaterialCommunityIcons name="bell-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => navigateToSection('Perfil')} accessibilityLabel="Abrir perfil">
              <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {section === 'Inicio' ? (
          <HomeFeed
            firstName={firstName}
            categories={categories.slice(0, 5)}
            brands={brands}
            featured={homeCollections.featuredDrones}
            accessories={homeCollections.bestSellingAccessories}
            onNavigateCatalog={navigateToCatalog}
            onAddProduct={handleAddProduct}
            onOpenProduct={setSelectedProduct}
          />
        ) : section === 'Catálogo' ? (
          <CatalogFeed
            initialFilters={catalogInitialFilters}
            openFiltersOnStart={openCatalogFilters}
            onAddProduct={handleAddProduct}
            onOpenProduct={setSelectedProduct}
          />
        ) : section === 'Carrito' ? (
          <CartFeed onBrowseCatalog={navigateToCatalog} onOpenProduct={setSelectedProduct} />
        ) : (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{firstName.slice(0, 1).toUpperCase()}</Text></View>
            <Text style={styles.profileName}>{currentUser.fullName}</Text>
            <Text style={styles.profileEmail}>{currentUser.email}</Text>
            <View style={styles.profileDivider} />
            <TouchableOpacity style={styles.profileOrdersButton} onPress={() => setShowOrderHistory((value) => !value)}>
              <View style={styles.profileOrdersIcon}><MaterialCommunityIcons name="clipboard-list-outline" size={20} color={colors.primary} /></View>
              <View style={styles.profileOrdersCopy}><Text style={styles.profileOrdersTitle}>Mis pedidos</Text><Text style={styles.profileOrdersSubtitle}>{orders.filter((order) => order.userId === currentUser.id).length} pedidos</Text></View>
              <MaterialCommunityIcons name={showOrderHistory ? 'chevron-up' : 'chevron-right'} size={22} color={colors.textMuted} />
            </TouchableOpacity>
            {showOrderHistory && <View style={styles.orderHistory}>
              {orders.filter((order) => order.userId === currentUser.id).length === 0 ? <Text style={styles.orderEmpty}>Aún no tienes pedidos. Tus compras aparecerán aquí.</Text> : orders.filter((order) => order.userId === currentUser.id).map((order) => <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardHeader}><Text style={styles.orderNumber}>Pedido reciente</Text><Text style={[styles.orderStatus, order.status === 'cancelled' && styles.orderStatusCancelled]}>{order.status === 'paid' ? 'Confirmado · demo' : 'Cancelado'}</Text></View>
                <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('es-CO')} · {order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'}</Text>
                <Text style={styles.orderItemNames} numberOfLines={2}>{order.items.map((item) => `${item.productName} ×${item.quantity}`).join(' · ')}</Text>
                <Text style={styles.orderAddress}>{order.shippingAddress.line1}, {order.shippingAddress.city}</Text>
                {order.status === 'paid' && <TouchableOpacity onPress={() => cancelOrder(order.id, currentUser.id)} style={styles.cancelOrderButton}><Text style={styles.cancelOrderText}>Cancelar pedido de prueba</Text></TouchableOpacity>}
              </View>)}
            </View>}
            <View style={styles.profileDivider} />
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
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
            </View>
            <Text style={[styles.tabText, section === label && styles.tabTextActive]}>{label}</Text>
            {section === label && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

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

    </SafeAreaView>
  );
}
