import type { Order } from '@/domain/entities/Order';

type CatalogRecord = { id: string; [field: string]: unknown };
export interface RestCatalog {
  categories: CatalogRecord[];
  products: CatalogRecord[];
  specs: CatalogRecord[];
  images: CatalogRecord[];
}

const apiBaseUrl = process.env.EXPO_PUBLIC_SKYNOVA_API_URL?.trim().replace(/\/+$/, '');
export const restApiConfigured = Boolean(apiBaseUrl);

export async function getCatalogFromRest(): Promise<RestCatalog | null> {
  if (!apiBaseUrl) return null;
  const response = await fetch(`${apiBaseUrl}/catalog`);
  if (!response.ok) throw new Error(`El servicio REST respondió con estado ${response.status}.`);
  const value: unknown = await response.json();
  if (!isCatalog(value)) throw new Error('El servicio REST devolvió un catálogo con formato inválido.');
  return value;
}

export async function syncOrderToRest(order: Order) {
  if (!apiBaseUrl) return;
  const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(order.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: order.id,
      user_id: order.userId,
      shipping_address: {
        recipient: order.shippingAddress.recipient,
        phone: order.shippingAddress.phone,
        line1: order.shippingAddress.line1,
        city: order.shippingAddress.city,
        region: order.shippingAddress.region ?? null,
        postal_code: order.shippingAddress.postalCode ?? null,
        country_code: order.shippingAddress.countryCode,
      },
      items: order.items.map((item) => ({
        product_id: item.productId,
        product_name: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
      status: order.status,
      payment_method: order.paymentMethod ?? null,
      payment_details: order.paymentDetails ?? null,
      currency: order.currency,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    }),
  });
  if (!response.ok) throw new Error(`El servicio REST no pudo sincronizar el pedido (${response.status}).`);
}

function isCatalog(value: unknown): value is RestCatalog {
  if (typeof value !== 'object' || value === null) return false;
  const catalog = value as Record<string, unknown>;
  return ['categories', 'products', 'specs', 'images'].every((key) =>
    Array.isArray(catalog[key])
    && (catalog[key] as unknown[]).every((record) =>
      typeof record === 'object'
      && record !== null
      && 'id' in record
      && typeof record.id === 'string',
    ),
  );
}
