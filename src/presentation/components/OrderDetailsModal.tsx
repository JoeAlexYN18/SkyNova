import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CheckoutInput, Order } from '@/domain/entities/Order';
import { COUNTRIES } from '@/infrastructure/data/countries';
import { useToast } from '@/infrastructure/context/ToastContext';
import { colors, radius, spacing } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/formatCurrency';

interface Props {
  order: Order | null;
  onClose: () => void;
  onSaveAddress: (address: CheckoutInput) => Promise<void>;
  onCancel: () => Promise<void>;
}

const addressFields: { key: keyof CheckoutInput; label: string }[] = [
  { key: 'recipient', label: 'Nombre completo' },
  { key: 'phone', label: 'Número de teléfono' },
  { key: 'line1', label: 'Dirección' },
  { key: 'city', label: 'Ciudad' },
  { key: 'region', label: 'Estado / Provincia / Región' },
  { key: 'postalCode', label: 'Código postal' },
];

export function OrderDetailsModal({ order, onClose, onSaveAddress, onCancel }: Props) {
  const [address, setAddress] = useState<CheckoutInput>(() => order ? addressFromOrder(order) : emptyAddress());
  const [editingAddress, setEditingAddress] = useState(false);
  const [submittedAddress, setSubmittedAddress] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  const canSaveAddress = useMemo(
    () => !!address.recipient.trim() && !!address.phone.trim() && !!address.line1.trim()
      && !!address.city.trim() && !!address.region.trim() && !!address.postalCode.trim()
      && COUNTRIES.some((country) => country.code === address.countryCode),
    [address],
  );
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLocaleLowerCase();
    return query
      ? COUNTRIES.filter((country) => country.name.toLocaleLowerCase().includes(query) || country.code.toLocaleLowerCase() === query)
      : COUNTRIES;
  }, [countrySearch]);
  const closeCountryPicker = () => {
    setCountryPickerOpen(false);
    setCountrySearch('');
  };
  if (!order) return null;

  const editable = order.status === 'pending' || order.status === 'paid';
  const cancellable = editable;
  const total = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const statusStyle = {
    pending: styles.status_pending,
    paid: styles.status_paid,
    shipped: styles.status_shipped,
    delivered: styles.status_delivered,
    cancelled: styles.status_cancelled,
  }[order.status];

  const runAction = async (action: () => Promise<void>, successMessage: string, closeOnSuccess = false) => {
    setBusy(true);
    try {
      await action();
      show(successMessage, 'success');
      setEditingAddress(false);
      setSubmittedAddress(false);
      setCountryPickerOpen(false);
      if (closeOnSuccess) onClose();
    } catch (error) {
      show(error instanceof Error ? error.message : 'No se pudo actualizar el pedido.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancellation = () => {
    Alert.alert('¿Cancelar este pedido?', 'El pedido quedará registrado como cancelado.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar pedido',
        style: 'destructive',
        onPress: () => { void runAction(onCancel, 'Pedido cancelado.', true); },
      },
    ]);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => countryPickerOpen ? closeCountryPicker() : onClose()}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Pedido #{order.id.slice(-8).toUpperCase()}</Text>
              <Text style={styles.subtitle}>{new Date(order.createdAt).toLocaleDateString('es-CO')}</Text>
              <Text style={[styles.status, statusStyle]}>{statusLabels[order.status]}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Cerrar detalle del pedido">
              <MaterialCommunityIcons name="close" size={21} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Productos</Text>
              {order.items.map((item) => (
                <View key={item.sku} style={styles.itemRow}>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemQuantity}>Cantidad: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{formatCurrency(item.quantity * item.unitPrice, order.currency)}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total, order.currency)}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Datos de entrega</Text>
                {editable && !editingAddress && (
                  <TouchableOpacity onPress={() => { setEditingAddress(true); setSubmittedAddress(false); }} style={styles.editButton}>
                    <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} />
                    <Text style={styles.editText}>Editar</Text>
                  </TouchableOpacity>
                )}
                {editingAddress && countryPickerOpen && (
                  <TouchableOpacity onPress={closeCountryPicker} style={styles.editButton}>
                    <MaterialCommunityIcons name="arrow-left" size={16} color={colors.primary} />
                    <Text style={styles.editText}>Volver</Text>
                  </TouchableOpacity>
                )}
              </View>
              {editingAddress && countryPickerOpen ? (
                <>
                  <TextInput
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    placeholder="Buscar país"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="words"
                    style={styles.input}
                    accessibilityLabel="Buscar país de entrega"
                  />
                  {filteredCountries.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={styles.countryRow}
                      onPress={() => {
                        setAddress((current) => ({ ...current, countryCode: country.code }));
                        closeCountryPicker();
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: country.code === address.countryCode }}
                    >
                      <Text style={styles.countryFlag}>{country.flag}</Text>
                      <Text style={styles.countryName}>{country.name}</Text>
                      {country.code === address.countryCode && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                  {filteredCountries.length === 0 && <Text style={styles.emptyCountries}>No encontramos ese país.</Text>}
                </>
              ) : editingAddress ? <>
                {addressFields.map(({ key, label }) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    value={address[key]}
                    onChangeText={(value) => setAddress((current) => ({ ...current, [key]: value }))}
                    placeholder={label}
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize={key === 'phone' || key === 'postalCode' ? 'none' : key === 'line1' ? 'sentences' : 'words'}
                    keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
                    autoComplete={
                      key === 'recipient' ? 'name'
                        : key === 'phone' ? 'tel'
                          : key === 'line1' ? 'address-line1'
                            : key === 'postalCode' ? 'postal-code'
                              : 'off'
                    }
                    style={styles.input}
                  />
                  {submittedAddress && !address[key].trim() && (
                    <Text style={styles.fieldError}>Completa este campo para continuar.</Text>
                  )}
                </View>
                ))}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>País</Text>
                  <TouchableOpacity onPress={() => setCountryPickerOpen(true)} style={styles.countrySelect} accessibilityRole="button">
                    <Text style={styles.countryFlag}>{COUNTRIES.find((country) => country.code === address.countryCode)?.flag ?? '🌐'}</Text>
                    <Text style={styles.countryName}>
                      {COUNTRIES.find((country) => country.code === address.countryCode)?.name ?? address.countryCode}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  {submittedAddress && !COUNTRIES.some((country) => country.code === address.countryCode) && (
                    <Text style={styles.fieldError}>Selecciona un país para continuar.</Text>
                  )}
                </View>
              </> : (
                <View style={styles.addressCopy}>
                  <Text style={styles.addressLine}>{order.shippingAddress.recipient}</Text>
                  <Text style={styles.addressLine}>{order.shippingAddress.phone}</Text>
                  <Text style={styles.addressLine}>{order.shippingAddress.line1}</Text>
                  <Text style={styles.addressLine}>
                    {[order.shippingAddress.city, order.shippingAddress.region, order.shippingAddress.postalCode]
                      .filter(Boolean).join(', ')}
                  </Text>
                  <Text style={styles.addressLine}>
                    {COUNTRIES.find((country) => country.code === order.shippingAddress.countryCode)?.name ?? order.shippingAddress.countryCode}
                  </Text>
                </View>
              )}
            </View>

            {editingAddress && !countryPickerOpen ? (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => { setEditingAddress(false); setCountryPickerOpen(false); setSubmittedAddress(false); }} style={styles.secondaryButton} disabled={busy}>
                  <Text style={styles.secondaryButtonText}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (!canSaveAddress) {
                      setSubmittedAddress(true);
                      show('Completa todos los campos obligatorios para continuar.', 'error');
                      return;
                    }
                    void runAction(() => onSaveAddress(address), 'Datos de entrega actualizados.');
                  }}
                  style={[styles.primaryButton, busy && styles.disabledButton]}
                  disabled={busy}
                >
                  <Text style={styles.primaryButtonText}>Guardar cambios</Text>
                </TouchableOpacity>
              </View>
            ) : !editingAddress ? (
              <View style={styles.actions}>
                {cancellable && (
                  <TouchableOpacity onPress={confirmCancellation} style={styles.cancelButton} disabled={busy}>
                    <MaterialCommunityIcons name="close-circle-outline" size={17} color={colors.danger} />
                    <Text style={styles.cancelText}>Cancelar pedido</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function emptyAddress(): CheckoutInput {
  return { recipient: '', phone: '', line1: '', city: '', region: '', postalCode: '', countryCode: '' };
}

function addressFromOrder(order: Order): CheckoutInput {
  return {
    recipient: order.shippingAddress.recipient,
    phone: order.shippingAddress.phone,
    line1: order.shippingAddress.line1,
    city: order.shippingAddress.city,
    region: order.shippingAddress.region ?? '',
    postalCode: order.shippingAddress.postalCode ?? '',
    countryCode: order.shippingAddress.countryCode,
  };
}

const statusLabels: Record<Order['status'], string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { height: '90%', backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' },
  header: { minHeight: 66, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  status: { alignSelf: 'flex-start', color: colors.textSecondary, fontSize: 10, fontWeight: '800', marginTop: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.round, backgroundColor: colors.surfaceAlt },
  status_pending: { color: colors.warning, backgroundColor: 'rgba(251,191,36,0.12)' },
  status_paid: { color: colors.success, backgroundColor: 'rgba(52,211,153,0.12)' },
  status_shipped: { color: colors.info, backgroundColor: 'rgba(56,189,248,0.12)' },
  status_delivered: { color: colors.primary, backgroundColor: 'rgba(34,211,238,0.12)' },
  status_cancelled: { color: colors.textMuted, backgroundColor: 'rgba(148,163,184,0.12)' },
  closeButton: { width: 36, height: 36, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  section: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  itemRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemCopy: { flex: 1, paddingVertical: spacing.xs },
  itemName: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
  itemQuantity: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  itemPrice: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.md },
  totalLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  totalValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: spacing.xs },
  editText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  addressCopy: { gap: 4 },
  addressLine: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  field: { marginTop: spacing.sm },
  fieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 5 },
  fieldError: { color: colors.danger, fontSize: 11, marginTop: 4 },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary, fontSize: 13 },
  countrySelect: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  countryRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  countryFlag: { fontSize: 18 },
  countryName: { flex: 1, color: colors.textPrimary, fontSize: 12 },
  emptyCountries: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  primaryButton: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.round, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.onPrimary, fontSize: 13, fontWeight: '900' },
  secondaryButton: { minHeight: 44, borderRadius: radius.round, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
  cancelButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cancelText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
});
