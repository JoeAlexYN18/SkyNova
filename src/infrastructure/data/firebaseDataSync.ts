import { FirebaseError } from 'firebase/app';
import * as Network from 'expo-network';
import { doc, deleteDoc, getDoc, getDocs, collection, query, setDoc, where, writeBatch } from 'firebase/firestore';
import type { Order, OrderPaymentDetails, OrderStatus, ShippingAddressSnapshot } from '@/domain/entities/Order';
import type { ProductReview } from '@/domain/entities/Product';
import { firebaseConfigured, getFirebaseAuth, getFirebaseFirestore } from './firebaseServices';

type FirebaseCatalogRecord = { id: string; [field: string]: unknown };

export class AuthSessionError extends Error {
  constructor() {
    super('La sesión cambió antes de completar la sincronización con Firebase.');
    this.name = 'AuthSessionError';
  }
}

function requireFirebaseUser(userId: string) {
  if (getFirebaseAuth().currentUser?.uid !== userId) throw new AuthSessionError();
}

export async function hasNetworkConnection(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return !!state.isConnected && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export function isFirebaseNetworkError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';
  return code === 'auth/network-request-failed'
    || code === 'auth/unavailable'
    || code === 'auth/timeout'
    || code === 'firestore/unavailable'
    || code === 'unavailable';
}

export function isAuthSessionError(error: unknown, userId?: string): boolean {
  if (error instanceof AuthSessionError) return true;
  if (!(error instanceof FirebaseError)
    || (error.code !== 'permission-denied' && error.code !== 'unauthenticated')) return false;
  try {
    if (!firebaseConfigured) return true;
    const uid = getFirebaseAuth().currentUser?.uid;
    return !uid || (userId !== undefined && uid !== userId);
  } catch {
    return true;
  }
}

export async function syncCartToFirebase(userId: string, items: { productId: string; quantity: number }[]) {
  if (!firebaseConfigured || !(await hasNetworkConnection())) return;
  requireFirebaseUser(userId);
  const firestore = getFirebaseFirestore();
  const cartRef = doc(firestore, 'carts', userId);
  const current = await getDoc(cartRef);
  const now = new Date().toISOString();
  await setDoc(cartRef, {
    user_id: userId,
    items,
    created_at: current.exists() ? current.get('created_at') : now,
    updated_at: now,
  });
}

