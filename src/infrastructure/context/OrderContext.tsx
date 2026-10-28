import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CheckoutInput, CheckoutLine, Order } from '@/domain/entities/Order';
import type { User } from '@/domain/entities/User';
import { generateId } from '@/shared/utils/generateId';

interface OrderContextValue {
  orders: Order[];
  createDemoOrder: (user: User, lines: CheckoutLine[], address: CheckoutInput) => Order;
  cancelOrder: (orderId: string, userId: string) => void;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const createDemoOrder = useCallback((user: User, lines: CheckoutLine[], input: CheckoutInput) => {
    const order: Order = {
      id: generateId('ord'),
      userId: user.id,
      shippingAddress: {
        id: generateId('adr'), userId: user.id, recipient: input.recipient.trim(), phone: input.phone.trim(),
        line1: input.line1.trim(), city: input.city.trim(), region: input.region.trim() || undefined,
        postalCode: input.postalCode.trim() || undefined, countryCode: input.countryCode.trim().toUpperCase(),
      },
      status: 'paid',
      currency: lines[0]?.product.currency ?? 'USD',
      items: lines.map(({ product, quantity }) => ({
        productId: product.id, productName: product.name, sku: product.sku, quantity, unitPrice: product.price,
      })),
      createdAt: new Date().toISOString(),
    };
    setOrders((current) => [order, ...current]);
    return order;
  }, []);
  const cancelOrder = useCallback((orderId: string, userId: string) => {
    setOrders((current) => current.map((order) => order.id === orderId && order.userId === userId && order.status === 'paid'
      ? { ...order, status: 'cancelled' }
      : order));
  }, []);
  const value = useMemo(() => ({ orders, createDemoOrder, cancelOrder }), [orders, createDemoOrder, cancelOrder]);
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const value = useContext(OrderContext);
  if (!value) throw new Error('useOrders must be used within <OrderProvider>.');
  return value;
}
