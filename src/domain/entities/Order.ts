import type { Product } from '@/domain/entities/Product';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'yape' | 'visa';
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

export interface OrderPaymentDetails {
  phone?: string;
  cardholderName?: string;
  cardBrand?: CardBrand;
  cardLast4?: string;
  cardExpiry?: string;
}

export interface ShippingAddressSnapshot {
  id: string;
  userId: string;
  recipient: string;
  phone: string;
  line1: string;
  city: string;
  region?: string;
  postalCode?: string;
  countryCode: string;
}

export interface OrderItemSnapshot {
  productId: string | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  shippingAddress: ShippingAddressSnapshot;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentDetails?: OrderPaymentDetails;
  syncStatus?: 'pending' | 'synced' | 'error';
  syncError?: string;
  currency: string;
  items: OrderItemSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutInput {
  recipient: string;
  phone: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
}

export interface CheckoutLine {
  product: Product;
  quantity: number;
}