export async function getCartFromFirebase(userId: string) {
  if (!firebaseConfigured || !(await hasNetworkConnection())) return null;
  requireFirebaseUser(userId);
  const snapshot = await getDoc(doc(getFirebaseFirestore(), 'carts', userId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (!Array.isArray(data.items)) throw new Error('El carrito guardado en Firebase tiene un formato inválido.');
  const items = data.items.map((item: unknown) => {
    if (
      typeof item !== 'object'
      || item === null
      || !('productId' in item)
      || typeof item.productId !== 'string'
      || !('quantity' in item)
      || typeof item.quantity !== 'number'
      || !Number.isSafeInteger(item.quantity)
      || item.quantity <= 0
    ) {
      throw new Error('El carrito guardado en Firebase contiene un artículo inválido.');
    }
    return { productId: item.productId, quantity: item.quantity };
  });
  return {
    items,
    updatedAt: typeof data.updated_at === 'string' ? data.updated_at : undefined,
  };
}

export async function syncAddressToFirebase(address: ShippingAddressSnapshot) {
  if (!firebaseConfigured) return;
  requireFirebaseUser(address.userId);
  const firestore = getFirebaseFirestore();
  const addressRef = doc(firestore, 'addresses', address.id);
  const userAddresses = await getDocs(query(
    collection(firestore, 'addresses'),
    where('user_id', '==', address.userId),
  ));
  const current = userAddresses.docs.find((snapshot) => snapshot.id === address.id);
  const now = new Date().toISOString();
  const batch = writeBatch(firestore);
  userAddresses.docs.forEach((previousAddress) => {
    if (previousAddress.id !== address.id && previousAddress.get('is_default') === true) {
      batch.update(previousAddress.ref, { is_default: false });
    }
  });
  batch.set(addressRef, {
    id: address.id,
    user_id: address.userId,
    recipient: address.recipient,
    phone: address.phone,
    line1: address.line1,
    city: address.city,
    region: address.region ?? null,
    postal_code: address.postalCode ?? null,
    country_code: address.countryCode,
    is_default: true,
    created_at: current?.get('created_at') ?? now,
  });
  await batch.commit();
}

export async function syncOrderToFirebase(order: Order, receiptStoragePath = order.receiptStoragePath) {
  if (!firebaseConfigured) return;
  requireFirebaseUser(order.userId);
  const firestore = getFirebaseFirestore();
  await setDoc(doc(firestore, 'orders', order.id), {
    id: order.id,
    user_id: order.userId,
    shipping_address_id: order.shippingAddress.id,
    shipping_address: {
      recipient: order.shippingAddress.recipient,
      phone: order.shippingAddress.phone,
      line1: order.shippingAddress.line1,
      city: order.shippingAddress.city,
      region: order.shippingAddress.region ?? null,
      postal_code: order.shippingAddress.postalCode ?? null,
      country_code: order.shippingAddress.countryCode,
    },
    status: order.status,
    payment_method: order.paymentMethod ?? null,
    payment_details: order.paymentDetails ?? null,
    currency: order.currency,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    ...(receiptStoragePath ? { receipt_storage_path: receiptStoragePath } : {}),
    items: order.items.map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
  });
}

export async function syncReviewToFirebase(review: ProductReview) {
  if (!firebaseConfigured) return;
  requireFirebaseUser(review.userId);
  await setDoc(
    doc(getFirebaseFirestore(), 'product_reviews', `${review.productId}_${review.userId}`),
    {
      id: `${review.productId}_${review.userId}`,
      product_id: review.productId,
      user_id: review.userId,
      reviewer_name: review.reviewerName,
      rating: review.rating,
      review_text: review.reviewText ?? null,
      created_at: review.createdAt,
    },
  );
}

export async function deleteReviewFromFirebase(productId: string, userId: string) {
  if (!firebaseConfigured) return;
  requireFirebaseUser(userId);
  await deleteDoc(doc(getFirebaseFirestore(), 'product_reviews', `${productId}_${userId}`));
}

export async function getProductReviewsFromFirebase(productId: string) {
  if (!firebaseConfigured || !(await hasNetworkConnection())) return [];
  const snapshots = await getDocs(
    query(collection(getFirebaseFirestore(), 'product_reviews'), where('product_id', '==', productId)),
  );
  return snapshots.docs.map((snapshot) => mapReview(snapshot.id, snapshot.data()));
}

export async function getUserReviewsFromFirebase(userId: string) {
  if (!firebaseConfigured || !(await hasNetworkConnection())) return [];
  const snapshots = await getDocs(
    query(collection(getFirebaseFirestore(), 'product_reviews'), where('user_id', '==', userId)),
  );
  return snapshots.docs.map((snapshot) => mapReview(snapshot.id, snapshot.data()));
}

export async function getAllProductReviewsFromFirebase() {
  if (!firebaseConfigured || !(await hasNetworkConnection())) return [];
  const snapshots = await getDocs(collection(getFirebaseFirestore(), 'product_reviews'));
  return snapshots.docs.map((snapshot) => mapReview(snapshot.id, snapshot.data()));
}

export async function getCatalogFromFirebase(): Promise<{
  categories: FirebaseCatalogRecord[];
  products: FirebaseCatalogRecord[];
  specs: FirebaseCatalogRecord[];
  images: FirebaseCatalogRecord[];
} | null> {
  if (!firebaseConfigured) return null;
  const firestore = getFirebaseFirestore();
  const [categories, products, specs, images] = await Promise.all([
    getDocs(collection(firestore, 'categories')),
    getDocs(collection(firestore, 'products')),
    getDocs(collection(firestore, 'drone_specs')),
    getDocs(collection(firestore, 'product_images')),
  ]);
  return {
    categories: categories.docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id })),
    products: products.docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id })),
    specs: specs.docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id })),
    images: images.docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id })),
  };
}

function mapReview(id: string, data: Record<string, unknown>): ProductReview {
    if (
      typeof data.product_id !== 'string'
      || typeof data.user_id !== 'string'
      || typeof data.reviewer_name !== 'string'
      || typeof data.rating !== 'number'
      || !Number.isInteger(data.rating)
      || data.rating < 1
      || data.rating > 5
      || typeof data.created_at !== 'string'
    ) {
      throw new Error(`La reseña ${id} tiene un formato inválido en Firebase.`);
    }

    return {
      id: typeof data.id === 'string' ? data.id : id,
      productId: data.product_id,
      userId: data.user_id,
      reviewerName: data.reviewer_name,
      rating: data.rating,
      reviewText: typeof data.review_text === 'string' ? data.review_text : undefined,
      createdAt: data.created_at,
    };
}

