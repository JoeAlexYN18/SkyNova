import type {
  Order,
  OrderItemSnapshot,
  ShippingAddressSnapshot,
} from '@/domain/entities/Order';

export interface NewOrderInput {
  userId: string;
  shippingAddress: ShippingAddressSnapshot;
  currency: string;
  items: OrderItemSnapshot[];
}

export interface OrderUpdate {
  shippingAddress: ShippingAddressSnapshot;
}

export interface IOrderRepository {
  list(): Promise<Order[]>;
  create(input: NewOrderInput): Promise<Order>;
  checkout(input: NewOrderInput): Promise<Order>;
  update(orderId: string, userId: string, changes: OrderUpdate): Promise<Order>;
  delete(orderId: string, userId: string): Promise<Order>;
}
