// Improvement 4

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Network from 'expo-network';
import type { CheckoutInput, CheckoutLine, Order, OrderPaymentDetails, PaymentMethod, ShippingAddressSnapshot } from '@/domain/entities/Order';
import type { OrderUpdate } from '@/domain/repositories/IOrderRepository';
import type { User } from '@/domain/entities/User';
import { orderRepository } from '@/infrastructure/container';
import { useToast } from '@/infrastructure/context/ToastContext';
import { generateId } from '@/shared/utils/generateId';
import { useAuth } from '@/infrastructure/context/AuthContext';
import { orderSyncConfigured, syncOrderToServices } from '@/infrastructure/data/orderSyncService';
import { isAuthSessionError, isExpectedSyncError } from '@/infrastructure/data/firebaseDataSync';

interface OrderContextValue {
  orders: Order[];
  unreadOrderCount: (userId: string) => number;
  markOrdersRead: (userId: string) => void;
  forgetUserData: (userId: string) => void;
  getDefaultAddress: (userId: string) => Promise<ShippingAddressSnapshot | null>;
  checkoutOrder: (user: User, lines: CheckoutLine[], address: CheckoutInput, paymentMethod: PaymentMethod, paymentDetails: OrderPaymentDetails) => Promise<Order>;
  updateOrder: (orderId: string, userId: string, changes: OrderUpdate) => Promise<Order>;
  cancelOrder: (orderId: string, userId: string) => Promise<Order>;
  retryOrderSync: (userId: string) => Promise<boolean>;
  orderSyncEnabled: boolean;
  ordersLoaded: boolean;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadedOrdersUserId, setLoadedOrdersUserId] = useState<string | null>(null);
  const [unreadOrderIds, setUnreadOrderIds] = useState<Record<string, string[]>>({});
  const syncingUsers = useRef(new Set<string>());
  const syncRequestedUsers = useRef(new Set<string>());
  const retryOrderSyncRef = useRef<(userId: string) => Promise<boolean>>(async () => false);
  const { show } = useToast();
  const { currentUser } = useAuth();
  const previousProfileRef = useRef<{
    userId: string;
    fullName: string;
    phone: string;
    countryCode: string;
  } | null>(null);
  useEffect(() => {
    const snapshot = currentUser ? {
      userId: currentUser.id,
      fullName: currentUser.fullName,
      phone: `${currentUser.phone.dialCode} ${currentUser.phone.number}`,
      countryCode: currentUser.phone.countryCode,
    } : null;
    const previous = previousProfileRef.current;
    previousProfileRef.current = snapshot;
    if (!currentUser || !snapshot || !previous || previous.userId !== snapshot.userId) return;
    if (previous.fullName === snapshot.fullName
      && previous.phone === snapshot.phone
      && previous.countryCode === snapshot.countryCode) return;
    void orderRepository.syncDefaultAddressContact(
      currentUser.id,
      { recipient: previous.fullName, phone: previous.phone, countryCode: previous.countryCode },
      { recipient: snapshot.fullName, phone: snapshot.phone, countryCode: snapshot.countryCode },
    ).catch(() => {});
  }, [currentUser]);

  const visibleOrders = useMemo(
    () => currentUser ? orders.filter((order) => order.userId === currentUser.id) : [],
    [currentUser, orders],
  );

  const unreadOrderCount = useCallback((userId: string) => unreadOrderIds[userId]?.length ?? 0, [unreadOrderIds]);
  const forgetUserData = useCallback((userId: string) => {
    setOrders((current) => current.filter((order) => order.userId !== userId));
    setUnreadOrderIds((current) => {
      const remaining = { ...current };
      delete remaining[userId];
      return remaining;
    });
  }, []);
  const markOrdersRead = useCallback((userId: string) => {
    setUnreadOrderIds((current) => ({ ...current, [userId]: [] }));
  }, []);
  const getDefaultAddress = useCallback((userId: string) => orderRepository.getDefaultAddress(userId, (error) => {
    if (isExpectedSyncError(error, userId)) return;
    show('No se pudo sincronizar la dirección; se usará la copia local.', 'info');
  }), [show]);

  const retryOrderSync = useCallback(async (userId: string) => {
    if (!orderSyncConfigured) return false;
    if (syncingUsers.current.has(userId)) {
      syncRequestedUsers.current.add(userId);
      return false;
    }
    syncingUsers.current.add(userId);
    try {
      const state = await Network.getNetworkStateAsync();
      if (!state.isConnected || state.isInternetReachable === false) return false;
      const storedOrders = await orderRepository.list(userId);
      for (const order of storedOrders) {
        if (order.syncStatus === 'synced') continue;
        try {
          await syncOrderToServices(order);
          await orderRepository.markOrderSynced(order.id, userId, order.updatedAt);
        } catch (error) {
          if (isAuthSessionError(error, userId)) break;
          const message = error instanceof Error ? error.message : 'No se pudo sincronizar el pedido.';
          await orderRepository.markOrderSyncError(order.id, userId, message);
        }
      }
      const refreshedOrders = await orderRepository.list(userId);
      setOrders((current) => [
        ...current.filter((order) => order.userId !== userId),
        ...refreshedOrders,
      ]);
      return refreshedOrders.every((order) => order.syncStatus === 'synced');
    } catch {
      return false;
    } finally {
      syncingUsers.current.delete(userId);
      if (syncRequestedUsers.current.delete(userId)) {
        void Promise.resolve().then(() => retryOrderSyncRef.current(userId));
      }
    }
  }, []);

  useEffect(() => {
    retryOrderSyncRef.current = retryOrderSync;
  }, [retryOrderSync]);

  const currentUserId = currentUser?.id ?? null;
  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    const userId = currentUserId;
    void orderRepository.list(userId, (error) => {
      if (active && !isExpectedSyncError(error, userId)) {
        show('Pedidos guardados en el dispositivo; no se pudieron sincronizar. Se reintentará automáticamente.', 'info');
      }
    }).then((storedOrders) => {
      if (active) {
        setOrders((current) => [
          ...current.filter((order) => order.userId !== userId),
          ...storedOrders,
        ]);
        void retryOrderSync(userId);
      }
    }).catch((error: unknown) => {
      if (active && !isExpectedSyncError(error, userId)) show('No se pudieron cargar los pedidos.', 'error');
    }).finally(() => {
      if (active) setLoadedOrdersUserId(userId);
    });
    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void retryOrderSync(userId);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [currentUserId, retryOrderSync, show]);

  const checkoutOrder = useCallback(async (user: User, lines: CheckoutLine[], input: CheckoutInput, paymentMethod: PaymentMethod, paymentDetails: OrderPaymentDetails) => {
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
      user,
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
      paymentMethod,
      paymentDetails,
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
    void retryOrderSync(user.id);
    return order;
  }, [retryOrderSync]);

  const updateOrder = useCallback(async (orderId: string, userId: string, changes: OrderUpdate) => {
    const order = await orderRepository.update(orderId, userId, changes);
    setOrders((current) => current.map((item) => item.id === order.id ? order : item));
    void retryOrderSync(userId);
    return order;
  }, [retryOrderSync]);

  const cancelOrder = useCallback(async (orderId: string, userId: string) => {
    const order = await orderRepository.delete(orderId, userId);
    setOrders((current) => current.map((item) => item.id === order.id ? order : item));
    void retryOrderSync(userId);
    return order;
  }, [retryOrderSync]);

  const ordersLoaded = loadedOrdersUserId !== null && loadedOrdersUserId === currentUser?.id;
  const value = useMemo(
    () => ({ orders: visibleOrders, unreadOrderCount, markOrdersRead, forgetUserData, getDefaultAddress, checkoutOrder, updateOrder, cancelOrder, retryOrderSync, orderSyncEnabled: orderSyncConfigured, ordersLoaded }),
    [visibleOrders, unreadOrderCount, markOrdersRead, forgetUserData, getDefaultAddress, checkoutOrder, updateOrder, cancelOrder, retryOrderSync, ordersLoaded],
  );
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const value = useContext(OrderContext);
  if (!value) throw new Error('useOrders must be used within <OrderProvider>.');
  return value;
}
