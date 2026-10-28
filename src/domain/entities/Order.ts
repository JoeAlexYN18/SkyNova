import type { Product } from '@/domain/entities/Product';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

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
  productId: string;
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
  currency: string;
  items: OrderItemSnapshot[];
  createdAt: string;
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
