import { supabase } from './supabase';
import type { Attendance, AttendanceStatus, Expense, Income, Payment, PaymentKind, Worker } from './types';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// İşçiler
export async function listWorkers(onlyActive = false): Promise<Worker[]> {
  let q = supabase.from('workers').select('*').order('full_name');
  if (onlyActive) q = q.eq('active', true);
  return check(await q);
}

export async function getWorker(id: string): Promise<Worker> {
  return check(await supabase.from('workers').select('*').eq('id', id).single());
}

export type WorkerInput = Pick<Worker, 'full_name' | 'phone' | 'daily_wage' | 'start_date' | 'active' | 'notes'>;

export async function createWorker(input: WorkerInput): Promise<Worker> {
  return check(await supabase.from('workers').insert(input).select().single());
}

export async function updateWorker(id: string, input: Partial<WorkerInput>): Promise<void> {
  check(await supabase.from('workers').update(input).eq('id', id));
}

export async function deleteWorker(id: string): Promise<void> {
  check(await supabase.from('workers').delete().eq('id', id));
}

export interface WorkerBalance {
  worker_id: string;
  worked_days: number;
  earned: number;
  paid: number;
  balance: number;
}

/** Tüm zamanların bakiyesi (sunucuda hesaplanır) */
export async function listWorkerBalances(): Promise<WorkerBalance[]> {
  const rows: WorkerBalance[] = check(await supabase.from('worker_balances').select('*'));
  return rows.map((r) => ({
    worker_id: r.worker_id,
    worked_days: Number(r.worked_days),
    earned: Number(r.earned),
    paid: Number(r.paid),
    balance: Number(r.balance),
  }));
}

// Puantaj
export async function listAttendance(start: string, end: string, workerId?: string): Promise<Attendance[]> {
  // Supabase varsayılan olarak 1000 satır döndürür; sayfa sayfa çek
  const pageSize = 1000;
  const all: Attendance[] = [];
  for (let from = 0; ; from += pageSize) {
    let q = supabase.from('attendance').select('*').gte('work_date', start).lte('work_date', end).order('work_date').order('id');
    if (workerId) q = q.eq('worker_id', workerId);
    const page: Attendance[] = check(await q.range(from, from + pageSize - 1));
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}

export async function setAttendance(worker: Pick<Worker, 'id' | 'daily_wage'>, date: string, status: AttendanceStatus): Promise<Attendance> {
  return check(
    await supabase
      .from('attendance')
      .upsert({ worker_id: worker.id, work_date: date, status, daily_wage: worker.daily_wage }, { onConflict: 'worker_id,work_date' })
      .select()
      .single(),
  );
}

export async function clearAttendance(workerId: string, date: string): Promise<void> {
  check(await supabase.from('attendance').delete().eq('worker_id', workerId).eq('work_date', date));
}

// Ödemeler / avanslar
export async function listPayments(start?: string, end?: string, workerId?: string): Promise<Payment[]> {
  let q = supabase.from('payments').select('*').order('pay_date', { ascending: false });
  if (start) q = q.gte('pay_date', start);
  if (end) q = q.lte('pay_date', end);
  if (workerId) q = q.eq('worker_id', workerId);
  return check(await q);
}

export async function createPayment(input: { worker_id: string; pay_date: string; amount: number; kind: PaymentKind; note: string | null }): Promise<void> {
  check(await supabase.from('payments').insert(input));
}

export async function deletePayment(id: string): Promise<void> {
  check(await supabase.from('payments').delete().eq('id', id));
}

// Gelirler
export async function listIncomes(start: string, end: string): Promise<Income[]> {
  return check(await supabase.from('incomes').select('*').gte('income_date', start).lte('income_date', end).order('income_date', { ascending: false }));
}

export async function createIncome(input: { income_date: string; amount: number; description: string | null }): Promise<void> {
  check(await supabase.from('incomes').insert(input));
}

export async function deleteIncome(id: string): Promise<void> {
  check(await supabase.from('incomes').delete().eq('id', id));
}

// Diğer giderler
export async function listExpenses(start: string, end: string): Promise<Expense[]> {
  return check(await supabase.from('expenses').select('*').gte('expense_date', start).lte('expense_date', end).order('expense_date', { ascending: false }));
}

export async function createExpense(input: { expense_date: string; amount: number; description: string | null }): Promise<void> {
  check(await supabase.from('expenses').insert(input));
}

export async function deleteExpense(id: string): Promise<void> {
  check(await supabase.from('expenses').delete().eq('id', id));
}
