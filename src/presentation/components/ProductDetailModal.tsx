import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Product, ProductCategory, ProductReview } from '@/domain/entities/Product';
import { colors, radius, spacing } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { productRepository } from '@/infrastructure/container';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import { useNetworkStatus } from '@/presentation/hooks/useNetworkStatus';
import { isExpectedSyncError } from '@/infrastructure/data/firebaseDataSync';
import { ToastHost } from '@/presentation/components/ToastHost';
import { useModalLayer } from '@/presentation/components/toastLayer';

interface Props {
  product: Product | null;
  categories: ProductCategory[];
  onClose: () => void;
  onAdd: (product: Product) => void;
  onBuyNow: (product: Product) => void;
}

export function ProductDetailModal({ product, categories, onClose, onAdd, onBuyNow }: Props) {
  const [imageError, setImageError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const reviewSubmitLock = useRef(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const modalLayerId = useModalLayer(product !== null);
  const insets = useSafeAreaInsets();
  const previousOwnSync = useRef<{ productId?: string; sync?: string }>({});
  const isOnline = useNetworkStatus();
  const { currentUser } = useAuth();
  const { show } = useToast();
  const productId = product?.id;

  useEffect(() => {
    if (!productId) return;
    let active = true;
    let reviewsSyncFailed = false;
    productRepository.listReviews(productId, (error) => {
      console.warn('Sync de reseñas falló:', error);
      reviewsSyncFailed = true;
      if (isExpectedSyncError(error, currentUser?.id)) return;
      show('No se pudieron actualizar las reseñas; se muestran las guardadas en este dispositivo.', 'info');
    }).then((result) => {
      if (!active) return;
      setReviews(result);
      setReviewsLoaded(true);
      const ownReview = result.find((review) => review.userId === currentUser?.id);
      const previous = previousOwnSync.current;
      if (!reviewsSyncFailed && previous.productId === productId && previous.sync && previous.sync !== 'synced' && ownReview?.syncStatus === 'synced') {
        show('Tu reseña ya está publicada.', 'success');
      }
      previousOwnSync.current = { productId, sync: ownReview?.syncStatus };
      setRating(ownReview?.rating ?? 0);
      setReviewText(ownReview?.reviewText ?? '');
    }).catch(() => {
      if (active) {
        setReviews([]);
        setReviewsLoaded(true);
        show('No se pudieron cargar las reseñas.', 'error');
      }
    });
    return () => { active = false; };
  }, [productId, currentUser?.id, isOnline, show]);

  const ownReview = reviews.find((review) => review.userId === currentUser?.id);
  const sortedReviews = useMemo(() => {
    if (!currentUser) return reviews;
    return [...reviews].sort((left, right) =>
      Number(right.userId === currentUser.id) - Number(left.userId === currentUser.id),
    );
  }, [reviews, currentUser]);
  const ratingHistogram = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) counts[review.rating] += 1;
    });
    const max = Math.max(...counts.slice(1), 1);
    return ([5, 4, 3, 2, 1] as const).map((star) => ({
      star,
      count: counts[star],
      ratio: counts[star] / max,
    }));
  }, [reviews]);

  if (!product) return null;

  const category = categories.find((item) => item.id === product.categoryId);
  const images = product.images?.length
    ? [...product.images].sort((left, right) => left.displayOrder - right.displayOrder)
    : product.imageUrl
      ? [{ id: `${product.id}-primary`, url: product.imageUrl, altText: product.imageAlt ?? product.name, displayOrder: 0, isPrimary: true }]
      : [];
  const selectedImage = images[activeImage] ?? images[0];
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : undefined;
  const typeLabel = product.productType === 'drone' ? 'Dron' : product.productType === 'spare_part' ? 'Repuesto' : 'Accesorio';
  const available = product.isActive && product.stockQuantity > 0;
  const averageRating = reviewsLoaded
    ? reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : undefined
    : product.ratingAverage;
  const reviewCount = reviewsLoaded ? reviews.length : product.ratingCount ?? 0;

  const submitReview = async () => {
    if (reviewSubmitLock.current) return;
    if (!currentUser) {
      show('Inicia sesión para dejar una reseña.', 'info');
      return;
    }
    if (!rating) {
      show('Selecciona una calificación de 1 a 5 estrellas.', 'error');
      return;
    }
    reviewSubmitLock.current = true;
    setIsSubmittingReview(true);
    try {
      const saved = await productRepository.saveReview({
        productId: product.id,
        userId: currentUser.id,
        reviewerName: currentUser.fullName,
        rating,
        reviewText: reviewText.trim() || undefined,
      });
      setReviews((previous) => [saved, ...previous.filter((review) => review.userId !== saved.userId)]);
      show(
        saved.syncStatus === 'synced'
          ? 'Tu reseña se publicó correctamente.'
          : saved.syncStatus === 'error'
            ? 'Tu reseña se guardó en este dispositivo; reintentaremos publicarla automáticamente.'
            : 'Tu reseña se guardó en este dispositivo; se publicará cuando recuperes la conexión.',
        'success',
      );
    } catch (error) {
      show(error instanceof Error ? error.message : 'No se pudo guardar la reseña.', 'error');
    } finally {
      reviewSubmitLock.current = false;
      setIsSubmittingReview(false);
    }
  };

  const confirmDeleteReview = () => {
    if (!product || !currentUser || !ownReview || isDeletingReview) return;
    Alert.alert('¿Eliminar tu reseña?', 'Tu calificación dejará de ser visible para otros usuarios.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setIsDeletingReview(true);
          void productRepository.deleteReview(product.id, currentUser.id)
            .then((outcome) => {
              setReviews((previous) => previous.filter((review) => review.userId !== currentUser.id));
              setRating(0);
              setReviewText('');
              show(
                outcome === 'synced'
                  ? 'Tu reseña se eliminó.'
                  : outcome === 'error'
                    ? 'Tu reseña se eliminará; reintentaremos confirmar el cambio automáticamente.'
                    : 'Tu reseña se eliminará de este dispositivo; se confirmará al recuperar la conexión.',
                'success',
              );
            })
            .catch((error: unknown) => show(error instanceof Error ? error.message : 'No se pudo eliminar la reseña.', 'error'))
            .finally(() => setIsDeletingReview(false));
        },
      },
    ]);
  };

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
              {selectedImage && !imageError
                ? <Image source={{ uri: selectedImage.url }} style={styles.heroImage} resizeMode="contain" accessibilityLabel={selectedImage.altText} onError={() => setImageError(true)} />
                : <MaterialCommunityIcons name={product.productType === 'drone' ? 'quadcopter' : product.productType === 'spare_part' ? 'cog-outline' : 'camera-outline'} size={94} color={colors.primary} />}
              <View style={styles.heroBadges}>
                <Text style={styles.typeBadge}>{typeLabel.toUpperCase()}</Text>
                {product.isFeatured && <Text style={styles.featureBadge}>DESTACADO</Text>}
                {discount !== undefined && <Text style={styles.discountBadge}>{discount}% MENOS</Text>}
              </View>
            </View>
            {images.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
                {images.map((image, index) => (
                  <TouchableOpacity
                    key={image.id}
                    onPress={() => { setActiveImage(index); setImageError(false); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver imagen ${index + 1} de ${images.length}`}
                    accessibilityState={{ selected: activeImage === index }}
                    style={[styles.thumbnail, activeImage === index && styles.thumbnailSelected]}
                  >
                    <Image source={{ uri: image.url }} style={styles.thumbnailImage} resizeMode="contain" accessibilityLabel={image.altText} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>
            <Text style={styles.name}>{product.name}</Text>
            <View style={styles.ratingRow}>
              {averageRating !== undefined && reviewCount > 0 ? <>
                <MaterialCommunityIcons name="star" size={17} color="#FBBF24" />
                <Text style={styles.rating}>{averageRating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({reviewCount} valoraciones)</Text>
              </> : <Text style={styles.ratingCount}>Aún sin valoraciones</Text>}
              {!!product.salesCount && <Text style={styles.salesCount}>· {product.salesCount} vendidos</Text>}
            </View>

            <View style={styles.priceLine}>
              <Text style={styles.price}>{formatCurrency(product.price, product.currency)}</Text>
              {discount !== undefined && <Text style={styles.comparePrice}>{formatCurrency(product.compareAtPrice!, product.currency)}</Text>}
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
            <View style={styles.reviewsSection}>
              <Text style={styles.sectionTitle}>Calificaciones y reseñas</Text>
              {reviewsLoaded && reviews.length > 0 && averageRating !== undefined && (
                <View style={styles.ratingSummary}>
                  <View style={styles.ratingSummaryLeft}>
                    <Text style={styles.ratingSummaryAverage}>{averageRating.toFixed(1)}</Text>
                    <View>
                      <View style={styles.reviewStarsDisplay}>
                        {Array.from({ length: 5 }, (_, index) => (
                          <MaterialCommunityIcons key={index} name={index < Math.round(averageRating) ? 'star' : 'star-outline'} size={15} color="#FBBF24" />
                        ))}
                      </View>
                      <Text style={styles.ratingCount}>({reviewCount} valoraciones)</Text>
                    </View>
                  </View>
                  <View style={styles.histogram}>
                    {ratingHistogram.map(({ star, count, ratio }) => (
                      <View key={star} style={styles.histogramRow}>
                        <Text style={styles.histogramStar}>{star} ★</Text>
                        <View style={styles.histogramTrack}>
                          <View style={[styles.histogramFill, { width: `${Math.round(ratio * 100)}%` }]} />
                        </View>
                        <Text style={styles.histogramCount}>{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              <Text style={styles.reviewPrompt}>
                {currentUser ? 'Comparte tu experiencia con este producto.' : 'Inicia sesión para compartir tu experiencia.'}
              </Text>
              <View style={styles.reviewStars} accessibilityRole="radiogroup" accessibilityLabel="Tu calificación">
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setRating(value)}
                    disabled={!currentUser || isSubmittingReview}
                    accessibilityRole="radio"
                    accessibilityLabel={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
                    accessibilityState={{ selected: rating === value }}
                    style={styles.reviewStarButton}
                  >
                    <MaterialCommunityIcons name={value <= rating ? 'star' : 'star-outline'} size={28} color="#FBBF24" />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                editable={!!currentUser && !isSubmittingReview}
                placeholder="Escribe una reseña (opcional)"
                placeholderTextColor={colors.placeholder}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                style={styles.reviewInput}
                accessibilityLabel="Texto de la reseña"
              />
              <TouchableOpacity
                onPress={() => { void submitReview(); }}
                disabled={!currentUser || isSubmittingReview}
                style={[styles.reviewSubmit, (!currentUser || isSubmittingReview) && styles.reviewSubmitDisabled]}
                accessibilityRole="button"
              >
                {isSubmittingReview
                  ? <ActivityIndicator size="small" color={colors.onPrimary} />
                  : <Text style={styles.reviewSubmitText}>
                    {reviews.some((review) => review.userId === currentUser?.id) ? 'Actualizar mi reseña' : 'Publicar reseña'}
                  </Text>}
              </TouchableOpacity>
              {currentUser && ownReview && ownReview.syncStatus !== 'synced' && (
                <Text style={styles.reviewPendingNote}>
                  {ownReview.syncStatus === 'error'
                    ? 'Tu reseña está guardada en este dispositivo; reintentaremos publicarla automáticamente.'
                    : 'Tu reseña está pendiente de publicación y se sincronizará automáticamente.'}
                </Text>
              )}
              {!reviewsLoaded
                ? <ActivityIndicator style={styles.reviewsLoading} color={colors.primary} />
                : sortedReviews.length
                  ? sortedReviews.map((review) => (
                    <View key={review.id}>
                      {review.userId === currentUser?.id && <Text style={styles.ownReviewTag}>Tu reseña</Text>}
                      <ReviewRow review={review} />
                      {review.userId === currentUser?.id && (
                        <TouchableOpacity
                          onPress={confirmDeleteReview}
                          disabled={isDeletingReview || isSubmittingReview}
                          style={styles.deleteReviewButton}
                          accessibilityRole="button"
                        >
                          {isDeletingReview
                            ? <ActivityIndicator size="small" color={colors.danger} />
                            : <Text style={styles.deleteReviewText}>Eliminar mi reseña</Text>}
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                  : <Text style={styles.noReviews}>Sé la primera persona en calificar este producto.</Text>}
            </View>
            <Text style={styles.taxonomyNote}>Precio en {product.currency}. Disponibilidad sujeta a cambios.</Text>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
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
        <ToastHost layerId={modalLayerId} />
      </View>
    </Modal>
  );
}

function ReviewRow({ review }: { review: ProductReview }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{review.reviewerName}</Text>
        <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString('es-PE')}</Text>
      </View>
      <View style={styles.reviewStarsDisplay}>
        {Array.from({ length: 5 }, (_, index) => (
          <MaterialCommunityIcons key={index} name={index < review.rating ? 'star' : 'star-outline'} size={14} color="#FBBF24" />
        ))}
      </View>
      {!!review.reviewText && <Text style={styles.reviewBody}>{review.reviewText}</Text>}
    </View>
  );
}

function SpecRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <View style={styles.specRow}>
    <MaterialCommunityIcons name={icon as never} size={18} color={colors.primary} />
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={styles.specValue} numberOfLines={1}>{value}</Text>
  </View>;
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
  gallery: { gap: spacing.sm, paddingBottom: spacing.md },
  thumbnail: { width: 62, height: 62, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 4 },
  thumbnailSelected: { borderWidth: 2, borderColor: colors.primary },
  thumbnailImage: { width: '100%', height: '100%' },
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
  reviewsSection: { marginTop: spacing.sm },
  reviewPrompt: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
  reviewStars: { flexDirection: 'row', marginTop: spacing.xs },
  reviewStarButton: { padding: 4 },
  reviewInput: { minHeight: 82, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, fontSize: 13, marginTop: spacing.xs },
  reviewSubmit: { minHeight: 42, borderRadius: radius.round, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, marginTop: spacing.sm },
  reviewSubmitDisabled: { opacity: 0.55 },
  reviewSubmitText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
  reviewPendingNote: { color: colors.warning, fontSize: 11, lineHeight: 16, marginTop: spacing.sm, fontWeight: '600' },
  ratingSummary: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ratingSummaryLeft: { alignItems: 'center', justifyContent: 'center', minWidth: 72 },
  ratingSummaryAverage: { color: colors.textPrimary, fontSize: 30, fontWeight: '900' },
  histogram: { flex: 1, justifyContent: 'center', gap: 4 },
  histogramRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  histogramStar: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', width: 22 },
  histogramTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  histogramFill: { height: '100%', borderRadius: 3, backgroundColor: '#FBBF24' },
  histogramCount: { color: colors.textMuted, fontSize: 10, fontWeight: '700', width: 18, textAlign: 'right' },
  ownReviewTag: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: spacing.sm, marginBottom: 2 },
  deleteReviewButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginTop: spacing.xs },
  deleteReviewText: { color: colors.danger, fontSize: 11, fontWeight: '800' },
  reviewsLoading: { marginTop: spacing.lg },
  noReviews: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: spacing.md },
  reviewCard: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.md },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  reviewerName: { flex: 1, color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  reviewDate: { color: colors.textMuted, fontSize: 10 },
  reviewStarsDisplay: { flexDirection: 'row', marginTop: 3 },
  reviewBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  taxonomyNote: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md },
  footer: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  secondaryButton: { minHeight: 48, flex: 1, paddingHorizontal: spacing.sm, borderRadius: radius.round, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  primaryButton: { minHeight: 48, flex: 1, paddingHorizontal: spacing.sm, borderRadius: radius.round, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: colors.onPrimary, fontSize: 12, fontWeight: '900' },
  disabledButton: { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  disabledText: { color: colors.textMuted },
});
