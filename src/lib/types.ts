export type AttendanceStatus = 'full' | 'half' | 'absent' | 'leave';
export type PaymentKind = 'advance' | 'payment';

export interface Worker {
  id: string;
  full_name: string;
  phone: string | null;
  daily_wage: number;
  start_date: string;
  active: boolean;
  notes: string | null;
}

export interface Attendance {
  id: string;
  worker_id: string;
  work_date: string;
  status: AttendanceStatus;
  daily_wage: number;
  note: string | null;
}

export interface Payment {
  id: string;
  worker_id: string;
  pay_date: string;
  amount: number;
  kind: PaymentKind;
  note: string | null;
}

export interface Income {
  id: string;
  income_date: string;
  amount: number;
  description: string | null;
}

export interface Expense {
  id: string;
  expense_date: string;
  amount: number;
  description: string | null;
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
