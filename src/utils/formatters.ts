/**
 * Currency and numbers formatters for Colombian Pesos (COP)
 */

export function formatCOP(amount: number, includeCode = true): string {
  if (isNaN(amount) || amount == null) return includeCode ? '$0 COP' : '$0';
  
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return includeCode ? `${formatted} COP` : formatted;
}

export function formatNumber(val: number): string {
  if (isNaN(val) || val == null) return '0';
  return new Intl.NumberFormat('es-CO').format(val);
}

export function formatReceiptNumber(prefix = 'REC', num = 1): string {
  return `${prefix}-${String(num).padStart(4, '0')}`;
}
