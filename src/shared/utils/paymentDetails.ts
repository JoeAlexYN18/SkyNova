import type { OrderPaymentDetails } from '@/domain/entities/Order';

export function parseOrderPaymentDetails(value: unknown): OrderPaymentDetails | undefined {
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
