const formatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(amount: number, currency: string, locale = 'es-CO'): string {
  const key = `${locale}:${currency}`;
  let formatter = formatters.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    formatters.set(key, formatter);
  }

  return formatter.format(amount);
}
