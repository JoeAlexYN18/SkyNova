// Refacto 1

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CardBrand, CheckoutInput, Order } from '@/domain/entities/Order';
import { COUNTRIES } from '@/infrastructure/data/countries';
import { hasNetworkConnection } from '@/infrastructure/data/firebaseDataSync';
import { productRepository } from '@/infrastructure/container';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useOrders } from '@/infrastructure/context/OrderContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import { CountryPickerModal } from '@/presentation/components/CountryPickerModal';
import { colors, radius, spacing } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { getOrderDisplayState, getOrderSyncState, type OrderDisplayTone } from '@/shared/utils/orderDisplay';
import { validatePhoneNumber } from '@/shared/validators/formValidators';

const TIMELINE_STEPS = ['Confirmación', 'Preparación', 'Envío', 'Entrega'] as const;
const STATUS_STEP_INDEX: Record<Order['status'], number> = {
  pending: 0,
  paid: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
};

const TONE_STYLES: Record<OrderDisplayTone, { backgroundColor: string; color: string }> = {
  warning: { backgroundColor: 'rgba(251,191,36,0.12)', color: colors.warning },
  danger: { backgroundColor: 'rgba(248,113,113,0.12)', color: colors.danger },
  success: { backgroundColor: 'rgba(52,211,153,0.12)', color: colors.success },
  info: { backgroundColor: 'rgba(56,189,248,0.12)', color: colors.info },
  primary: { backgroundColor: 'rgba(34,211,238,0.12)', color: colors.primary },
  muted: { backgroundColor: 'rgba(148,163,184,0.12)', color: colors.textMuted },
};

const cardBrandIcons: Record<CardBrand, 'cc-visa' | 'cc-mastercard' | 'cc-amex' | 'cc-discover' | 'credit-card'> = {
  visa: 'cc-visa',
  mastercard: 'cc-mastercard',
  amex: 'cc-amex',
  discover: 'cc-discover',
  other: 'credit-card',
};

const cardBrandLabels: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  other: 'Tarjeta',
};