export async function getOrdersFromFirebase(userId: string): Promise<Order[]> {
  if (!firebaseConfigured || !(await hasNetworkConnection())) return [];
  requireFirebaseUser(userId);
  const snapshots = await getDocs(
    query(collection(getFirebaseFirestore(), 'orders'), where('user_id', '==', userId)),
  );
  return snapshots.docs.map((snapshot) => {
    const data = snapshot.data();
    const address = data.shipping_address;
    if (
      typeof data.status !== 'string'
      || !['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(data.status)
      || data.user_id !== userId
      || typeof data.currency !== 'string'
      || !/^[A-Z]{3}$/.test(data.currency)
      || (data.payment_method !== undefined && data.payment_method !== null
        && data.payment_method !== 'yape' && data.payment_method !== 'visa')
      || typeof data.created_at !== 'string'
      || typeof data.updated_at !== 'string'
      || typeof address !== 'object'
      || address === null
      || !Array.isArray(data.items)
    ) {
      throw new Error(`El pedido ${snapshot.id} tiene un formato inválido en Firebase.`);
    }
    const shippingAddress: ShippingAddressSnapshot = {
      id: typeof data.shipping_address_id === 'string' ? data.shipping_address_id : `addr_${snapshot.id}`,
      userId,
      recipient: requiredString(address.recipient, 'destinatario'),
      phone: requiredString(address.phone, 'teléfono'),
      line1: requiredString(address.line1, 'dirección'),
      city: requiredString(address.city, 'ciudad'),
      region: typeof address.region === 'string' ? address.region : undefined,
      postalCode: typeof address.postal_code === 'string' ? address.postal_code : undefined,
      countryCode: requiredString(address.country_code, 'país'),
    };
    if (!/^[A-Z]{2}$/.test(shippingAddress.countryCode)) {
      throw new Error(`El pedido ${snapshot.id} tiene un país de entrega inválido.`);
    }
    const items = data.items.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`El pedido ${snapshot.id} contiene un artículo inválido.`);
      }
      const row = item as Record<string, unknown>;
      if (
        typeof row.product_name !== 'string'
        || typeof row.sku !== 'string'
        || typeof row.quantity !== 'number'
        || !Number.isSafeInteger(row.quantity)
        || row.quantity <= 0
        || typeof row.unit_price !== 'number'
        || !Number.isFinite(row.unit_price)
        || row.unit_price < 0
      ) {
        throw new Error(`El pedido ${snapshot.id} contiene un artículo inválido.`);
      }
      if (row.product_id !== null && typeof row.product_id !== 'string') {
        throw new Error(`El pedido ${snapshot.id} contiene un identificador de producto inválido.`);
      }
      return {
        productId: typeof row.product_id === 'string' ? row.product_id : null,
        productName: row.product_name,
        sku: row.sku,
        quantity: row.quantity,
        unitPrice: row.unit_price,
      };
    });
    return {
      id: snapshot.id,
      userId,
      shippingAddress,
      status: data.status as OrderStatus,
      paymentMethod: data.payment_method === 'yape' || data.payment_method === 'visa'
        ? data.payment_method
        : undefined,
      paymentDetails: parseOrderPaymentDetails(data.payment_details),
      currency: data.currency,
      items,
      syncStatus: 'synced',
      receiptStoragePath: typeof data.receipt_storage_path === 'string' ? data.receipt_storage_path : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  });
}

function parseOrderPaymentDetails(value: unknown): OrderPaymentDetails | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const details = value as Record<string, unknown>;
  const result: OrderPaymentDetails = {};
  if (typeof details.phone === 'string' && details.phone.trim()) result.phone = details.phone;
  if (typeof details.cardholderName === 'string' && details.cardholderName.trim()) result.cardholderName = details.cardholderName;
  if (details.cardBrand === 'visa' || details.cardBrand === 'mastercard' || details.cardBrand === 'amex'
    || details.cardBrand === 'discover' || details.cardBrand === 'other') result.cardBrand = details.cardBrand;
  if (typeof details.cardLast4 === 'string' && /^\d{4}$/.test(details.cardLast4)) result.cardLast4 = details.cardLast4;
  if (typeof details.cardExpiry === 'string' && /^\d{2}\/\d{2}$/.test(details.cardExpiry)) result.cardExpiry = details.cardExpiry;
  return Object.keys(result).length ? result : undefined;
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`El registro de Firebase no contiene un ${field} válido.`);
  }
  return value;
}
