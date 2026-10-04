// Saf hesaplama fonksiyonları (UI'dan bağımsız, test edilebilir)
import type { Attendance, AttendanceStatus, Expense, Income, Payment, Worker } from './types';

export const STATUS_FACTOR: Record<AttendanceStatus, number> = {
  full: 1,
  half: 0.5,
  absent: 0,
  leave: 0,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

type EarningInput = Pick<Attendance, 'status' | 'daily_wage'> & Partial<Pick<Attendance, 'overtime_hours' | 'overtime_rate'>>;

export const overtimeAmount = (a: Partial<Pick<Attendance, 'overtime_hours' | 'overtime_rate'>>): number =>
  round2(Number(a.overtime_hours ?? 0) * Number(a.overtime_rate ?? 0));

/** Günlük kazanç: yevmiye × gün çarpanı + mesai saati × saatlik mesai ücreti */
export function attendanceEarning(a: EarningInput): number {
  return round2(Number(a.daily_wage) * STATUS_FACTOR[a.status] + overtimeAmount(a));
}

/** Saatlik mesai ücreti: tanımlıysa işçininki, değilse yevmiye / 8 × 1,5 */
export function overtimeRateFor(w: Pick<Worker, 'daily_wage' | 'overtime_rate'>): number {
  return w.overtime_rate != null && Number(w.overtime_rate) > 0 ? Number(w.overtime_rate) : round2((Number(w.daily_wage) / 8) * 1.5);
}

export interface WorkerSummary {
  workerId: string;
  name: string;
  fullDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  workedDays: number; // tam + yarım*0.5
  earned: number; // hak edilen toplam (yevmiye + mesai)
  overtimeHours: number;
  overtimeEarned: number;
  advances: number;
  payments: number;
  paid: number; // avans + ödeme
  balance: number; // earned - paid (pozitif: işçinin alacağı, negatif: işçinin borcu)
  opening: number; // dönem başındaki devreden bakiye
  closing: number; // opening + balance
}

export function summarizeWorker(
  worker: Pick<Worker, 'id' | 'full_name'>,
  attendance: Attendance[],
  payments: Payment[],
  opening = 0,
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
    overtimeHours: 0,
    overtimeEarned: 0,
    advances: 0,
    payments: 0,
    paid: 0,
    balance: 0,
    opening: 0,
    closing: 0,
  };
  for (const a of attendance) {
    if (a.worker_id !== worker.id) continue;
    if (a.status === 'full') s.fullDays++;
    else if (a.status === 'half') s.halfDays++;
    else if (a.status === 'absent') s.absentDays++;
    else s.leaveDays++;
    s.workedDays += STATUS_FACTOR[a.status];
    s.earned += attendanceEarning(a);
    s.overtimeHours += Number(a.overtime_hours ?? 0);
    s.overtimeEarned += overtimeAmount(a);
  }
  for (const p of payments) {
    if (p.worker_id !== worker.id) continue;
    if (p.kind === 'advance') s.advances += Number(p.amount);
    else s.payments += Number(p.amount);
  }
  s.earned = round2(s.earned);
  s.overtimeEarned = round2(s.overtimeEarned);
  s.advances = round2(s.advances);
  s.payments = round2(s.payments);
  s.paid = round2(s.advances + s.payments);
  s.balance = round2(s.earned - s.paid);
  s.opening = round2(opening);
  s.closing = round2(s.opening + s.balance);
  return s;
}

export interface MonthReport {
  workers: WorkerSummary[];
  totalOpening: number; // ay başında işçilere olan toplam borç
  totalClosing: number; // ay sonunda işçilere olan toplam borç
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
  openings: Map<string, number> = new Map(),
): MonthReport {
  const summaries = workers
    .map((w) => summarizeWorker(w, attendance, payments, openings.get(w.id) ?? 0))
    .filter((s) => s.fullDays + s.halfDays + s.absentDays + s.leaveDays > 0 || s.paid > 0 || s.opening !== 0);
  const totalLabor = round2(summaries.reduce((t, s) => t + s.earned, 0));
  const totalPaid = round2(summaries.reduce((t, s) => t + s.paid, 0));
  const totalIncome = round2(incomes.reduce((t, i) => t + Number(i.amount), 0));
  const totalOtherExpense = round2(expenses.reduce((t, e) => t + Number(e.amount), 0));
  return {
    workers: summaries,
    totalOpening: round2(summaries.reduce((t, s) => t + s.opening, 0)),
    totalClosing: round2(summaries.reduce((t, s) => t + s.closing, 0)),
    totalLabor,
    totalPaid,
    totalIncome,
    totalOtherExpense,
    net: round2(totalIncome - totalLabor - totalOtherExpense),
    cashNet: round2(totalIncome - totalPaid - totalOtherExpense),
  };
}

/**
 * Dönem başındaki devreden bakiye: tüm zamanların bakiyesinden, dönem başı ve sonrasındaki
 * hareketler çıkarılır. Böylece geçmişin tamamını çekmeden devir hesaplanır.
 */
