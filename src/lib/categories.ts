// Gelir ve gider kategorileri: etiket, ikon ve renk (tasarım sistemindeki kategori tonları)
import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

type Icon = ComponentProps<typeof Feather>['name'];
export type Category = { key: string; label: string; icon: Icon; color: string; soft: string };

const tone = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0.13)`;
};
const c = (key: string, label: string, icon: Icon, color: string): Category => ({ key, label, icon, color, soft: tone(color) });

export const EXPENSE_CATEGORIES: Category[] = [
  c('malzeme', 'Malzeme', 'package', '#CC7E80'),
  c('nakliye', 'Nakliye', 'truck', '#4F69F2'),
  c('yemek', 'Yemek', 'coffee', '#E8913A'),
  c('yakit', 'Yakıt', 'droplet', '#B39581'),
  c('ekipman', 'Alet / ekipman', 'tool', '#8566DC'),
  c('kira', 'Kira / konaklama', 'home', '#00A9A3'),
  c('vergi', 'Vergi / SGK', 'file-text', '#D93036'),
  c('diger', 'Diğer', 'more-horizontal', '#737373'),
];

export const INCOME_CATEGORIES: Category[] = [
  c('hakedis', 'Hakediş', 'briefcase', '#17A57A'),
  c('avans', 'Müşteri avansı', 'download', '#4F69F2'),
  c('ekis', 'Ek iş', 'plus-circle', '#8566DC'),
  c('diger', 'Diğer', 'more-horizontal', '#737373'),
];

const byKey = (list: Category[]) => new Map(list.map((x) => [x.key, x]));
const EXP = byKey(EXPENSE_CATEGORIES);
const INC = byKey(INCOME_CATEGORIES);

export const expenseCategory = (key: string): Category => EXP.get(key) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
export const incomeCategory = (key: string): Category => INC.get(key) ?? INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
