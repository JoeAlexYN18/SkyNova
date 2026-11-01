import type { Order } from '@/domain/entities/Order';
import type { IOrderRepository, NewOrderInput, OrderUpdate } from '@/domain/repositories/IOrderRepository';
import { generateId } from '@/shared/utils/generateId';

export class InMemoryOrderRepository implements IOrderRepository {
  private orders: Order[] = [];

  async list() {
    return this.orders.map(cloneOrder);
  }

  async create(input: NewOrderInput) {
    validateItems(input);
    validateShippingAddress(input);
    const order = this.buildOrder(input);
    this.orders = [order, ...this.orders];
    return cloneOrder(order);
  }

  async checkout(input: NewOrderInput) {
    validateItems(input);
    validateShippingAddress(input);
    const pendingOrder = this.buildOrder(input);
    const paidOrder: Order = { ...pendingOrder, status: 'paid', updatedAt: new Date().toISOString() };
    this.orders = [paidOrder, ...this.orders];
    return cloneOrder(paidOrder);
  }

  async update(orderId: string, userId: string, changes: OrderUpdate) {
    const order = this.getOwnedOrder(orderId, userId);
    if (order.status !== 'pending' && order.status !== 'paid') {
      throw new Error('Este pedido ya no se puede editar.');
    }
    if (changes.shippingAddress.userId !== userId) {
      throw new Error('La dirección debe pertenecer al usuario del pedido.');
    }
    validateRequiredAddress(changes.shippingAddress);

    const updated: Order = {
      ...order,
      shippingAddress: { ...changes.shippingAddress },
      updatedAt: new Date().toISOString(),
    };
    this.replaceOrder(updated);
    return cloneOrder(updated);
  }

  async delete(orderId: string, userId: string) {
    const order = this.getOwnedOrder(orderId, userId);
    if (order.status !== 'pending' && order.status !== 'paid') {
      throw new Error('Este pedido ya no se puede cancelar.');
    }

    const cancelled: Order = { ...order, status: 'cancelled', updatedAt: new Date().toISOString() };
    this.replaceOrder(cancelled);
    return cloneOrder(cancelled);
  }

  private getOwnedOrder(orderId: string, userId: string) {
    const order = this.orders.find((candidate) => candidate.id === orderId && candidate.userId === userId);
    if (!order) throw new Error('No se encontró el pedido.');
    return order;
  }

  private replaceOrder(updated: Order) {
    this.orders = this.orders.map((order) => order.id === updated.id ? updated : order);
  }

  private buildOrder(input: NewOrderInput): Order {
    const now = new Date().toISOString();
    return {
      id: generateId('ord'),
      userId: input.userId,
      shippingAddress: { ...input.shippingAddress },
      status: 'pending',
      currency: input.currency,
      items: input.items.map((item) => ({ ...item })),
      createdAt: now,
      updatedAt: now,
    };
  }
}

function validateItems(input: NewOrderInput) {
  if (input.items.length === 0) throw new Error('No se puede crear un pedido sin productos.');
  const skus = new Set<string>();
  for (const item of input.items) {
    if (skus.has(item.sku)) throw new Error('El pedido contiene productos duplicados.');
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.unitPrice < 0) {
      throw new Error('Los productos del pedido tienen datos inválidos.');
    }
    skus.add(item.sku);
  }
}

function validateShippingAddress(input: NewOrderInput) {
  if (input.shippingAddress.userId !== input.userId) {
    throw new Error('La dirección debe pertenecer al usuario del pedido.');
  }
  validateRequiredAddress(input.shippingAddress);
}

function validateRequiredAddress(address: NewOrderInput['shippingAddress']) {
  const requiredValues = [
    address.recipient,
    address.phone,
    address.line1,
    address.city,
    address.region,
    address.postalCode,
  ];
  if (requiredValues.some((value) => !value?.trim()) || !/^[A-Z]{2}$/.test(address.countryCode)) {
    throw new Error('Completa todos los datos de entrega obligatorios.');
  }
}

function cloneOrder(order: Order): Order {
  return {
    ...order,
    shippingAddress: { ...order.shippingAddress },
    items: order.items.map((item) => ({ ...item })),
  };
}
