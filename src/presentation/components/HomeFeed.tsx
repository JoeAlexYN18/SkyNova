import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  TextInput,
  TouchableOpacity,
  type ViewStyle,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Product, ProductBrand, ProductCategory } from '@/domain/entities/Product';
import { colors } from '@/shared/theme';
import { styles } from '@/presentation/screens/HomeScreen.styles';

export type CatalogEntryOptions = {
  search?: string;
  categoryId?: string;
  brand?: string;
  openFilters?: boolean;
};

type CatalogNavigation = (filters?: CatalogEntryOptions) => void;

type HomeFeedProps = {
  firstName: string;
  categories: ProductCategory[];
  brands: ProductBrand[];
  featured: Product[];
  accessories: Product[];
  onNavigateCatalog: CatalogNavigation;
  onAddProduct: (product: Product) => void;
  onOpenProduct: (product: Product) => void;
};

export function HomeFeed({
  firstName,
  categories,
  brands,
  featured,
  accessories,
  onNavigateCatalog,
  onAddProduct,
  onOpenProduct,
}: HomeFeedProps) {
  const [searchDraft, setSearchDraft] = useState('');

  return (
    <>
      <View style={styles.welcome}>
        <Text style={styles.eyebrow}>TU PRÓXIMO VUELO EMPIEZA AQUÍ</Text>
        <Text style={styles.title}>¡Hola, {firstName}! 👋</Text>
        <Text style={styles.subtitle}>Drones, accesorios y repuestos seleccionados para llevar cada vuelo más lejos.</Text>
      </View>

      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={21} color={colors.primary} />
        <TextInput
          value={searchDraft}
          onChangeText={setSearchDraft}
          onSubmitEditing={() => onNavigateCatalog({ search: searchDraft.trim() })}
          placeholder="Drones, marcas, repuestos o accesorios"
          placeholderTextColor={colors.placeholder}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Buscar en el catálogo"
        />
        {!!searchDraft && (
          <TouchableOpacity onPress={() => setSearchDraft('')}>
            <MaterialCommunityIcons name="close-circle" size={19} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => onNavigateCatalog({ search: searchDraft.trim() || undefined, openFilters: true })}
          accessibilityRole="button"
          accessibilityLabel="Abrir filtros del catálogo"
        >
          <MaterialCommunityIcons name="tune-variant" size={19} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.compactHeading}>
        <Text style={styles.compactHeadingTitle}>CATEGORÍAS MÁS BUSCADAS</Text>
        <Text style={styles.compactHeadingAction}>TOP 5</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categories.map((category) => (
          <TouchableOpacity key={category.id} style={styles.chip} onPress={() => onNavigateCatalog({ categoryId: category.id })}>
            <Text style={styles.chipText}>{category.name}</Text>
            <MaterialCommunityIcons name={category.icon as never} size={13} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <HomePromo onNavigateCatalog={onNavigateCatalog} />
      <BrandStrip brands={brands} onNavigateCatalog={onNavigateCatalog} />

      <ProductSection
        title="Drones destacados"
        subtitle="Modelos populares para cada misión"
        products={featured}
        onAdd={onAddProduct}
        onOpen={onOpenProduct}
        onViewAll={onNavigateCatalog}
        emptyText="No encontramos drones con esos filtros."
      />
      <View style={[styles.sectionHeading, styles.accessoryHeading]}>
        <View style={styles.accessoryHeadingCopy}>
          <Text style={styles.sectionTitle}>Accesorios y repuestos</Text>
          <Text style={styles.sectionTitle}>más vendidos</Text>
          <Text style={styles.sectionSubtitle}>Lo esencial para mantener tu flota lista</Text>
        </View>
        <TouchableOpacity onPress={() => onNavigateCatalog()} accessibilityRole="link">
          <Text style={styles.smallLink}>VER TODOS</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.productGrid}>
        {accessories.map((product) => <AccessoryCard key={product.id} product={product} onAdd={onAddProduct} onOpen={onOpenProduct} />)}
      </View>
      <View style={styles.trustCard}>
        <View style={styles.trustIcon}><MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.primary} /></View>
        <View style={styles.trustCopy}>
          <Text style={styles.trustTitle}>Compra con respaldo SkyNova</Text>
          <Text style={styles.trustText}>Equipos verificados · Envíos asegurados · Soporte especializado</Text>
        </View>
        <MaterialCommunityIcons name="check-decagram" size={20} color={colors.primary} />
      </View>
    </>
  );
}

