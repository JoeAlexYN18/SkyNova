import React, { useMemo, useRef, useState } from 'react';
import { Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useCart } from '@/infrastructure/context/CartContext';
import { useOrders } from '@/infrastructure/context/OrderContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import type { CheckoutInput, Order } from '@/domain/entities/Order';
import type { Country } from '@/domain/entities/Country';
import type { Product } from '@/domain/entities/Product';
import { COUNTRIES } from '@/infrastructure/data/countries';
import { colors } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { styles } from '@/presentation/screens/HomeScreen.styles';

interface Props {
  onBrowseCatalog: () => void;
  onOpenProduct: (product: Product) => void;
  onViewOrders: () => void;
}

export function CartFeed({ onBrowseCatalog, onOpenProduct, onViewOrders }: Props) {
  const { currentUser } = useAuth();
  const { lines, subtotal, setQuantity, removeProduct, clearCart } = useCart();
  const { checkoutOrder } = useOrders();
  const { show } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [submittedCheckout, setSubmittedCheckout] = useState(false);
  const submitLock = useRef(false);
  const [address, setAddress] = useState<CheckoutInput>({
    recipient: currentUser?.fullName ?? '',
    phone: currentUser?.phone.number ?? '',
    line1: '', city: '', region: '', postalCode: '', countryCode: currentUser?.phone.countryCode ?? 'CO',
  });
  const update = (key: keyof CheckoutInput, value: string) => setAddress((current) => ({ ...current, [key]: value }));
  const totalProducts = lines.reduce((sum, line) => sum + line.quantity, 0);
  const currency = lines[0]?.product.currency ?? 'USD';
  const canSubmit = useMemo(
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
  const selectedCountry = COUNTRIES.find((country) => country.code === address.countryCode) ?? COUNTRIES[0];
  const closeCountryPicker = () => {
    setCountryPickerOpen(false);
    setCountrySearch('');
  };
  const updatePhone = (value: string) => {
    const trimmed = value.trim();
    const internationalPrefix = trimmed.startsWith('+') ? '+' : trimmed.startsWith('00') ? '00' : '';
    const enteredDigits = trimmed.replace(/\D/g, '');
    const countryDialDigits = selectedCountry.dialCode.replace(/\D/g, '');
    const nationalNumber = internationalPrefix && enteredDigits.startsWith(countryDialDigits)
      ? enteredDigits.slice(countryDialDigits.length)
      : value;
    update('phone', nationalNumber);
  };

  const submitOrder = async () => {
    if (!currentUser || !lines.length || submitLock.current) return;
    if (!canSubmit) {
      setSubmittedCheckout(true);
      show('Completa todos los campos obligatorios para continuar.', 'error');
      return;
    }
    submitLock.current = true;
    setIsSubmitting(true);
    try {
      const order = await checkoutOrder(currentUser, lines, {
        ...address,
        phone: `${selectedCountry.dialCode} ${address.phone.trim()}`,
      });
      clearCart();
      setCheckoutOpen(false);
      setSubmittedCheckout(false);
      setCompletedOrder(order);
    } catch (error) {
      show(error instanceof Error ? error.message : 'No se pudo crear el pedido.', 'error');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return <View style={styles.cartPage}>
    <View style={styles.cartTitleRow}>
      <View><Text style={styles.sectionTitle}>Tu carrito</Text><Text style={styles.sectionSubtitle}>{totalProducts} {totalProducts === 1 ? 'producto' : 'productos'}</Text></View>
    </View>
    {!lines.length ? <View style={styles.emptyState}>
      <View style={styles.emptyIcon}><MaterialCommunityIcons name="cart-outline" size={38} color={colors.primary} /></View>
      <Text style={styles.sectionTitle}>Tu carrito está vacío</Text>
      <Text style={styles.subtitle}>Explora drones, accesorios y repuestos para empezar.</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onBrowseCatalog}><Text style={styles.primaryButtonText}>Ir al catálogo</Text></TouchableOpacity>
    </View> : <>
      {lines.map(({ product, quantity }) => <View key={product.id} style={styles.cartLine}>
        <TouchableOpacity style={styles.cartProductImage} onPress={() => onOpenProduct(product)} accessibilityRole="button" accessibilityLabel={`Ver detalles de ${product.name}`}>
          {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.cartImage} resizeMode="contain" /> : <MaterialCommunityIcons name="drone" size={32} color={colors.primary} />}
        </TouchableOpacity>
        <View style={styles.cartProductDetails}>
          <Text style={styles.productBrand}>{product.brand}</Text>
          <Text style={styles.cartProductName} numberOfLines={2} onPress={() => onOpenProduct(product)}>{product.name}</Text>
          <Text style={styles.cartProductPrice}>{formatCurrency(product.price, product.currency)}</Text>
          <View style={styles.cartActionsRow}>
            <View style={styles.quantityControl}>
              <TouchableOpacity accessibilityLabel={`Disminuir ${product.name}`} disabled={quantity <= 1} onPress={() => setQuantity(product.id, quantity - 1)} style={styles.quantityButton}><MaterialCommunityIcons name="minus" size={17} color={quantity <= 1 ? colors.textMuted : colors.textPrimary} /></TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity accessibilityLabel={`Aumentar ${product.name}`} disabled={quantity >= product.stockQuantity} onPress={() => setQuantity(product.id, quantity + 1)} style={styles.quantityButton}><MaterialCommunityIcons name="plus" size={17} color={quantity >= product.stockQuantity ? colors.textMuted : colors.textPrimary} /></TouchableOpacity>
            </View>
            <TouchableOpacity accessibilityLabel={`Quitar ${product.name}`} onPress={() => removeProduct(product.id)} style={styles.removeItemButton}><MaterialCommunityIcons name="trash-can-outline" size={19} color={colors.danger} /><Text style={styles.removeItemText}>Quitar</Text></TouchableOpacity>
          </View>
          {quantity >= product.stockQuantity && <Text style={styles.cartStockNote}>Máximo disponible: {product.stockQuantity}</Text>}
        </View>
      </View>)}
      <View style={styles.cartSummary}>
        <View style={styles.cartSummaryRow}><Text style={styles.cartSummaryLabel}>Total</Text><Text style={styles.cartSummaryValue}>{formatCurrency(subtotal, currency)}</Text></View>
        <TouchableOpacity onPress={() => setCheckoutOpen(true)} style={styles.checkoutButton}><Text style={styles.checkoutButtonText}>Finalizar compra</Text><MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} /></TouchableOpacity>
      </View>
    </>}
    <Modal
      visible={checkoutOpen || completedOrder !== null}
      transparent
      animationType={completedOrder ? 'fade' : 'slide'}
      onRequestClose={() => completedOrder
        ? setCompletedOrder(null)
        : countryPickerOpen ? closeCountryPicker() : setCheckoutOpen(false)}
    >
      {completedOrder ? (
      <View style={styles.orderCompleteOverlay}>
        <View style={styles.orderCompleteCard}>
          <View style={styles.orderCompleteIcon}>
            <MaterialCommunityIcons name="check" size={32} color={colors.onPrimary} />
          </View>
          <Text style={styles.orderCompleteTitle}>¡Pedido confirmado!</Text>
          <Text style={styles.orderCompleteNumber}>Pedido #{completedOrder.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.orderCompleteMessage}>
            {completedOrder.items.length} {completedOrder.items.length === 1 ? 'artículo' : 'artículos'} · {formatCurrency(
              completedOrder.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
              completedOrder.currency,
            )}
          </Text>
          <TouchableOpacity
            style={styles.checkoutButton}
            accessibilityRole="button"
            onPress={() => {
              setCompletedOrder(null);
              onViewOrders();
            }}
          >
            <Text style={styles.checkoutButtonText}>Ver mis pedidos</Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setCompletedOrder(null);
              onBrowseCatalog();
            }}
            style={styles.orderCompleteClose}
          >
            <Text style={styles.orderCompleteCloseText}>Seguir comprando</Text>
          </TouchableOpacity>
        </View>
      </View>
      ) : (
      <View style={styles.checkoutOverlay}><View style={styles.checkoutSheet}>
        <View style={styles.checkoutHeader}>
          <View>
            <Text style={styles.checkoutTitle}>{countryPickerOpen ? 'País de entrega' : 'Finalizar compra'}</Text>
            <Text style={styles.sectionSubtitle}>{countryPickerOpen ? 'Selecciona dónde recibir tu pedido' : 'Revisa el pedido y los datos de entrega'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => countryPickerOpen ? closeCountryPicker() : setCheckoutOpen(false)}
            style={styles.filterClose}
            accessibilityLabel={countryPickerOpen ? 'Volver al pedido' : 'Cerrar compra'}
          >
            <MaterialCommunityIcons name={countryPickerOpen ? 'arrow-left' : 'close'} size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {countryPickerOpen ? (
            <>
              <View style={styles.checkoutField}>
                <TextInput
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                  placeholder="Buscar país"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="words"
                  style={styles.checkoutInput}
                  accessibilityLabel="Buscar país de entrega"
                />
              </View>
              {filteredCountries.map((country: Country) => (
                <TouchableOpacity
                  key={country.code}
                  style={styles.checkoutCountryRow}
                  onPress={() => {
                    update('countryCode', country.code);
                    closeCountryPicker();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: country.code === address.countryCode }}
                >
                  <Text style={styles.checkoutCountryFlag}>{country.flag}</Text>
                  <Text style={styles.checkoutCountryName}>{country.name}</Text>
                  {country.code === address.countryCode && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
              {filteredCountries.length === 0 && <Text style={styles.orderEmpty}>No encontramos ese país.</Text>}
            </>
          ) : <>
          <View style={styles.checkoutOrderSummary}>
            <Text style={styles.checkoutSummaryTitle}>Resumen del pedido</Text>
            {lines.map(({ product, quantity }) => (
              <View key={product.id} style={styles.checkoutSummaryRow}>
                <Text style={styles.checkoutSummaryProduct} numberOfLines={1}>{product.name} × {quantity}</Text>
                <Text style={styles.checkoutSummaryPrice}>{formatCurrency(product.price * quantity, product.currency)}</Text>
              </View>
            ))}
            <View style={styles.checkoutSummaryTotal}>
              <Text style={styles.checkoutSummaryTotalLabel}>Total</Text>
              <Text style={styles.checkoutSummaryTotalValue}>{formatCurrency(subtotal, currency)}</Text>
            </View>
          </View>
          <View style={styles.checkoutField}>
            <Text style={styles.checkoutLabel}>País</Text>
            <TouchableOpacity
              onPress={() => setCountryPickerOpen(true)}
              style={styles.checkoutCountrySelect}
              accessibilityRole="button"
              accessibilityLabel={`País de entrega: ${selectedCountry.name}, código ${selectedCountry.dialCode}`}
            >
              <Text style={styles.checkoutCountryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.checkoutCountryName}>{selectedCountry.name}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {submittedCheckout && !COUNTRIES.some((country) => country.code === address.countryCode) && (
              <Text style={styles.checkoutFieldError}>Selecciona un país para continuar.</Text>
            )}
          </View>
          <View style={styles.checkoutField}>
            <Text style={styles.checkoutLabel}>Número de teléfono</Text>
            <View style={styles.checkoutPhoneRow}>
              <View style={styles.checkoutPhonePrefix}>
                <Text style={styles.checkoutDialCode}>{selectedCountry.dialCode}</Text>
              </View>
              <TextInput
                value={address.phone}
                onChangeText={updatePhone}
                placeholder="Número de teléfono"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                keyboardType="phone-pad"
                autoComplete="tel"
                style={[styles.checkoutInput, styles.checkoutPhoneInput]}
                accessibilityLabel={`Número de teléfono, código de país ${selectedCountry.dialCode}`}
              />
            </View>
            {submittedCheckout && !address.phone.trim() && (
              <Text style={styles.checkoutFieldError}>Completa este campo para continuar.</Text>
            )}
          </View>
          {([
            ['recipient', 'Nombre completo'],
            ['line1', 'Dirección'],
            ['city', 'Ciudad'],
            ['region', 'Estado / Provincia / Región'],
            ['postalCode', 'Código postal'],
          ] as const).map(([key, label]) => <View key={key} style={styles.checkoutField}>
            <Text style={styles.checkoutLabel}>{label}</Text><TextInput
              value={address[key]}
              onChangeText={(value) => update(key, value)}
              placeholder={label}
              placeholderTextColor={colors.placeholder}
              autoCapitalize={key === 'postalCode' ? 'none' : key === 'line1' ? 'sentences' : 'words'}
              autoComplete={
                key === 'recipient' ? 'name'
                  : key === 'line1' ? 'address-line1'
                      : key === 'postalCode' ? 'postal-code'
                        : 'off'
              }
              style={styles.checkoutInput}
            />
            {submittedCheckout && !address[key].trim() && (
              <Text style={styles.checkoutFieldError}>Completa este campo para continuar.</Text>
            )}
          </View>)}
          <TouchableOpacity disabled={isSubmitting} onPress={() => { void submitOrder(); }} style={[styles.checkoutButton, isSubmitting && styles.checkoutButtonDisabled]}><Text style={styles.checkoutButtonText}>{isSubmitting ? 'Procesando pedido…' : `Confirmar compra · ${formatCurrency(subtotal, currency)}`}</Text></TouchableOpacity>
          </>}
        </ScrollView>
      </View></View>
      )}
    </Modal>
  </View>;
}
