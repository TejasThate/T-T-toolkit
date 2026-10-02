/**
 * Formats a number to INR with Indian grouping (e.g. 1,23,456.78).
 */
export function formatINR(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Compact format for large numbers (lakh/crore).
 */
export function formatCompactINR(value: number): string {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return formatINR(value, 0);
}

/**
 * Formats percentage with a sign (+/-).
 */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Get date string in IST timezone.
 */
export function getISTDateString(date: Date = new Date()): string {
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}
