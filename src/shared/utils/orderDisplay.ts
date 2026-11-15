import type { Order } from '@/domain/entities/Order';

export type OrderSyncState = 'pending' | 'error' | 'synced';
export type OrderDisplayTone = 'warning' | 'danger' | 'success' | 'info' | 'primary' | 'muted';

export interface OrderDisplayState {
  label: string;
  tone: OrderDisplayTone;
}

export function getOrderSyncState(order: Order, syncEnabled = true): OrderSyncState {
  if (!syncEnabled) return 'synced';
  return order.syncStatus === 'pending' || order.syncStatus === 'error' ? order.syncStatus : 'synced';
}

export function getOrderDisplayState(order: Order, syncEnabled = true): OrderDisplayState {
  const syncState = getOrderSyncState(order, syncEnabled);
  const isCancelled = order.status === 'cancelled';
  if (syncState === 'pending') {
    return isCancelled
      ? { label: 'Cancelación por confirmar', tone: 'warning' }
      : { label: 'Pendiente de confirmación', tone: 'warning' };
  }
  if (syncState === 'error') {
    return isCancelled
      ? { label: 'Error al confirmar cancelación', tone: 'danger' }
      : { label: 'Error al confirmar', tone: 'danger' };
  }
  switch (order.status) {
    case 'pending': return { label: 'Pendiente', tone: 'warning' };
    case 'paid': return { label: 'Confirmado', tone: 'success' };
    case 'shipped': return { label: 'Enviado', tone: 'info' };
    case 'delivered': return { label: 'Entregado', tone: 'primary' };
    case 'cancelled': return { label: 'Cancelado', tone: 'muted' };
  }
}

export interface GroupedOrders {
  all: Order[];
  needsAttention: Order[];
  active: Order[];
  delivered: Order[];
  cancelled: Order[];
}

export function groupOrders(orders: Order[], syncEnabled = true): GroupedOrders {
  const all = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const grouped: GroupedOrders = { all, needsAttention: [], active: [], delivered: [], cancelled: [] };
  for (const order of all) {
    if (getOrderSyncState(order, syncEnabled) !== 'synced') grouped.needsAttention.push(order);
    else if (order.status === 'delivered') grouped.delivered.push(order);
    else if (order.status === 'cancelled') grouped.cancelled.push(order);
    else grouped.active.push(order);
  }
  return grouped;
}
