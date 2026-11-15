import type {
  Order,
  OrderItemSnapshot,
  OrderPaymentDetails,
  PaymentMethod,
  ShippingAddressSnapshot,
} from '@/domain/entities/Order';
import type { User } from '@/domain/entities/User';

export interface NewOrderInput {
  userId: string;
  user?: User;
  shippingAddress: ShippingAddressSnapshot;
  paymentMethod?: PaymentMethod;
  paymentDetails?: OrderPaymentDetails;
  currency: string;
  items: OrderItemSnapshot[];
}

export interface OrderUpdate {
  shippingAddress: ShippingAddressSnapshot;
}

export interface IOrderRepository {
  list(userId: string, onSyncError?: (error: unknown) => void): Promise<Order[]>;
  getDefaultAddress(userId: string, onSyncError?: (error: unknown) => void): Promise<ShippingAddressSnapshot | null>;
  syncDefaultAddressContact(
    userId: string,
    previous: { recipient: string; phone: string; countryCode: string },
    next: { recipient: string; phone: string; countryCode: string },
  ): Promise<void>;
  checkout(input: NewOrderInput): Promise<Order>;
  update(orderId: string, userId: string, changes: OrderUpdate): Promise<Order>;
  delete(orderId: string, userId: string): Promise<Order>;
  markOrderSynced(orderId: string, userId: string, updatedAt: string): Promise<void>;
  markOrderSyncError(orderId: string, userId: string, message: string): Promise<void>;
}
