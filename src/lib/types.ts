export type AttendanceStatus = 'full' | 'half' | 'absent' | 'leave';
export type PaymentKind = 'advance' | 'payment';
export type WorkerRole = 'usta' | 'kalfa' | 'duz' | 'diger';
export type PayMethod = 'nakit' | 'banka' | 'kart';

export interface Worker {
  id: string;
  full_name: string;
  phone: string | null;
  daily_wage: number;
  start_date: string;
  active: boolean;
  notes: string | null;
  role: WorkerRole;
  iban: string | null;
  overtime_rate: number | null; // saatlik; boşsa yevmiye/8 × 1,5
  emergency_contact: string | null;
}

export interface Attendance {
  id: string;
  worker_id: string;
  work_date: string;
  status: AttendanceStatus;
  daily_wage: number;
  note: string | null;
  overtime_hours: number;
  overtime_rate: number;
}

export interface Payment {
  id: string;
  worker_id: string;
  pay_date: string;
  amount: number;
  kind: PaymentKind;
  note: string | null;
  method: PayMethod;
}

export interface Income {
  id: string;
  income_date: string;
  amount: number;
  description: string | null;
  category: string;
  method: PayMethod;
  site: string | null;
}

export interface Expense {
  id: string;
  expense_date: string;
  amount: number;
  description: string | null;
  category: string;
  method: PayMethod;
  site: string | null;
}

export interface Budget {
  category: string;
  monthly_limit: number;
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  full: 'Tam gün',
  half: 'Yarım gün',
  absent: 'Gelmedi',
  leave: 'İzinli',
};

export const PAYMENT_LABELS: Record<PaymentKind, string> = {
  advance: 'Avans',
  payment: 'Ödeme',
};

export const ROLE_LABELS: Record<WorkerRole, string> = {
  usta: 'Usta',
  kalfa: 'Kalfa',
  duz: 'Düz işçi',
  diger: 'Diğer',
};

export const METHOD_LABELS: Record<PayMethod, string> = {
  nakit: 'Nakit',
  banka: 'Banka',
  kart: 'Kart',
};
