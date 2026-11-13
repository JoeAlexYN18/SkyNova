import type { Order, OrderPaymentDetails, ShippingAddressSnapshot } from '@/domain/entities/Order';
import type { IOrderRepository, NewOrderInput, OrderUpdate } from '@/domain/repositories/IOrderRepository';
import { getDatabase, withDatabaseTransaction } from '@/infrastructure/data/sqliteDatabase';
import { generateId } from '@/shared/utils/generateId';
import { getOrdersFromFirebase } from '@/infrastructure/data/firebaseDataSync';

type OrderRow = {
  id: string;
  user_id: string;
  shipping_address_id: string;
  recipient: string;
  phone: string;
  line1: string;
  city: string;
  region: string | null;
  postal_code: string | null;
  country_code: string;
  status: Order['status'];
  sync_status: NonNullable<Order['syncStatus']>;
  sync_error: string | null;
  receipt_local_uri: string | null;
  receipt_storage_path: string | null;
  payment_method: Order['paymentMethod'] | null;
  payment_details: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  product_id: string | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
};

export class SqliteOrderRepository implements IOrderRepository {
  async getDefaultAddress(userId: string, onSyncError?: (error: unknown) => void): Promise<ShippingAddressSnapshot | null> {
    const database = await getDatabase();
    let cloudOrders: Order[] = [];
    try {
      cloudOrders = await getOrdersFromFirebase(userId);
    } catch (error) {
      onSyncError?.(error);
    }
    for (const order of cloudOrders) await this.cacheOrder(order);
    const latestCloudOrder = cloudOrders.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    )[0];
    const hasLocalDefault = await database.getFirstAsync<{ id: string }>(
      'SELECT id FROM addresses WHERE user_id = ? AND is_default = 1',
      userId,
    );
    if (latestCloudOrder && !hasLocalDefault) {
      await this.saveAddress(latestCloudOrder.shippingAddress, true);
    }
    const row = await database.getFirstAsync<{
      id: string;
      user_id: string;
      recipient: string;
      phone: string;
      line1: string;
      city: string;
      region: string | null;
      postal_code: string | null;
      country_code: string;
    }>(
      `SELECT id, user_id, recipient, phone, line1, city, region, postal_code, country_code
       FROM addresses WHERE user_id = ? AND is_default = 1`,
      userId,
    );
    return row ? {
      id: row.id,
      userId: row.user_id,
      recipient: row.recipient,
      phone: row.phone,
      line1: row.line1,
      city: row.city,
      region: row.region ?? undefined,
      postalCode: row.postal_code ?? undefined,
      countryCode: row.country_code,
    } : null;
  }

  async list(userId: string, onSyncError?: (error: unknown) => void) {
    let cloudOrders: Order[] = [];
    try {
      cloudOrders = await getOrdersFromFirebase(userId);
    } catch (error) {
      onSyncError?.(error);
    }
    for (const order of cloudOrders) await this.cacheOrder(order);
    const database = await getDatabase();
    const rows = await database.getAllAsync<OrderRow>(
      `SELECT o.*, a.recipient, a.phone, a.line1, a.city, a.region, a.postal_code, a.country_code
       FROM orders o JOIN addresses a ON a.id = o.shipping_address_id AND a.user_id = o.user_id
       WHERE o.user_id = ? ORDER BY o.created_at DESC`,
      userId,
    );
    const orders: Order[] = [];
    for (const row of rows) {
      const itemRows = await database.getAllAsync<OrderItemRow>(
        'SELECT product_id, product_name, sku, quantity, unit_price FROM order_items WHERE order_id = ? ORDER BY id',
        row.id,
      );
      orders.push({
        id: row.id,
        userId: row.user_id,
        shippingAddress: {
          id: row.shipping_address_id,
          userId: row.user_id,
          recipient: row.recipient,
          phone: row.phone,
          line1: row.line1,
          city: row.city,
          region: row.region ?? undefined,
          postalCode: row.postal_code ?? undefined,
          countryCode: row.country_code,
        },
        status: row.status,
        syncStatus: row.sync_status,
        syncError: row.sync_error ?? undefined,
        receiptLocalUri: row.receipt_local_uri ?? undefined,
        receiptStoragePath: row.receipt_storage_path ?? undefined,
        paymentMethod: row.payment_method ?? undefined,
        paymentDetails: parsePaymentDetails(row.payment_details),
        currency: row.currency,
        items: itemRows.map((item) => ({
          productId: item.product_id,
          productName: item.product_name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unit_price,
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }
    return orders;
  }

  async create(input: NewOrderInput) {
    validateInput(input);
    return this.persist(input, 'pending', true);
  }

  async checkout(input: NewOrderInput) {
    validateInput(input);
    return this.persist(input, 'paid', true);
  }

  async update(orderId: string, userId: string, changes: OrderUpdate) {
    const database = await getDatabase();
    const order = await database.getFirstAsync<{ status: Order['status'] }>(
      'SELECT status FROM orders WHERE id = ? AND user_id = ?',
      orderId,
      userId,
    );
    if (!order) throw new Error('No se encontró el pedido.');
    if (order.status !== 'pending' && order.status !== 'paid') {
      throw new Error('Este pedido ya no se puede editar.');
    }
    if (changes.shippingAddress.userId !== userId) {
      throw new Error('La dirección debe pertenecer al titular del pedido.');
    }
    validateAddress(changes.shippingAddress);
    const address = { ...changes.shippingAddress, id: generateId('adr') };
    const now = new Date().toISOString();
    await withDatabaseTransaction(database, async () => {
      await this.ensureUser({ userId });
      await this.saveAddress(address, true);
      await database.runAsync(
        "UPDATE orders SET shipping_address_id = ?, updated_at = ?, sync_status = 'pending', sync_error = NULL WHERE id = ? AND user_id = ?",
        address.id,
        now,
        orderId,
        userId,
      );
    });
    const updated = (await this.list(userId)).find((candidate) => candidate.id === orderId);
    if (!updated) throw new Error('No se pudo recuperar el pedido actualizado.');
    return updated;
  }

  async delete(orderId: string, userId: string) {
    const database = await getDatabase();
    let updatedAt = '';
    await withDatabaseTransaction(database, async () => {
      const order = await database.getFirstAsync<{ status: Order['status'] }>(
        'SELECT status FROM orders WHERE id = ? AND user_id = ?',
        orderId,
        userId,
      );
      if (!order) throw new Error('No se encontró el pedido.');
      if (order.status !== 'pending' && order.status !== 'paid') {
        throw new Error('Este pedido ya no se puede cancelar.');
      }
      const items = await database.getAllAsync<{ product_id: string | null; quantity: number }>(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        orderId,
      );
      for (const item of items) {
        if (item.product_id) {
          await database.runAsync(
            'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?',
            item.quantity,
            new Date().toISOString(),
            item.product_id,
          );
        }
      }
      updatedAt = new Date().toISOString();
      await database.runAsync(
        "UPDATE orders SET status = 'cancelled', updated_at = ?, sync_status = 'pending', sync_error = NULL WHERE id = ? AND user_id = ?",
        updatedAt,
        orderId,
        userId,
      );
    });
    const cancelled = (await this.list(userId)).find((candidate) => candidate.id === orderId);
    if (!cancelled) throw new Error('No se pudo recuperar el pedido cancelado.');
    return cancelled;
  }

  async attachReceipt(orderId: string, userId: string, localUri: string) {
    const database = await getDatabase();
    const result = await database.runAsync(
      "UPDATE orders SET receipt_local_uri = ?, receipt_storage_path = NULL, sync_status = 'pending', sync_error = NULL, updated_at = ? WHERE id = ? AND user_id = ?",
      localUri,
      new Date().toISOString(),
      orderId,
      userId,
    );
    if (result.changes === 0) throw new Error('No se encontró el pedido para adjuntar el comprobante.');
    const order = (await this.list(userId)).find((candidate) => candidate.id === orderId);
    if (!order) throw new Error('No se pudo recuperar el pedido actualizado.');
    return order;
  }

  async markOrderSynced(orderId: string, userId: string, updatedAt: string, receiptStoragePath?: string) {
    const database = await getDatabase();
    await database.runAsync(
      "UPDATE orders SET sync_status = 'synced', sync_error = NULL, receipt_storage_path = COALESCE(?, receipt_storage_path) WHERE id = ? AND user_id = ? AND updated_at = ?",
      receiptStoragePath ?? null,
      orderId,
      userId,
      updatedAt,
    );
  }

  async markOrderSyncError(orderId: string, userId: string, message: string) {
    const database = await getDatabase();
    await database.runAsync(
      "UPDATE orders SET sync_status = 'error', sync_error = ? WHERE id = ? AND user_id = ?",
      message.slice(0, 500),
      orderId,
      userId,
    );
  }

  private async persist(input: NewOrderInput, status: Order['status'], reserveStock: boolean) {
    const database = await getDatabase();
    const now = new Date().toISOString();
    const order: Order = {
      id: generateId('ord'),
      userId: input.userId,
      shippingAddress: { ...input.shippingAddress },
      status,
      paymentMethod: input.paymentMethod,
      paymentDetails: input.paymentDetails ? { ...input.paymentDetails } : undefined,
      syncStatus: 'pending',
      currency: input.currency,
      items: input.items.map((item) => ({ ...item })),
      createdAt: now,
      updatedAt: now,
    };

    await withDatabaseTransaction(database, async () => {
      await this.ensureUser(input);
      await this.saveAddress(input.shippingAddress, true);
      if (reserveStock) {
        for (const item of input.items) {
          if (!item.productId) throw new Error('No se encontró el producto solicitado.');
          const product = await database.getFirstAsync<{ stock_quantity: number; is_active: number }>(
            'SELECT stock_quantity, is_active FROM products WHERE id = ?',
            item.productId,
          );
          if (!product || product.is_active !== 1 || product.stock_quantity < item.quantity) {
            throw new Error(`Stock insuficiente para ${item.productName}.`);
          }
          await database.runAsync(
            'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?',
            item.quantity,
            now,
            item.productId,
          );
        }
      }
      await database.runAsync(
        `INSERT INTO orders (id, user_id, shipping_address_id, status, payment_method, payment_details, currency, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        order.id,
        order.userId,
        order.shippingAddress.id,
        order.status,
        order.paymentMethod ?? null,
        serializePaymentDetails(order.paymentDetails),
        order.currency,
        now,
        now,
      );
      for (const item of order.items) {
        await database.runAsync(
          `INSERT INTO order_items (id, order_id, product_id, product_name, sku, quantity, unit_price)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          generateId('itm'),
          order.id,
          item.productId,
          item.productName,
          item.sku,
          item.quantity,
          item.unitPrice,
        );
      }
    });
    return order;
  }

  private async ensureUser(input: Pick<NewOrderInput, 'userId' | 'user'>) {
    const database = await getDatabase();
    if (input.user) {
      await database.runAsync(
        `INSERT INTO users (id, full_name, email, phone_country, phone_dial_code, phone_number)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET full_name = excluded.full_name, email = excluded.email,
           phone_country = excluded.phone_country,
           phone_dial_code = excluded.phone_dial_code, phone_number = excluded.phone_number,
           updated_at = ?`,
        input.user.id,
        input.user.fullName,
        input.user.email,
        input.user.phone.countryCode,
        input.user.phone.dialCode,
        input.user.phone.number,
        new Date().toISOString(),
      );
      return;
    }
    await database.runAsync(
      `INSERT OR IGNORE INTO users (id, full_name, email, phone_country, phone_dial_code, phone_number)
       VALUES (?, 'Cliente SkyNova', ?, 'ZZ', '+0', '0000')`,
      input.userId,
      `${input.userId}@local.skynova.invalid`,
    );
  }

  async syncDefaultAddressContact(
    userId: string,
    previous: { recipient: string; phone: string; countryCode: string },
    next: { recipient: string; phone: string; countryCode: string },
  ) {
    const database = await getDatabase();
    await database.runAsync(
      `UPDATE addresses SET
         recipient = CASE WHEN recipient = ? THEN ? ELSE recipient END,
         phone = CASE WHEN phone = ? THEN ? ELSE phone END,
         country_code = CASE WHEN country_code = ? THEN ? ELSE country_code END
       WHERE user_id = ? AND is_default = 1`,
      previous.recipient,
      next.recipient,
      previous.phone,
      next.phone,
      previous.countryCode,
      next.countryCode,
      userId,
    );
  }

  private async saveAddress(address: ShippingAddressSnapshot, makeDefault: boolean) {
    const database = await getDatabase();
    if (makeDefault) {
      await database.runAsync('UPDATE addresses SET is_default = 0 WHERE user_id = ?', address.userId);
    }
    await database.runAsync(
      `INSERT INTO addresses
        (id, user_id, recipient, phone, line1, city, region, postal_code, country_code, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET recipient = excluded.recipient, phone = excluded.phone,
         line1 = excluded.line1, city = excluded.city, region = excluded.region,
         postal_code = excluded.postal_code, country_code = excluded.country_code,
         is_default = excluded.is_default`,
      address.id,
      address.userId,
      address.recipient.trim(),
      address.phone.trim(),
      address.line1.trim(),
      address.city.trim(),
      address.region?.trim() || null,
      address.postalCode?.trim() || null,
      address.countryCode.toUpperCase(),
      makeDefault ? 1 : 0,
    );
  }

  private async cacheOrder(order: Order) {
    const database = await getDatabase();
    await withDatabaseTransaction(database, async () => {
      const localOrder = await database.getFirstAsync<{ sync_status: string }>(
        'SELECT sync_status FROM orders WHERE id = ? AND user_id = ?',
        order.id,
        order.userId,
      );
      if (localOrder && localOrder.sync_status !== 'synced') return;
      await this.ensureUser({ userId: order.userId });
      await this.saveAddress(order.shippingAddress, false);
      await database.runAsync(
        `INSERT INTO orders
          (id, user_id, shipping_address_id, status, sync_status, payment_method, payment_details, currency, receipt_storage_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'synced', ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET shipping_address_id = excluded.shipping_address_id,
           status = excluded.status, payment_method = excluded.payment_method,
           payment_details = COALESCE(excluded.payment_details, orders.payment_details),
           currency = excluded.currency, updated_at = excluded.updated_at,
           sync_status = 'synced', sync_error = NULL, receipt_storage_path = excluded.receipt_storage_path
         WHERE orders.sync_status = 'synced'`,
        order.id,
        order.userId,
        order.shippingAddress.id,
        order.status,
        order.paymentMethod ?? null,
        serializePaymentDetails(order.paymentDetails),
        order.currency,
        order.receiptStoragePath ?? null,
        order.createdAt,
        order.updatedAt,
      );
      await database.runAsync('DELETE FROM order_items WHERE order_id = ?', order.id);
      for (const item of order.items) {
        const product = item.productId
          ? await database.getFirstAsync<{ id: string }>('SELECT id FROM products WHERE id = ?', item.productId)
          : null;
        await database.runAsync(
          `INSERT INTO order_items (id, order_id, product_id, product_name, sku, quantity, unit_price)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          generateId('itm'),
          order.id,
          product?.id ?? null,
          item.productName,
          item.sku,
          item.quantity,
          item.unitPrice,
        );
      }
    });
  }
}

function serializePaymentDetails(details: OrderPaymentDetails | undefined) {
  if (!details) return null;
  const clean: OrderPaymentDetails = {};
  if (details.phone?.trim()) clean.phone = details.phone.trim();
  if (details.cardholderName?.trim()) clean.cardholderName = details.cardholderName.trim();
  if (details.cardBrand) clean.cardBrand = details.cardBrand;
  if (details.cardLast4 && /^\d{4}$/.test(details.cardLast4)) clean.cardLast4 = details.cardLast4;
  if (details.cardExpiry && /^\d{2}\/\d{2}$/.test(details.cardExpiry)) clean.cardExpiry = details.cardExpiry;
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
}

function parsePaymentDetails(value: string | null): OrderPaymentDetails | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const details = parsed as Record<string, unknown>;
    const result: OrderPaymentDetails = {};
    if (typeof details.phone === 'string' && details.phone.trim()) result.phone = details.phone;
    if (typeof details.cardholderName === 'string' && details.cardholderName.trim()) result.cardholderName = details.cardholderName;
    if (details.cardBrand === 'visa' || details.cardBrand === 'mastercard' || details.cardBrand === 'amex'
      || details.cardBrand === 'discover' || details.cardBrand === 'other') result.cardBrand = details.cardBrand;
    if (typeof details.cardLast4 === 'string' && /^\d{4}$/.test(details.cardLast4)) result.cardLast4 = details.cardLast4;
    if (typeof details.cardExpiry === 'string' && /^\d{2}\/\d{2}$/.test(details.cardExpiry)) result.cardExpiry = details.cardExpiry;
    return Object.keys(result).length ? result : undefined;
  } catch {
    return undefined;
  }
}

function validateInput(input: NewOrderInput) {
  if (!input.items.length) throw new Error('No se puede crear un pedido sin productos.');
  if (input.paymentMethod !== undefined && input.paymentMethod !== 'yape' && input.paymentMethod !== 'visa') {
    throw new Error('El método de pago no es válido.');
  }
  if (input.paymentMethod === 'yape' && (input.shippingAddress.countryCode ?? '').toUpperCase() !== 'PE') {
    throw new Error('Yape solo está disponible para pedidos con entrega en Perú.');
  }
  if (input.paymentMethod === 'yape' && !input.paymentDetails?.phone?.trim()) {
    throw new Error('Falta el número de Yape para completar el pago.');
  }
  if (input.paymentMethod === 'visa') {
    const details = input.paymentDetails;
    if (!details?.cardholderName?.trim() || !details.cardLast4 || !details.cardExpiry) {
      throw new Error('Faltan los datos de la tarjeta para completar el pago.');
    }
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('La moneda del pedido no es válida.');
  if (input.shippingAddress.userId !== input.userId) {
    throw new Error('La dirección debe pertenecer al titular del pedido.');
  }
  validateAddress(input.shippingAddress);
  const skus = new Set<string>();
  for (const item of input.items) {
    if (skus.has(item.sku.trim().toLowerCase())) throw new Error('El pedido contiene productos duplicados.');
    if (!item.productId?.trim() || !item.productName.trim() || !item.sku.trim()
      || !Number.isSafeInteger(item.quantity) || item.quantity <= 0
      || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error('Los productos del pedido tienen datos inválidos.');
    }
    skus.add(item.sku.trim().toLowerCase());
  }
}

function validateAddress(address: ShippingAddressSnapshot) {
  const requiredValues = [address.recipient, address.phone, address.line1, address.city];
  if (requiredValues.some((value) => !value?.trim()) || !/^[A-Z]{2}$/.test(address.countryCode)) {
    throw new Error('Completa los datos de entrega obligatorios.');
  }
}