function addressToForm(order: Order): CheckoutInput {
  return {
    recipient: order.shippingAddress.recipient,
    phone: order.shippingAddress.phone.replace(/^\+\d{1,4}\s*/, ''),
    line1: order.shippingAddress.line1,
    city: order.shippingAddress.city,
    region: order.shippingAddress.region ?? '',
    postalCode: order.shippingAddress.postalCode ?? '',
    countryCode: order.shippingAddress.countryCode,
  };
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { orders, ordersLoaded, updateOrder, cancelOrder, retryOrderSync, orderSyncEnabled } = useOrders();
  const { show } = useToast();
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [editingAddress, setEditingAddress] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [address, setAddress] = useState<CheckoutInput | null>(null);
  const [busy, setBusy] = useState<'save' | 'cancel' | 'retry' | null>(null);
  const busyRef = useRef(false);

  const order = useMemo(() => orders.find((candidate) => candidate.id === id) ?? null, [orders, id]);
  const displayState = order ? getOrderDisplayState(order, orderSyncEnabled) : null;
  const syncState = order ? getOrderSyncState(order, orderSyncEnabled) : 'synced';
  const editable = order?.status === 'pending' || order?.status === 'paid';
  const total = order?.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) ?? 0;

  useEffect(() => {
    let active = true;
    void productRepository.listProducts({ page: 1, pageSize: 1000 })
      .then((page) => {
        if (!active) return;
        const images: Record<string, string> = {};
        for (const product of page.items) {
          if (product.imageUrl) images[product.id] = product.imageUrl;
        }
        setProductImages(images);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!currentUser) return <Redirect href={'/login' as never} />;
  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Volver">
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pedido</Text>
          <View style={styles.backButton} />
        </View>
        {!ordersLoaded ? (
          <View style={styles.centerState}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <View style={styles.centerState}>
            <MaterialCommunityIcons name="package-variant-closed" size={40} color={colors.textMuted} />
            <Text style={styles.notFoundTitle}>Pedido no encontrado</Text>
            <Text style={styles.notFoundText}>Es posible que ya no esté disponible en tu cuenta.</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const selectedCountry = COUNTRIES.find((country) => country.code === (address?.countryCode ?? order.shippingAddress.countryCode));
  const dialCode = selectedCountry?.dialCode ?? '';

  const canSaveAddress = !!address
    && !!address.recipient.trim()
    && !!address.line1.trim()
    && !!address.city.trim()
    && !!address.phone.trim()
    && !validatePhoneNumber(address.phone, address.countryCode)
    && COUNTRIES.some((country) => country.code === address.countryCode);

  const updateField = (key: keyof CheckoutInput, value: string) => {
    setAddress((current) => (current ? { ...current, [key]: value } : current));
  };

  const isOfflineNow = async () => !(await hasNetworkConnection());

  const handleSaveAddress = async () => {
    if (busyRef.current) return;
    if (!order || !address || !canSaveAddress) {
      show('Completa los campos obligatorios con datos válidos.', 'error');
      return;
    }
    busyRef.current = true;
    setBusy('save');
    try {
      const offline = await isOfflineNow();
      await updateOrder(order.id, currentUser.id, {
        shippingAddress: {
          ...order.shippingAddress,
          recipient: address.recipient.trim(),
          phone: `${dialCode} ${address.phone.trim()}`,
          line1: address.line1.trim(),
          city: address.city.trim(),
          region: address.region.trim() || undefined,
          postalCode: address.postalCode.trim() || undefined,
          countryCode: address.countryCode.trim().toUpperCase(),
        },
      });
      setEditingAddress(false);
      setAddress(null);
      show(
        offline ? 'Datos actualizados. Se confirmarán al recuperar la conexión.' : 'Datos de entrega actualizados.',
        'success',
      );
    } catch (error) {
      show(error instanceof Error ? error.message : 'No se pudo actualizar el pedido.', 'error');
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const handleCancelOrder = () => {
    void (async () => {
      const offline = await isOfflineNow();
      Alert.alert(
        '¿Cancelar este pedido?',
        offline
          ? 'El pedido se cancelará en tu dispositivo y se confirmará al recuperar la conexión.'
          : 'El pedido quedará registrado como cancelado.',
        [
          { text: 'Volver', style: 'cancel' },
          {
            text: 'Cancelar pedido',
            style: 'destructive',
            onPress: () => {
              if (busyRef.current) return;
              busyRef.current = true;
              setBusy('cancel');
              void cancelOrder(order.id, currentUser.id)
                .then(() => {
                  show(
                    offline ? 'Pedido cancelado. Se confirmará al recuperar la conexión.' : 'Pedido cancelado.',
                    'success',
                  );
                })
                .catch((error: unknown) => show(error instanceof Error ? error.message : 'No se pudo cancelar el pedido.', 'error'))
                .finally(() => { busyRef.current = false; setBusy(null); });
            },
          },
        ],
      );
    })();
  };

  const handleRetrySync = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy('retry');
    void retryOrderSync(currentUser.id)
      .then((synced) => show(
        synced ? 'Todos tus pedidos están sincronizados.' : 'Aún no se pudo confirmar la sincronización; reintentaremos automáticamente.',
        synced ? 'success' : 'info',
      ))
      .finally(() => { busyRef.current = false; setBusy(null); });
  };

  const stepIndex = STATUS_STEP_INDEX[order.status];
  const chipTone = displayState ? TONE_STYLES[displayState.tone] : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Volver">
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Pedido #{order.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.headerSubtitle}>{new Date(order.createdAt).toLocaleDateString('es-PE')}</Text>
        </View>
        {chipTone && displayState && (
          <View style={[styles.statusChip, { backgroundColor: chipTone.backgroundColor }]}>
            <Text style={[styles.statusChipText, { color: chipTone.color }]}>{displayState.label}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {syncState !== 'synced' && (
          <View style={[styles.syncNotice, syncState === 'pending' ? styles.syncNoticePending : styles.syncNoticeError]}>
            <MaterialCommunityIcons
              name={syncState === 'pending' ? 'cloud-sync-outline' : 'cloud-alert-outline'}
              size={18}
              color={syncState === 'pending' ? colors.warning : colors.danger}
            />
            <View style={styles.syncNoticeCopy}>
              <Text style={[styles.syncNoticeText, syncState === 'pending' ? styles.syncNoticeTextPending : styles.syncNoticeTextError]}>
                {syncState === 'pending'
                  ? 'Este pedido se guardó en tu dispositivo y se confirmará automáticamente cuando recuperes la conexión.'
                  : 'No pudimos confirmar este pedido con el servidor. Tus datos están seguros en el dispositivo.'}
              </Text>
              {syncState === 'error' && !!order.syncError && <Text style={styles.syncErrorDetail}>{order.syncError}</Text>}
              {syncState === 'error' && orderSyncEnabled && (
                <TouchableOpacity onPress={handleRetrySync} style={styles.retryButton} disabled={busy !== null}>
                  <MaterialCommunityIcons name="sync" size={15} color={colors.primary} />
                  <Text style={styles.retryButtonText}>{busy === 'retry' ? 'Reintentando…' : 'Reintentar sincronización'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {order.status === 'cancelled' && syncState === 'synced' ? (
          <View style={styles.cancelledBanner}>
            <MaterialCommunityIcons name="close-circle-outline" size={18} color={colors.textMuted} />
            <Text style={styles.cancelledBannerText}>Este pedido fue cancelado.</Text>
          </View>
        ) : order.status !== 'cancelled' && syncState === 'synced' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado del pedido</Text>
            {TIMELINE_STEPS.map((label, index) => {
              const done = index < stepIndex;
              const current = index === stepIndex;
              return (
                <View key={label} style={styles.stepRow}>
                  <View style={styles.stepRail}>
                    <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
                      {done ? <MaterialCommunityIcons name="check" size={12} color={colors.onPrimary} /> : null}
                    </View>
                    {index < TIMELINE_STEPS.length - 1 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
                  </View>
                  <Text style={[styles.stepLabel, (done || current) && styles.stepLabelActive]}>{label}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Productos</Text>
          {order.items.map((item) => (
            <View key={item.sku} style={styles.itemRow}>
              <View style={styles.itemImage}>
                {item.productId && productImages[item.productId]
                  ? <Image source={{ uri: productImages[item.productId] }} style={styles.itemImageFill} resizeMode="contain" />
                  : <MaterialCommunityIcons name="package-variant" size={22} color={colors.primary} />}
              </View>
              <View style={styles.itemCopy}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemMeta}>Cantidad: {item.quantity} · {formatCurrency(item.unitPrice, order.currency)} c/u</Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(item.quantity * item.unitPrice, order.currency)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total, order.currency)}</Text>
          </View>
        </View>

        {order.paymentMethod && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Método de pago</Text>
            <View style={styles.paymentRow}>
              <View style={[styles.paymentBrand, order.paymentMethod === 'yape' ? styles.paymentYape : styles.paymentVisa]}>
                {order.paymentMethod === 'visa'
                  ? <FontAwesome name={cardBrandIcons[order.paymentDetails?.cardBrand ?? 'other']} size={30} color="#1434CB" />
                  : <Text style={[styles.paymentBrandText, styles.paymentYapeText]}>YAPE</Text>}
              </View>
              <View style={styles.addressCopy}>
                <Text style={styles.addressLine}>
                  {order.paymentMethod === 'yape'
                    ? 'Yape · Billetera digital'
                    : `${cardBrandLabels[order.paymentDetails?.cardBrand ?? 'other']} · Tarjeta`}
                </Text>
                {order.paymentMethod === 'yape' && order.paymentDetails?.phone ? (
                  <Text style={styles.addressLine}>{order.paymentDetails.phone}</Text>
                ) : order.paymentMethod === 'visa' && order.paymentDetails ? (
                  <>
                    <Text style={styles.addressLine}>
                      •••• {order.paymentDetails.cardLast4 ?? '••••'}{order.paymentDetails.cardExpiry ? ` · Vence ${order.paymentDetails.cardExpiry}` : ''}
                    </Text>
                    {order.paymentDetails.cardholderName ? <Text style={styles.addressLine}>{order.paymentDetails.cardholderName}</Text> : null}
                  </>
                ) : null}
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Datos de entrega</Text>
            {editable && !editingAddress && (
              <TouchableOpacity onPress={() => { setEditingAddress(true); setAddress(addressToForm(order)); }} style={styles.editButton}>
                <MaterialCommunityIcons name="pencil-outline" size={15} color={colors.primary} />
                <Text style={styles.editText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>
          {editingAddress && address ? (
            <View style={styles.form}>
              <Text style={styles.fieldLabel}>Nombre completo</Text>
              <TextInput value={address.recipient} onChangeText={(v) => updateField('recipient', v)} placeholder="Nombre completo" placeholderTextColor={colors.placeholder} autoCapitalize="words" style={styles.input} />

              <Text style={styles.fieldLabel}>País</Text>
              <TouchableOpacity onPress={() => setCountryPickerOpen(true)} style={styles.countrySelect} accessibilityRole="button">
                <Text style={styles.countryFlag}>{selectedCountry?.flag ?? '🌐'}</Text>
                <Text style={styles.countryName}>{selectedCountry?.name ?? address.countryCode}</Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Número de teléfono</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phoneDial}><Text style={styles.phoneDialText}>{dialCode}</Text></View>
                <TextInput
                  value={address.phone}
                  onChangeText={(v) => updateField('phone', v)}
                  placeholder="999 888 777"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  style={[styles.input, styles.phoneInput]}
                />
              </View>

              {([
                ['line1', 'Dirección'],
                ['city', 'Ciudad'],
                ['region', 'Estado / Provincia / Región (opcional)'],
                ['postalCode', 'Código postal (opcional)'],
              ] as const).map(([key, label]) => (
                <View key={key}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    value={address[key]}
                    onChangeText={(v) => updateField(key, v)}
                    placeholder={label}
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize={key === 'postalCode' ? 'none' : 'words'}
                    style={styles.input}
                  />
                </View>
              ))}

              <View style={styles.formActions}>
                <TouchableOpacity onPress={() => { setEditingAddress(false); setAddress(null); }} style={styles.secondaryButton} disabled={busy !== null}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { void handleSaveAddress(); }} style={[styles.primaryButton, busy === 'save' && styles.disabledButton]} disabled={busy !== null}>
                  <Text style={styles.primaryButtonText}>{busy === 'save' ? 'Guardando…' : 'Guardar cambios'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.addressCopy}>
              <Text style={styles.addressLine}>{order.shippingAddress.recipient}</Text>
              <Text style={styles.addressLine}>{order.shippingAddress.phone}</Text>
              <Text style={styles.addressLine}>{order.shippingAddress.line1}</Text>
              <Text style={styles.addressLine}>
                {[order.shippingAddress.city, order.shippingAddress.region, order.shippingAddress.postalCode].filter(Boolean).join(', ')}
              </Text>
              <Text style={styles.addressLine}>
                {COUNTRIES.find((country) => country.code === order.shippingAddress.countryCode)?.name ?? order.shippingAddress.countryCode}
              </Text>
            </View>
          )}
        </View>

        {editable && !editingAddress && (
          <TouchableOpacity onPress={handleCancelOrder} style={styles.cancelOrderButton} disabled={busy !== null}>
            <MaterialCommunityIcons name="close-circle-outline" size={17} color={colors.danger} />
            <Text style={styles.cancelOrderText}>{busy === 'cancel' ? 'Cancelando…' : 'Cancelar pedido'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <CountryPickerModal
        visible={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        onSelect={(country) => updateField('countryCode', country.code)}
        countries={COUNTRIES}
        isLoading={false}
        selectedCode={address?.countryCode ?? ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 60, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 36, height: 36, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  headerCopy: { flex: 1 },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  headerSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.round },
  statusChipText: { fontSize: 10, fontWeight: '800' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  notFoundTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  notFoundText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  syncNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  syncNoticePending: { backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.25)' },
  syncNoticeError: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.25)' },
  syncNoticeCopy: { flex: 1 },
  syncNoticeText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  syncNoticeTextPending: { color: colors.warning },
  syncNoticeTextError: { color: colors.danger },
  syncErrorDetail: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  retryButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.round, borderWidth: 1, borderColor: colors.primary },
  retryButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  cancelledBannerText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  stepRow: { flexDirection: 'row', gap: spacing.md },
  stepRail: { width: 22, alignItems: 'center' },
  stepDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotCurrent: { borderColor: colors.primary, borderWidth: 2 },
  stepLine: { flex: 1, width: 2, minHeight: 18, backgroundColor: colors.border, marginVertical: 2 },
  stepLineDone: { backgroundColor: colors.primary },
  stepLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingBottom: spacing.md },
  stepLabelActive: { color: colors.textPrimary, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemImage: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  itemImageFill: { width: '100%', height: '100%' },
  itemCopy: { flex: 1 },
  itemName: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
  itemMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  itemPrice: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  totalLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  totalValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paymentBrand: { width: 58, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  paymentYape: { backgroundColor: '#742384' },
  paymentVisa: { backgroundColor: '#F6F8FC', borderWidth: 1, borderColor: '#DDE3EE' },
  paymentBrandText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
  paymentYapeText: { color: colors.white },
  addressCopy: { gap: 4 },
  addressLine: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: spacing.xs },
  editText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  form: { marginTop: spacing.xs, gap: spacing.xs },
  fieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginTop: spacing.xs },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary, fontSize: 13 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  phoneDial: { minHeight: 44, minWidth: 56, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  phoneDialText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  phoneInput: { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  countrySelect: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  countryFlag: { fontSize: 18 },
  countryName: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryButton: { flex: 1, minHeight: 46, borderRadius: radius.round, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.onPrimary, fontSize: 13, fontWeight: '900' },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: radius.round, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
  cancelOrderButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.round, borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)' },
  cancelOrderText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
});
