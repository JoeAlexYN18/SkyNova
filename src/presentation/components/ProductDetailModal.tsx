import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Product, ProductCategory } from '@/domain/entities/Product';
import { colors, radius, spacing } from '@/shared/theme';

interface Props {
  product: Product | null;
  categories: ProductCategory[];
  onClose: () => void;
  onAdd: (product: Product) => void;
  onBuyNow: (product: Product) => void;
}

export function ProductDetailModal({ product, categories, onClose, onAdd, onBuyNow }: Props) {
  const [imageError, setImageError] = useState(false);
  if (!product) return null;

  const category = categories.find((item) => item.id === product.categoryId);
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : undefined;
  const typeLabel = product.productType === 'drone' ? 'Dron' : product.productType === 'spare_part' ? 'Repuesto' : 'Accesorio';
  const available = product.isActive && product.stockQuantity > 0;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.topBar}>
            <View style={styles.dragHandle} />
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Cerrar detalles del producto">
              <MaterialCommunityIcons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.hero}>
              {product.imageUrl && !imageError
                ? <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="contain" accessibilityLabel={product.imageAlt ?? product.name} onError={() => setImageError(true)} />
                : <MaterialCommunityIcons name={product.productType === 'drone' ? 'quadcopter' : product.productType === 'spare_part' ? 'cog-outline' : 'camera-outline'} size={94} color={colors.primary} />}
              <View style={styles.heroBadges}>
                <Text style={styles.typeBadge}>{typeLabel.toUpperCase()}</Text>
                {product.isFeatured && <Text style={styles.featureBadge}>DESTACADO</Text>}
                {discount !== undefined && <Text style={styles.discountBadge}>{discount}% MENOS</Text>}
              </View>
            </View>

            <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>
            <Text style={styles.name}>{product.name}</Text>
            <View style={styles.ratingRow}>
              {product.ratingAverage !== undefined && product.ratingCount ? <>
                <MaterialCommunityIcons name="star" size={17} color="#FBBF24" />
                <Text style={styles.rating}>{product.ratingAverage.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({product.ratingCount} valoraciones)</Text>
              </> : <Text style={styles.ratingCount}>Aún sin valoraciones</Text>}
              {!!product.salesCount && <Text style={styles.salesCount}>· {product.salesCount} vendidos</Text>}
            </View>

            <View style={styles.priceLine}>
              <Text style={styles.price}>{formatPrice(product.price, product.currency)}</Text>
              {discount !== undefined && <Text style={styles.comparePrice}>{formatPrice(product.compareAtPrice!, product.currency)}</Text>}
            </View>
            <View style={styles.stockRow}>
              <View style={[styles.stockDot, !available && styles.stockDotEmpty]} />
              <Text style={[styles.stockLabel, !available && styles.stockLabelEmpty]}>{available ? `${product.stockQuantity} disponibles` : 'Agotado'}</Text>
            </View>

            <Text style={styles.sectionTitle}>Detalles</Text>
            <Text style={styles.description}>{product.description?.trim() || 'Consulta con nuestro equipo para conocer más detalles de este producto.'}</Text>

            <View style={styles.specList}>
              <SpecRow icon="barcode" label="SKU" value={product.sku} />
              <SpecRow icon="shape-outline" label="Categoría" value={category?.name ?? typeLabel} />
              {product.productType === 'drone' && product.maxFlightMinutes !== undefined && <SpecRow icon="timer-outline" label="Autonomía máxima" value={`${product.maxFlightMinutes} min`} />}
              <SpecRow icon="tag-outline" label="Marca" value={product.brand} />
            </View>
            <Text style={styles.taxonomyNote}>Precio en {product.currency}. Disponibilidad sujeta a cambios.</Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity disabled={!available} onPress={() => { onAdd(product); onClose(); }} style={[styles.secondaryButton, !available && styles.disabledButton]} accessibilityRole="button">
              <MaterialCommunityIcons name="cart-plus" size={19} color={available ? colors.primary : colors.textMuted} />
              <Text style={[styles.secondaryButtonText, !available && styles.disabledText]}>Agregar al carrito</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={!available} onPress={() => onBuyNow(product)} style={[styles.primaryButton, !available && styles.disabledButton]} accessibilityRole="button">
              <Text style={[styles.primaryButtonText, !available && styles.disabledText]}>Comprar ahora</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={available ? colors.onPrimary : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SpecRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <View style={styles.specRow}>
    <MaterialCommunityIcons name={icon as never} size={18} color={colors.primary} />
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={styles.specValue} numberOfLines={1}>{value}</Text>
  </View>;
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { height: '94%', backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' },
  topBar: { height: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  dragHandle: { width: 38, height: 4, borderRadius: 3, backgroundColor: colors.textMuted },
  closeButton: { position: 'absolute', right: spacing.md, top: 7, width: 34, height: 34, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  hero: { height: 260, marginTop: spacing.md, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: '#F1F3F5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroBadges: { position: 'absolute', left: spacing.md, top: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeBadge: { color: colors.textPrimary, backgroundColor: '#172033', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.round, fontSize: 9, fontWeight: '900', overflow: 'hidden' },
  featureBadge: { color: '#17120A', backgroundColor: '#DDAA34', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.round, fontSize: 9, fontWeight: '900', overflow: 'hidden' },
  discountBadge: { color: colors.white, backgroundColor: '#E5484D', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.round, fontSize: 9, fontWeight: '900', overflow: 'hidden' },
  brand: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  name: { color: colors.textPrimary, fontSize: 24, lineHeight: 31, fontWeight: '800', marginTop: 4 },
  ratingRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs },
  rating: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  ratingCount: { color: colors.textSecondary, fontSize: 12 },
  salesCount: { color: colors.textMuted, fontSize: 11 },
  priceLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  price: { color: colors.textPrimary, fontSize: 25, fontWeight: '900' },
  comparePrice: { color: colors.textMuted, fontSize: 15, textDecorationLine: 'line-through' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.xs },
  stockDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  stockDotEmpty: { backgroundColor: colors.danger },
  stockLabel: { color: colors.success, fontSize: 12, fontWeight: '700' },
  stockLabelEmpty: { color: colors.danger },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginTop: spacing.xl },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: spacing.xs },
  specList: { marginTop: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  specRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  specLabel: { flex: 1, color: colors.textSecondary, fontSize: 12 },
  specValue: { maxWidth: '52%', color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
  taxonomyNote: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md },
  footer: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  secondaryButton: { minHeight: 48, flex: 1, paddingHorizontal: spacing.sm, borderRadius: radius.round, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  primaryButton: { minHeight: 48, flex: 1, paddingHorizontal: spacing.sm, borderRadius: radius.round, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: colors.onPrimary, fontSize: 12, fontWeight: '900' },
  disabledButton: { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  disabledText: { color: colors.textMuted },
});
