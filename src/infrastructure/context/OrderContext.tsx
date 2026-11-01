// Improvement 4

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CheckoutInput, CheckoutLine, Order } from '@/domain/entities/Order';
import type { OrderUpdate } from '@/domain/repositories/IOrderRepository';
import type { User } from '@/domain/entities/User';
import { orderRepository } from '@/infrastructure/container';
import { useToast } from '@/infrastructure/context/ToastContext';
import { generateId } from '@/shared/utils/generateId';

interface OrderContextValue {
  orders: Order[];
  unreadOrderCount: (userId: string) => number;
  markOrdersRead: (userId: string) => void;
  checkoutOrder: (user: User, lines: CheckoutLine[], address: CheckoutInput) => Promise<Order>;
  updateOrder: (orderId: string, userId: string, changes: OrderUpdate) => Promise<Order>;
  cancelOrder: (orderId: string, userId: string) => Promise<Order>;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [unreadOrderIds, setUnreadOrderIds] = useState<Record<string, string[]>>({});
  const { show } = useToast();

  useEffect(() => {
    let active = true;
    orderRepository.list().then((storedOrders) => {
      if (active) setOrders(storedOrders);
    }).catch(() => {
      if (active) show('No se pudieron cargar los pedidos.', 'error');
    });
    return () => { active = false; };
  }, [show]);

  const unreadOrderCount = useCallback((userId: string) => unreadOrderIds[userId]?.length ?? 0, [unreadOrderIds]);
  const markOrdersRead = useCallback((userId: string) => {
    setUnreadOrderIds((current) => ({ ...current, [userId]: [] }));
  }, []);

  const checkoutOrder = useCallback(async (user: User, lines: CheckoutLine[], input: CheckoutInput) => {
    if (lines.length === 0) throw new Error('No se puede crear un pedido sin productos.');

    const currency = lines[0].product.currency;
    if (lines.some(({ product, quantity }) =>
      !product.isActive
      || !Number.isSafeInteger(quantity)
      || quantity <= 0
      || quantity > product.stockQuantity
      || !Number.isFinite(product.price)
      || product.price < 0
      || product.currency !== currency
    )) {
      throw new Error('Revisa los productos, cantidades y precios antes de confirmar el pedido.');
    }

    const order = await orderRepository.checkout({
      userId: user.id,
      shippingAddress: {
        id: generateId('adr'),
        userId: user.id,
        recipient: input.recipient.trim(),
        phone: input.phone.trim(),
        line1: input.line1.trim(),
        city: input.city.trim(),
        region: input.region.trim() || undefined,
        postalCode: input.postalCode.trim() || undefined,
        countryCode: input.countryCode.trim().toUpperCase(),
      },
      currency,
      items: lines.map(({ product, quantity }) => ({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice: product.price,
      })),
    });
    setOrders((current) => [order, ...current]);
    setUnreadOrderIds((current) => ({ ...current, [user.id]: [order.id, ...(current[user.id] ?? [])] }));
    return order;
  }, []);

  const updateOrder = useCallback(async (orderId: string, userId: string, changes: OrderUpdate) => {
    const order = await orderRepository.update(orderId, userId, changes);
    setOrders((current) => current.map((item) => item.id === order.id ? order : item));
    return order;
  }, []);

  const cancelOrder = useCallback(async (orderId: string, userId: string) => {
    const order = await orderRepository.delete(orderId, userId);
    setOrders((current) => current.map((item) => item.id === order.id ? order : item));
    return order;
  }, []);

  const value = useMemo(
    () => ({ orders, unreadOrderCount, markOrdersRead, checkoutOrder, updateOrder, cancelOrder }),
    [orders, unreadOrderCount, markOrdersRead, checkoutOrder, updateOrder, cancelOrder],
  );
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const value = useContext(OrderContext);
  if (!value) throw new Error('useOrders must be used within <OrderProvider>.');
  return value;
}
