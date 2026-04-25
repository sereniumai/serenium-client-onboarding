/**
 * Format a North-American phone number for display: "+1 403 463-0735".
 * Strips anything non-numeric, accepts 10-digit or 11-digit (with country
 * code) input, and falls back to the raw string for anything else so we
 * never mangle a number we don't recognise.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+1 ${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}