export function openingBalances(
  allTime: { worker_id: string; balance: number }[],
  attendanceSince: (Pick<Attendance, 'worker_id'> & EarningInput)[],
  paymentsSince: Pick<Payment, 'worker_id' | 'amount'>[],
): Map<string, number> {
  const delta = new Map<string, number>();
  const add = (id: string, n: number) => delta.set(id, (delta.get(id) ?? 0) + n);
  for (const a of attendanceSince) add(a.worker_id, attendanceEarning(a));
  for (const p of paymentsSince) add(p.worker_id, -Number(p.amount));
  return new Map(allTime.map((b) => [b.worker_id, round2(Number(b.balance) - (delta.get(b.worker_id) ?? 0))]));
}

export const monthKey = (iso: string) => iso.slice(0, 7); // "2026-10"

export interface MonthHistoryRow {
  key: string; // YYYY-MM
  year: number;
  month: number; // 0-11
  fullDays: number;
  halfDays: number;
  leaveDays: number;
  absentDays: number;
  workedDays: number;
  overtimeHours: number;
  earned: number;
  paid: number;
  balance: number; // ay farkı
  cumulative: number; // ay sonu toplam bakiye
}

/** Bir işçinin tüm hareketlerini aylara böler; en eski ay ilk sırada, kümülatif bakiye ile */
export function monthlyHistory(attendance: Attendance[], payments: Payment[]): MonthHistoryRow[] {
  const rows = new Map<string, MonthHistoryRow>();
  const row = (key: string) => {
    let r = rows.get(key);
    if (!r) {
      const [y, m] = key.split('-').map(Number);
      r = { key, year: y, month: m - 1, fullDays: 0, halfDays: 0, leaveDays: 0, absentDays: 0, workedDays: 0, overtimeHours: 0, earned: 0, paid: 0, balance: 0, cumulative: 0 };
      rows.set(key, r);
    }
    return r;
  };
  for (const a of attendance) {
    const r = row(monthKey(a.work_date));
    if (a.status === 'full') r.fullDays++;
    else if (a.status === 'half') r.halfDays++;
    else if (a.status === 'leave') r.leaveDays++;
    else r.absentDays++;
    r.workedDays += STATUS_FACTOR[a.status];
    r.overtimeHours += Number(a.overtime_hours ?? 0);
    r.earned += attendanceEarning(a);
  }
  for (const p of payments) row(monthKey(p.pay_date)).paid += Number(p.amount);
  let cumulative = 0;
  return [...rows.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((r) => {
      const balance = round2(r.earned - r.paid);
      cumulative = round2(cumulative + balance);
      return { ...r, earned: round2(r.earned), paid: round2(r.paid), balance, cumulative };
    });
}

export const STATUS_CODE: Record<AttendanceStatus, string> = { full: 'T', half: 'Y', leave: 'İ', absent: 'X' };

export interface GridRow {
  workerId: string;
  name: string;
  dailyWage: number;
  cells: (AttendanceStatus | null)[]; // ayın her günü için
  overtime: number[]; // günlük mesai saatleri
  workedDays: number;
  overtimeHours: number;
  earned: number;
}

/** Puantaj cetveli: işçi × gün tablosu */
export function puantajGrid(
  workers: Pick<Worker, 'id' | 'full_name' | 'daily_wage'>[],
  attendance: Attendance[],
  daysInMonth: number,
): GridRow[] {
  return workers
    .map((w) => {
      const cells: (AttendanceStatus | null)[] = Array(daysInMonth).fill(null);
      const overtime: number[] = Array(daysInMonth).fill(0);
      let workedDays = 0;
      let overtimeHours = 0;
      let earned = 0;
      for (const a of attendance) {
        if (a.worker_id !== w.id) continue;
        const day = Number(a.work_date.slice(8, 10)) - 1;
        cells[day] = a.status;
        overtime[day] = Number(a.overtime_hours ?? 0);
        overtimeHours += overtime[day];
        workedDays += STATUS_FACTOR[a.status];
        earned += attendanceEarning(a);
      }
      return { workerId: w.id, name: w.full_name, dailyWage: Number(w.daily_wage), cells, overtime, workedDays, overtimeHours, earned: round2(earned) };
    })
    .filter((r) => r.cells.some((c) => c !== null));
}

export interface CategoryTotal {
  key: string;
  total: number;
  count: number;
  limit: number | null; // aylık bütçe
}

/** Kategori bazında toplamlar (büyükten küçüğe) ve varsa bütçe sınırı */
export function categoryTotals(rows: { category: string; amount: number }[], budgets: { category: string; monthly_limit: number }[] = []): CategoryTotal[] {
  const m = new Map<string, CategoryTotal>();
  for (const b of budgets) m.set(b.category, { key: b.category, total: 0, count: 0, limit: Number(b.monthly_limit) });
  for (const r of rows) {
    const t = m.get(r.category) ?? { key: r.category, total: 0, count: 0, limit: null };
    t.total = round2(t.total + Number(r.amount));
    t.count++;
    m.set(r.category, t);
  }
  return [...m.values()].sort((a, b) => b.total - a.total || (b.limit ?? 0) - (a.limit ?? 0));
}
