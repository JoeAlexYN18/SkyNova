import type { Order } from '@/domain/entities/Order';
import { firebaseConfigured } from './firebaseServices';
import { syncAddressToFirebase, syncOrderToFirebase } from './firebaseDataSync';
import { restApiConfigured, syncOrderToRest } from './restApiClient';

export const orderSyncConfigured = firebaseConfigured || restApiConfigured;

export async function syncOrderToServices(order: Order) {
  if (!orderSyncConfigured) return undefined;
  if (firebaseConfigured) {
    await syncAddressToFirebase(order.shippingAddress);
    await syncOrderToFirebase(order);
  }
  if (restApiConfigured) await syncOrderToRest(order);
  return undefined;
}
