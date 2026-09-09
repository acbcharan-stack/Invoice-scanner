// Currency handling utility for Indian Rupee (₹ / INR) and multi-currency support

export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_CURRENCY_SYMBOL = '₹';

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹ - Indian Rupee)' },
  { code: 'USD', symbol: '$', label: 'USD ($ - US Dollar)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€ - Euro)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£ - British Pound)' },
];

export function getCurrencySymbol(currency?: string): string {
  if (!currency) return DEFAULT_CURRENCY_SYMBOL;
  const c = currency.toUpperCase().trim();
  if (c === 'INR' || c === 'RS' || c === 'RS.' || c === 'RUPEES' || c === '₹') return '₹';
  if (c === 'USD' || c === '$') return '$';
  if (c === 'EUR' || c === '€') return '€';
  if (c === 'GBP' || c === '£') return '£';
  if (c === 'JPY' || c === '¥') return '¥';
  if (c === 'CAD') return 'C$';
  if (c === 'AUD') return 'A$';
  return c;
}

export function formatIndianCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatAmountWithCurrency(
  amount: number | undefined | null,
  currency: string = 'INR'
): string {
  const symbol = getCurrencySymbol(currency);
  if (amount === undefined || amount === null || isNaN(amount)) {
    return `${symbol}0.00`;
  }
  const isINR = !currency || currency.toUpperCase() === 'INR';
  const locale = isINR ? 'en-IN' : undefined;
  return `${symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
