import React, { useMemo, useState } from 'react';
import { Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { useCart } from '@/infrastructure/context/CartContext';
import { useOrders } from '@/infrastructure/context/OrderContext';
import { useToast } from '@/infrastructure/context/ToastContext';
import type { CheckoutInput } from '@/domain/entities/Order';
import type { Product } from '@/domain/entities/Product';
import { colors } from '@/shared/theme';
import { styles } from '@/presentation/screens/HomeScreen.styles';

interface Props { onBrowseCatalog: () => void; onOpenProduct: (product: Product) => void }
const money = (amount: number, currency: string) => new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export function CartFeed({ onBrowseCatalog, onOpenProduct }: Props) {
  const { currentUser } = useAuth();
  const { lines, subtotal, setQuantity, removeProduct, clearCart } = useCart();
  const { createDemoOrder } = useOrders();
  const { show } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [address, setAddress] = useState<CheckoutInput>({
    recipient: currentUser?.fullName ?? '',
    phone: currentUser ? `${currentUser.phone.dialCode} ${currentUser.phone.number}` : '',
    line1: '', city: '', region: '', postalCode: '', countryCode: currentUser?.phone.countryCode ?? 'CO',
  });
  const update = (key: keyof CheckoutInput, value: string) => setAddress((current) => ({ ...current, [key]: value }));
  const totalProducts = lines.reduce((sum, line) => sum + line.quantity, 0);
  const currency = lines[0]?.product.currency ?? 'USD';
  const canSubmit = useMemo(() => !!address.recipient.trim() && !!address.phone.trim() && !!address.line1.trim() && !!address.city.trim() && /^[A-Za-z]{2}$/.test(address.countryCode.trim()), [address]);

  const submitOrder = () => {
    if (!currentUser || !lines.length || !canSubmit) return;
    createDemoOrder(currentUser, lines, address);
    clearCart();
    setCheckoutOpen(false);
    show('Pedido de prueba creado. No se realizó ningún cobro.', 'success');
  };

  return <View style={styles.cartPage}>
    <View style={styles.cartTitleRow}>
      <View><Text style={styles.sectionTitle}>Tu carrito</Text><Text style={styles.sectionSubtitle}>{totalProducts} {totalProducts === 1 ? 'producto' : 'productos'}</Text></View>
      {!!lines.length && <TouchableOpacity onPress={clearCart} style={styles.cartTextAction}><Text style={styles.cartTextActionLabel}>Vaciar</Text></TouchableOpacity>}
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
          <Text style={styles.cartProductPrice}>{money(product.price, product.currency)}</Text>
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
        <View style={styles.cartSummaryRow}><Text style={styles.cartSummaryLabel}>Subtotal</Text><Text style={styles.cartSummaryValue}>{money(subtotal, currency)}</Text></View>
        <Text style={styles.cartDemoNote}>El envío se coordina al confirmar. Pago de demostración, sin cargos reales.</Text>
        <TouchableOpacity onPress={() => setCheckoutOpen(true)} style={styles.checkoutButton}><Text style={styles.checkoutButtonText}>Continuar con el pedido</Text><MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} /></TouchableOpacity>
      </View>
    </>}
    <Modal visible={checkoutOpen} transparent animationType="slide" onRequestClose={() => setCheckoutOpen(false)}>
      <View style={styles.checkoutOverlay}><View style={styles.checkoutSheet}>
        <View style={styles.checkoutHeader}><View><Text style={styles.checkoutTitle}>Datos de entrega</Text><Text style={styles.sectionSubtitle}>Confirma dónde recibir tu pedido</Text></View><TouchableOpacity onPress={() => setCheckoutOpen(false)} style={styles.filterClose}><MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} /></TouchableOpacity></View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {([['recipient', 'Nombre de quien recibe'], ['phone', 'Teléfono'], ['line1', 'Dirección'], ['city', 'Ciudad'], ['region', 'Departamento (opcional)'], ['postalCode', 'Código postal (opcional)'], ['countryCode', 'País (código de 2 letras)']] as const).map(([key, label]) => <View key={key} style={styles.checkoutField}>
            <Text style={styles.checkoutLabel}>{label}</Text><TextInput value={address[key]} onChangeText={(value) => update(key, key === 'countryCode' ? value.toUpperCase().slice(0, 2) : value)} placeholder={label} placeholderTextColor={colors.placeholder} autoCapitalize={key === 'countryCode' ? 'characters' : 'words'} style={styles.checkoutInput} />
          </View>)}
          <TouchableOpacity disabled={!canSubmit} onPress={submitOrder} style={[styles.checkoutButton, !canSubmit && styles.checkoutButtonDisabled]}><Text style={styles.checkoutButtonText}>Confirmar pedido de prueba · {money(subtotal, currency)}</Text></TouchableOpacity>
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}
