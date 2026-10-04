export const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${grouped},${dec} ₺`;
}

/** 30.5 → "30,5" */
export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

export function parseMoney(text: string): number {
  // "1.250,50" veya "1250.50" kabul et
  const t = text.trim().replace(/\s|₺/g, '');
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel tarihi YYYY-MM-DD olarak döndürür */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function formatDate(iso: string): string {
  const d = fromISODate(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export function formatDateLong(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${DAYS[d.getDay()]}`;
}

/** month: 0-11. Ayın ilk ve son gününü döndürür */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(fromISODate(s)) === s;
}