function HomePromo({ onNavigateCatalog }: { onNavigateCatalog: CatalogNavigation }) {
  return (
    <View style={styles.promo}>
      <View style={styles.promoVisual}><SkyBannerIllustration /></View>
      <View style={styles.promoCopy}>
        <Text style={styles.promoTag}>NOVEDADES SKYNOVA  ·  EQUIPO PARA CADA MISIÓN</Text>
        <Text style={styles.promoTitle}>Tu próxima gran aventura empieza desde el cielo.</Text>
        <Text style={styles.promoSubtitle}>Encuentra drones, accesorios y repuestos para llevar cada vuelo más lejos.</Text>
        <TouchableOpacity style={styles.promoButton} onPress={() => onNavigateCatalog()}>
          <Text style={styles.promoButtonText}>Descubrir productos</Text>
          <MaterialCommunityIcons name="arrow-right" size={17} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BrandStrip({ brands, onNavigateCatalog }: { brands: ProductBrand[]; onNavigateCatalog: CatalogNavigation }) {
  return (
    <View style={styles.brandStrip}>
      <View style={styles.compactHeading}>
        <Text style={styles.compactHeadingTitle}>MARCAS OFICIALES HOMOLOGADAS</Text>
        <Text style={styles.compactHeadingAction}>FLOTA GLOBAL</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandChips}>
        {brands.map((brand) => (
          <Pressable
            key={brand.name}
            style={styles.brandChip}
            onPress={() => onNavigateCatalog({ brand: brand.name })}
            accessibilityRole="button"
            accessibilityLabel={`Ver catálogo de ${brand.name}`}
          >
            <View style={[styles.brandDot, { backgroundColor: brand.color }]} />
            <Text style={styles.brandChipText}>{brand.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function ProductSection({ title, subtitle, products, onAdd, onOpen, onViewAll, emptyText }: {
  title: string;
  subtitle: string;
  products: Product[];
  onAdd: (product: Product) => void;
  onOpen: (product: Product) => void;
  onViewAll: CatalogNavigation;
  emptyText: string;
}) {
  return (
    <View>
      <View style={styles.sectionHeading}>
        <View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>
        <TouchableOpacity onPress={() => onViewAll()} accessibilityRole="link"><Text style={styles.smallLink}>VER TODOS</Text></TouchableOpacity>
      </View>
      {products.length
        ? products.map((product) => <ProductListItem key={product.id} product={product} onAdd={onAdd} onOpen={onOpen} />)
        : <Text style={styles.emptyHint}>{emptyText}</Text>}
    </View>
  );
}

export function ProductListItem({ product, onAdd, onOpen }: { product: Product; onAdd: (product: Product) => void; onOpen: (product: Product) => void }) {
  const discountPercent = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : null;

  return (
    <View style={styles.featureCard}>
      <Pressable style={({ pressed }) => [styles.productCardContent, pressed && styles.productPressed]} onPress={() => onOpen(product)} accessibilityRole="button" accessibilityLabel={`Ver detalles de ${product.name}`}>
      <View style={styles.productArtContainer}>
        <ProductImage product={product} style={styles.productArt} iconSize={48} />
        <View style={styles.productBadges}>
          {product.productType === 'drone' && product.isFeatured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>DESTACADO</Text>
            </View>
          )}
          {discountPercent !== null && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{discountPercent}% MENOS</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.featureInfo}>
        <Text style={styles.productBrand}>{product.brand.toUpperCase()}</Text>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.productDescription} numberOfLines={1}>{product.description}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price, product.currency)}</Text>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <Text style={styles.oldPrice}>{formatPrice(product.compareAtPrice, product.currency)}</Text>
          )}
        </View>
        <Text style={styles.stock}>• {product.stockQuantity} disponibles</Text>
      </View>
      </Pressable>
      <TouchableOpacity style={styles.addButton} onPress={() => onAdd(product)} accessibilityLabel={`Agregar ${product.name} al carrito`}>
        <MaterialCommunityIcons name="cart-plus" size={20} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function AccessoryCard({ product, onAdd, onOpen }: { product: Product; onAdd: (product: Product) => void; onOpen: (product: Product) => void }) {
  return (
    <View style={styles.accessoryCard}>
      <Pressable onPress={() => onOpen(product)} accessibilityRole="button" accessibilityLabel={`Ver detalles de ${product.name}`} style={({ pressed }) => pressed && styles.productPressed}>
      <View style={styles.accessoryArt}>
        <ProductImage product={product} style={StyleSheet.absoluteFill} iconSize={35} />
        <Text style={styles.artCaption}>{product.productType === 'spare_part' ? 'REPUESTO' : 'ACCESORIO'}</Text>
      </View>
      <Text style={styles.accessoryName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.productDescription} numberOfLines={1}>{product.brand}</Text>
      </Pressable>
      <View style={styles.accessoryFooter}>
        <Text style={styles.accessoryPrice}>{formatPrice(product.price, product.currency)}</Text>
        <TouchableOpacity style={styles.smallAdd} onPress={() => onAdd(product)} accessibilityLabel={`Agregar ${product.name} al carrito`}>
          <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProductImage({ product, style, iconSize }: { product: Product; style: StyleProp<ViewStyle>; iconSize: number }) {
  const [hasError, setHasError] = useState(false);
  const fallbackIcons: Record<Product['productType'], string> = {
    drone: 'quadcopter', accessory: 'camera-outline', spare_part: 'cog-outline',
  };

  return (
    <View style={[style, styles.imageFrame]}>
      {product.imageUrl && !hasError ? (
        <Image
          source={{ uri: product.imageUrl }}
          style={styles.productImage}
          resizeMode="contain"
          accessibilityLabel={product.imageAlt ?? product.name}
          onError={() => setHasError(true)}
        />
      ) : (
        <MaterialCommunityIcons name={fallbackIcons[product.productType] as never} size={iconSize} color={colors.primary} />
      )}
    </View>
  );
}

function SkyBannerIllustration() {
  return (
    <View style={styles.skyIllustration}>
      <View style={styles.illustrationSun} />
      <View style={styles.illustrationCloud}><MaterialCommunityIcons name="cloud-outline" size={22} color="#D9F6FF" /></View>
      <View style={styles.illustrationFlightPath} />
      <View style={styles.illustrationHillBack} />
      <View style={styles.illustrationHillFront} />
      <View style={styles.illustrationDrone}><MaterialCommunityIcons name="quadcopter" size={40} color="#E9FBFF" /></View>
      <Text style={styles.illustrationCaption}>SKY · 01</Text>
    </View>
  );
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
}
