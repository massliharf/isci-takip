// Saf hesaplama fonksiyonları (UI'dan bağımsız, test edilebilir)
import type { Attendance, AttendanceStatus, Expense, Income, Payment, Worker } from './types';

export const STATUS_FACTOR: Record<AttendanceStatus, number> = {
  full: 1,
  half: 0.5,
  absent: 0,
  leave: 0,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function attendanceEarning(a: Pick<Attendance, 'status' | 'daily_wage'>): number {
  return round2(Number(a.daily_wage) * STATUS_FACTOR[a.status]);
}

export interface WorkerSummary {
  workerId: string;
  name: string;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  workedDays: number; // tam + yarım*0.5
  earned: number; // hak edilen yevmiye toplamı
  advances: number;
  payments: number;
  paid: number; // avans + ödeme
  balance: number; // earned - paid (pozitif: işçinin alacağı, negatif: işçinin borcu)
}

export function summarizeWorker(
  worker: Pick<Worker, 'id' | 'full_name'>,
  attendance: Attendance[],
  payments: Payment[],
): WorkerSummary {
  const s: WorkerSummary = {
    workerId: worker.id,
    name: worker.full_name,
    fullDays: 0,
    halfDays: 0,
    absentDays: 0,
    leaveDays: 0,
    workedDays: 0,
    earned: 0,
    advances: 0,
    payments: 0,
    paid: 0,
    balance: 0,
  };
  for (const a of attendance) {
    if (a.worker_id !== worker.id) continue;
    if (a.status === 'full') s.fullDays++;
    else if (a.status === 'half') s.halfDays++;
    else if (a.status === 'absent') s.absentDays++;
    else s.leaveDays++;
    s.workedDays += STATUS_FACTOR[a.status];
    s.earned += attendanceEarning(a);
  }
  for (const p of payments) {
    if (p.worker_id !== worker.id) continue;
    if (p.kind === 'advance') s.advances += Number(p.amount);
    else s.payments += Number(p.amount);
  }
  s.earned = round2(s.earned);
  s.advances = round2(s.advances);
  s.payments = round2(s.payments);
  s.paid = round2(s.advances + s.payments);
  s.balance = round2(s.earned - s.paid);
  return s;
}

export interface MonthReport {
  workers: WorkerSummary[];
  totalLabor: number; // işçilik gideri (hak edilen yevmiyeler)
  totalPaid: number; // ay içinde işçilere verilen para
  totalIncome: number;
  totalOtherExpense: number;
  net: number; // gelir - işçilik - diğer giderler
  cashNet: number; // gelir - işçilere verilen - diğer giderler (kasa bazlı)
}

export function buildMonthReport(
  workers: Pick<Worker, 'id' | 'full_name'>[],
  attendance: Attendance[],
  payments: Payment[],
  incomes: Income[],
  expenses: Expense[],
): MonthReport {
  const summaries = workers
    .map((w) => summarizeWorker(w, attendance, payments))
    .filter((s) => s.fullDays + s.halfDays + s.absentDays + s.leaveDays > 0 || s.paid > 0);
  const totalLabor = round2(summaries.reduce((t, s) => t + s.earned, 0));
  const totalPaid = round2(summaries.reduce((t, s) => t + s.paid, 0));
  const totalIncome = round2(incomes.reduce((t, i) => t + Number(i.amount), 0));
  const totalOtherExpense = round2(expenses.reduce((t, e) => t + Number(e.amount), 0));
  return {
    workers: summaries,
    totalLabor,
    totalPaid,
    totalIncome,
    totalOtherExpense,
    net: round2(totalIncome - totalLabor - totalOtherExpense),
    cashNet: round2(totalIncome - totalPaid - totalOtherExpense),
  };
}
