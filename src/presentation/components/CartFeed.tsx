// Improvement 8

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Network from 'expo-network';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useCart } from '@/infrastructure/context/CartContext';
import { useOrders } from '@/infrastructure/context/OrderContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import type { CheckoutInput, Order, OrderPaymentDetails, PaymentMethod } from '@/domain/entities/Order';
import type { Country } from '@/domain/entities/Country';
import type { Product } from '@/domain/entities/Product';
import { COUNTRIES } from '@/infrastructure/data/countries';
import { useNetworkStatus } from '@/presentation/hooks/useNetworkStatus';
import { colors } from '@/shared/theme';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import {
  cardDigits,
  detectCardBrand,
  validateCardExpiry,
  validateCardholderName,
  validateCardNumber,
  validateCardCvv,
  validatePhoneNumber,
} from '@/shared/validators/formValidators';
import { styles } from '@/presentation/screens/HomeScreen.styles';

interface Props {
  onBrowseCatalog: () => void;
  onOpenProduct: (product: Product) => void;
  onViewOrders: () => void;
}

export function CartFeed({ onBrowseCatalog, onOpenProduct, onViewOrders }: Props) {
  const { currentUser } = useAuth();
  const { lines, subtotal, setQuantity, removeProduct, clearCart } = useCart();
  const { checkoutOrder, getDefaultAddress } = useOrders();
  const { show } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [completedOffline, setCompletedOffline] = useState(false);
  const isOnline = useNetworkStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [submittedCheckout, setSubmittedCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('yape');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [cardholderName, setCardholderName] = useState(currentUser?.fullName ?? '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const submitLock = useRef(false);
  const [address, setAddress] = useState<CheckoutInput>({
    recipient: currentUser?.fullName ?? '',
    phone: currentUser?.phone.number ?? '',
    line1: '', city: '', region: '', postalCode: '', countryCode: currentUser?.phone.countryCode ?? 'CO',
  });
  const update = (key: keyof CheckoutInput, value: string) => setAddress((current) => ({ ...current, [key]: value }));
  const profileSnapshot = {
    fullName: currentUser?.fullName ?? '',
    phoneNumber: currentUser?.phone.number ?? '',
    countryCode: currentUser?.phone.countryCode ?? '',
  };
  const [prevProfileSnapshot, setPrevProfileSnapshot] = useState(profileSnapshot);
  if (
    profileSnapshot.fullName !== prevProfileSnapshot.fullName
    || profileSnapshot.phoneNumber !== prevProfileSnapshot.phoneNumber
    || profileSnapshot.countryCode !== prevProfileSnapshot.countryCode
  ) {
    setPrevProfileSnapshot(profileSnapshot);
    setAddress((current) => {
      const nextCountryCode = !current.countryCode.trim() || current.countryCode === prevProfileSnapshot.countryCode
        ? profileSnapshot.countryCode : current.countryCode;
      return {
        ...current,
        recipient: !current.recipient.trim() || current.recipient === prevProfileSnapshot.fullName
          ? profileSnapshot.fullName : current.recipient,
        phone: (!current.phone.trim() || current.phone === prevProfileSnapshot.phoneNumber)
          ? (nextCountryCode === profileSnapshot.countryCode ? profileSnapshot.phoneNumber : '')
          : current.phone,
        countryCode: nextCountryCode,
      };
    });
    setCardholderName((current) =>
      !current.trim() || current === prevProfileSnapshot.fullName ? profileSnapshot.fullName : current);
  }
  const totalProducts = lines.reduce((sum, line) => sum + line.quantity, 0);
  const currency = lines[0]?.product.currency ?? 'USD';
  const canSubmit = useMemo(
    () => !!address.recipient.trim() && !!address.phone.trim() && !!address.line1.trim()
      && !!address.city.trim()
      && !address.phone.trim().startsWith('+')
      && !address.phone.trim().startsWith('00')
      && !validatePhoneNumber(address.phone, address.countryCode || currentUser?.phone.countryCode || '')
      && COUNTRIES.some((country) => country.code === address.countryCode),
    [address, currentUser?.phone.countryCode],
  );
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLocaleLowerCase();
    return query
      ? COUNTRIES.filter((country) => country.name.toLocaleLowerCase().includes(query) || country.code.toLocaleLowerCase() === query)
      : COUNTRIES;
  }, [countrySearch]);
  const selectedCountry = COUNTRIES.find((country) => country.code === address.countryCode) ?? COUNTRIES[0];
  const checkoutIsPeru = (address.countryCode ?? '').toUpperCase() === 'PE';
  const paymentOptions = useMemo(() => ([
    ...(checkoutIsPeru ? [{ id: 'yape' as const, name: 'Yape', description: 'Billetera digital' }] : []),
    { id: 'visa' as const, name: 'Visa', description: 'Tarjeta de crédito o débito' },
  ]), [checkoutIsPeru]);
  const effectivePaymentMethod: PaymentMethod = checkoutIsPeru ? paymentMethod : 'visa';
  const profileIsPeru = (currentUser?.phone.countryCode ?? '').toUpperCase() === 'PE';
  const yapeFallbackPhone = profileIsPeru ? (currentUser?.phone.number ?? '') : '';
  const [paymentPhoneAuto, setPaymentPhoneAuto] = useState<string | null>(null);
  if (yapeFallbackPhone !== paymentPhoneAuto) {
    const untouched = !paymentPhone.trim() || paymentPhone === paymentPhoneAuto;
    setPaymentPhoneAuto(yapeFallbackPhone);
    if (untouched) setPaymentPhone(yapeFallbackPhone);
  }
  const yapeCountryCode = (address.countryCode ?? '').toUpperCase();
  const yapeDialCode = selectedCountry.dialCode;
  const yapePhoneValid = useMemo(() => {
    const trimmed = paymentPhone.trim();
    return !!trimmed
      && !trimmed.startsWith('+')
      && !trimmed.startsWith('00')
      && !validatePhoneNumber(trimmed, yapeCountryCode);
  }, [paymentPhone, yapeCountryCode]);
  const detectedCardBrand = detectCardBrand(cardDigits(cardNumber));
  const cardFormValid = useMemo(
    () => !validateCardholderName(cardholderName)
      && !validateCardNumber(cardNumber)
      && !validateCardExpiry(cardExpiry)
      && !validateCardCvv(cardCvv, detectCardBrand(cardDigits(cardNumber))),
    [cardholderName, cardNumber, cardExpiry, cardCvv],
  );
  const paymentReady = effectivePaymentMethod === 'yape' ? yapePhoneValid : cardFormValid;
  const completedUnits = completedOrder?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const buildPaymentDetails = (): OrderPaymentDetails => effectivePaymentMethod === 'yape'
    ? { phone: `${yapeDialCode} ${paymentPhone.trim()}` }
    : {
        cardholderName: cardholderName.trim(),
        cardBrand: detectedCardBrand,
        cardLast4: cardDigits(cardNumber).slice(-4),
        cardExpiry: cardExpiry.trim(),
      };
  const handleCardNumberChange = (value: string) => {
    const digits = cardDigits(value).slice(0, 19);
    setCardNumber(digits.replace(/(\d{4})(?=\d)/g, '$1 '));
  };
  const handleCardExpiryChange = (value: string) => {
    const digits = cardDigits(value).slice(0, 4);
    setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  };
  const handleCardCvvChange = (value: string) => {
    setCardCvv(cardDigits(value).slice(0, detectedCardBrand === 'amex' ? 4 : 3));
  };
  const profileRef = useRef(currentUser);
  useEffect(() => {
    profileRef.current = currentUser;
  }, [currentUser]);
  useEffect(() => {
    const user = profileRef.current;
    if (!user) return;
    let active = true;
    getDefaultAddress(user.id).then((saved) => {
      if (!active) return;
      if (saved) {
        const sameLocale = (saved.countryCode ?? '').toUpperCase()
          === (user.phone.countryCode ?? '').toUpperCase();
        const countryCode = user.phone.countryCode || saved.countryCode;
        setAddress({
          recipient: user.fullName,
          phone: countryCode === user.phone.countryCode ? user.phone.number : '',
          line1: sameLocale ? saved.line1 : '',
          city: sameLocale ? saved.city : '',
          region: sameLocale ? (saved.region ?? '') : '',
          postalCode: sameLocale ? (saved.postalCode ?? '') : '',
          countryCode,
        });
      } else {
        setAddress((current) => ({
          ...current,
          recipient: user.fullName,
          phone: user.phone.number,
          countryCode: user.phone.countryCode,
        }));
      }
    }).catch((error: unknown) => {
      if (active) show(error instanceof Error ? error.message : 'No se pudo cargar la dirección guardada.', 'error');
    });
    return () => { active = false; };
  }, [currentUser?.id, getDefaultAddress, show]);
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
    if (!canSubmit || !paymentReady) {
      setSubmittedCheckout(true);
      show(
        !canSubmit
          ? 'Completa todos los campos obligatorios para continuar.'
          : 'Completa los datos de pago para continuar.',
        'error',
      );
      return;
    }
    submitLock.current = true;
    setIsSubmitting(true);
    try {
      const networkState = await Network.getNetworkStateAsync().catch(() => null);
      const offlinePurchase = !!networkState && !(networkState.isConnected && networkState.isInternetReachable !== false);
      const order = await checkoutOrder(currentUser, lines, {
        ...address,
        phone: `${selectedCountry.dialCode} ${address.phone.trim()}`,
      }, effectivePaymentMethod, buildPaymentDetails());
      clearCart();
      setCheckoutOpen(false);
      setSubmittedCheckout(false);
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCompletedOffline(offlinePurchase);
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
          <Text style={styles.orderCompleteTitle}>{completedOffline ? '¡Pedido registrado!' : '¡Pago confirmado!'}</Text>
          <Text style={styles.orderCompleteNumber}>Pedido #{completedOrder.id.slice(-8).toUpperCase()}</Text>
          {completedOffline && (
            <Text style={styles.orderCompleteOfflineNote}>
              Pendiente de confirmación: se sincronizará automáticamente cuando recuperes la conexión.
            </Text>
          )}
          <Text style={styles.orderCompleteMessage}>
            {completedUnits} {completedUnits === 1 ? 'artículo' : 'artículos'} · {formatCurrency(
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
                    const profileCountry = (currentUser?.phone.countryCode ?? '').toUpperCase();
                    const profileNumber = currentUser?.phone.number ?? '';
                    setAddress((current) => ({
                      ...current,
                      countryCode: country.code,
                      phone: country.code !== profileCountry
                        && (!current.phone.trim() || current.phone === profileNumber)
                        ? '' : current.phone,
                    }));
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
          {!isOnline && (
            <View style={styles.checkoutOfflineNotice}>
              <MaterialCommunityIcons name="cloud-off-outline" size={17} color={colors.warning} />
              <Text style={styles.checkoutOfflineNoticeText}>
                Estás sin conexión. Tu pedido se guardará en el dispositivo y se confirmará automáticamente cuando recuperes internet.
              </Text>
            </View>
          )}
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
            {submittedCheckout && validatePhoneNumber(address.phone, address.countryCode || currentUser?.phone.countryCode || '') && (
              <Text style={styles.checkoutFieldError}>
                {address.phone.trim() ? 'Ingresa un número válido para el país seleccionado.' : 'Completa este campo para continuar.'}
              </Text>
            )}
          </View>
          {([
            ['recipient', 'Nombre completo'],
            ['line1', 'Dirección'],
            ['city', 'Ciudad'],
            ['region', 'Estado / Provincia / Región (opcional)'],
            ['postalCode', 'Código postal (opcional)'],
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
            {submittedCheckout && (key === 'recipient' || key === 'line1' || key === 'city') && !address[key].trim() && (
              <Text style={styles.checkoutFieldError}>Completa este campo para continuar.</Text>
            )}
          </View>)}
          <View style={styles.checkoutPaymentSection}>
            <Text style={styles.checkoutLabel}>Método de pago</Text>
            <View style={styles.checkoutPaymentOptions}>
              {paymentOptions.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => setPaymentMethod(method.id)}
                  style={[
                    styles.checkoutPaymentOption,
                    effectivePaymentMethod === method.id && styles.checkoutPaymentOptionSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: effectivePaymentMethod === method.id }}
                  accessibilityLabel={`${method.name}, ${method.description}`}
                >
                  <View style={[
                    styles.checkoutPaymentBrand,
                    method.id === 'yape' ? styles.checkoutPaymentYape : styles.checkoutPaymentVisa,
                  ]}>
                    {method.id === 'visa'
                      ? <FontAwesome name="cc-visa" size={36} color="#1434CB" />
                      : <Text style={[styles.checkoutPaymentBrandText, styles.checkoutPaymentYapeText]}>YAPE</Text>}
                  </View>
                  <View style={styles.checkoutPaymentCopy}>
                    <Text style={styles.checkoutPaymentName}>{method.name}</Text>
                    <Text style={styles.checkoutPaymentDescription}>{method.description}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={effectivePaymentMethod === method.id ? 'radiobox-marked' : 'radiobox-blank'}
                    size={21}
                    color={effectivePaymentMethod === method.id ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {effectivePaymentMethod === 'yape' ? (
              <View style={styles.checkoutField}>
                <Text style={styles.checkoutLabel}>Número de Yape</Text>
                <View style={styles.checkoutPhoneRow}>
                  <View style={styles.checkoutPhonePrefix}>
                    <Text style={styles.checkoutDialCode}>{yapeDialCode}</Text>
                  </View>
                  <TextInput
                    value={paymentPhone}
                    onChangeText={setPaymentPhone}
                    placeholder="Número de Yape"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="none"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    style={[styles.checkoutInput, styles.checkoutPhoneInput]}
                    accessibilityLabel="Número de Yape"
                  />
                </View>
                {submittedCheckout && !yapePhoneValid && (
                  <Text style={styles.checkoutFieldError}>
                    {paymentPhone.trim()
                      ? 'Ingresa un número de Yape válido para Perú.'
                      : 'Completa este campo para continuar.'}
                  </Text>
                )}
              </View>
            ) : (
              <>
                <View style={styles.checkoutField}>
                  <Text style={styles.checkoutLabel}>Nombre del titular</Text>
                  <TextInput
                    value={cardholderName}
                    onChangeText={setCardholderName}
                    placeholder="Como aparece en la tarjeta"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="words"
                    autoComplete="cc-name"
                    style={styles.checkoutInput}
                    accessibilityLabel="Nombre del titular de la tarjeta"
                  />
                  {submittedCheckout && !!validateCardholderName(cardholderName) && (
                    <Text style={styles.checkoutFieldError}>{validateCardholderName(cardholderName)}</Text>
                  )}
                </View>
                <View style={styles.checkoutField}>
                  <Text style={styles.checkoutLabel}>Número de tarjeta</Text>
                  <TextInput
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="none"
                    keyboardType="number-pad"
                    autoComplete="cc-number"
                    style={styles.checkoutInput}
                    accessibilityLabel="Número de tarjeta"
                  />
                  {submittedCheckout && !!validateCardNumber(cardNumber) && (
                    <Text style={styles.checkoutFieldError}>{validateCardNumber(cardNumber)}</Text>
                  )}
                </View>
                <View style={styles.checkoutCardRow}>
                  <View style={[styles.checkoutField, styles.checkoutCardField]}>
                    <Text style={styles.checkoutLabel}>Vencimiento</Text>
                    <TextInput
                      value={cardExpiry}
                      onChangeText={handleCardExpiryChange}
                      placeholder="MM/AA"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      keyboardType="number-pad"
                      autoComplete="cc-exp"
                      maxLength={5}
                      style={styles.checkoutInput}
                      accessibilityLabel="Fecha de vencimiento de la tarjeta"
                    />
                    {submittedCheckout && !!validateCardExpiry(cardExpiry) && (
                      <Text style={styles.checkoutFieldError}>{validateCardExpiry(cardExpiry)}</Text>
                    )}
                  </View>
                  <View style={[styles.checkoutField, styles.checkoutCardField]}>
                    <Text style={styles.checkoutLabel}>CVV</Text>
                    <TextInput
                      value={cardCvv}
                      onChangeText={handleCardCvvChange}
                      placeholder="CVV"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="none"
                      keyboardType="number-pad"
                      autoComplete="cc-csc"
                      secureTextEntry
                      maxLength={4}
                      style={styles.checkoutInput}
                      accessibilityLabel="Código de seguridad de la tarjeta"
                    />
                    {submittedCheckout && !!validateCardCvv(cardCvv, detectedCardBrand) && (
                      <Text style={styles.checkoutFieldError}>{validateCardCvv(cardCvv, detectedCardBrand)}</Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
          <TouchableOpacity disabled={isSubmitting} onPress={() => { void submitOrder(); }} style={[styles.checkoutButton, isSubmitting && styles.checkoutButtonDisabled]}><Text style={styles.checkoutButtonText}>{isSubmitting ? 'Procesando pago…' : `Pagar ahora · ${formatCurrency(subtotal, currency)}`}</Text></TouchableOpacity>
          </>}
        </ScrollView>
      </View></View>
      )}
    </Modal>
  </View>;
}
