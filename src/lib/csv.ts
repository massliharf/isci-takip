// Platformdan bağımsız CSV yardımcıları (testlerde de kullanılır)

export type CsvCell = string | number | null | undefined;
export type CsvRow = CsvCell[];

/** Excel (Türkçe) için sayı: binlik ayraçsız, ondalık virgüllü */
const cell = (v: CsvCell): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : v;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function csvContent(rows: CsvRow[]): string {
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

const TR: Record<string, string> = { ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' };

/** "Mehmet Kaya – Ekim 2026" → "Mehmet-Kaya-Ekim-2026" */
export function safeFileName(s: string): string {
  return s
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => TR[c])
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
