import { supabase } from './supabase';
import type { Attendance, AttendanceStatus, Expense, Income, Payment, PaymentKind, Worker } from './types';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const PAGE = 1000;

/** Supabase bir istekte en fazla 1000 satır döndürür; sorguyu sayfa sayfa çalıştırır */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = check(await page(from, from + PAGE - 1));
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

/** Postgres numeric değerleri metin olarak gelir; sayıya çevir */
const num = <T extends object>(row: T, ...keys: (keyof T)[]): T => {
  const out = { ...row };
  for (const k of keys) out[k] = Number(row[k]) as T[keyof T];
  return out;
};

// ───────── Profil ─────────

export interface Profile {
  full_name: string;
  business_name: string;
}

export async function updateProfile(p: Profile): Promise<void> {
  const { data, error } = await supabase.auth.updateUser({ data: p });
  if (error) throw new Error(error.message);
  if (data.user) check(await supabase.from('profiles').update(p).eq('id', data.user.id));
}

// ───────── İşçiler ─────────

export async function listWorkers(onlyActive = false): Promise<Worker[]> {
  let q = supabase.from('workers').select('*').order('full_name');
  if (onlyActive) q = q.eq('active', true);
  return check(await q).map((w: Worker) => num(w, 'daily_wage'));
}

export async function getWorker(id: string): Promise<Worker> {
  return num(check(await supabase.from('workers').select('*').eq('id', id).single()) as Worker, 'daily_wage');
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

const toBalance = (r: WorkerBalance): WorkerBalance => num(r, 'worked_days', 'earned', 'paid', 'balance');

/** Tüm zamanların bakiyesi (sunucuda hesaplanır) */
export async function listWorkerBalances(): Promise<WorkerBalance[]> {
  return check(await supabase.from('worker_balances').select('*')).map(toBalance);
}

export async function getWorkerBalance(workerId: string): Promise<WorkerBalance | null> {
  const row = check(await supabase.from('worker_balances').select('*').eq('worker_id', workerId).maybeSingle());
  return row ? toBalance(row as WorkerBalance) : null;
}

// ───────── Puantaj ─────────

export const FAR_PAST = '1900-01-01';
export const FAR_FUTURE = '2999-12-31';

export async function listAttendance(start: string, end: string, workerId?: string): Promise<Attendance[]> {
  const rows = await fetchAll<Attendance>((from, to) => {
    let q = supabase.from('attendance').select('*').gte('work_date', start).lte('work_date', end).order('work_date').order('id');
    if (workerId) q = q.eq('worker_id', workerId);
    return q.range(from, to);
  });
  return rows.map((a) => num(a, 'daily_wage'));
}

export async function setAttendance(worker: Pick<Worker, 'id' | 'daily_wage'>, date: string, status: AttendanceStatus): Promise<Attendance> {
  const row = check(
    await supabase
      .from('attendance')
      .upsert({ worker_id: worker.id, work_date: date, status, daily_wage: worker.daily_wage }, { onConflict: 'worker_id,work_date' })
      .select()
      .single(),
  ) as Attendance;
  return num(row, 'daily_wage');
}

/** Yevmiyesi kayıtlı bir günün durumunu değiştirir (geçmiş günün yevmiyesi korunur) */
export async function updateAttendanceStatus(id: string, status: AttendanceStatus): Promise<void> {
  check(await supabase.from('attendance').update({ status }).eq('id', id));
}

export async function clearAttendance(workerId: string, date: string): Promise<void> {
  check(await supabase.from('attendance').delete().eq('worker_id', workerId).eq('work_date', date));
}

// ───────── Ödemeler / avanslar ─────────

export async function listPayments(start = FAR_PAST, end = FAR_FUTURE, workerId?: string): Promise<Payment[]> {
  const rows = await fetchAll<Payment>((from, to) => {
    let q = supabase.from('payments').select('*').gte('pay_date', start).lte('pay_date', end).order('pay_date', { ascending: false }).order('id');
    if (workerId) q = q.eq('worker_id', workerId);
    return q.range(from, to);
  });
  return rows.map((p) => num(p, 'amount'));
}

export async function createPayment(input: { worker_id: string; pay_date: string; amount: number; kind: PaymentKind; note: string | null }): Promise<void> {
  check(await supabase.from('payments').insert(input));
}

export async function deletePayment(id: string): Promise<void> {
  check(await supabase.from('payments').delete().eq('id', id));
}

// ───────── Gelirler ─────────

export async function listIncomes(start = FAR_PAST, end = FAR_FUTURE): Promise<Income[]> {
  const rows = await fetchAll<Income>((from, to) =>
    supabase.from('incomes').select('*').gte('income_date', start).lte('income_date', end).order('income_date', { ascending: false }).order('id').range(from, to),
  );
  return rows.map((i) => num(i, 'amount'));
}

export async function createIncome(input: { income_date: string; amount: number; description: string | null }): Promise<void> {
  check(await supabase.from('incomes').insert(input));
}

export async function deleteIncome(id: string): Promise<void> {
  check(await supabase.from('incomes').delete().eq('id', id));
}

// ───────── Diğer giderler ─────────

export async function listExpenses(start = FAR_PAST, end = FAR_FUTURE): Promise<Expense[]> {
  const rows = await fetchAll<Expense>((from, to) =>
    supabase.from('expenses').select('*').gte('expense_date', start).lte('expense_date', end).order('expense_date', { ascending: false }).order('id').range(from, to),
  );
  return rows.map((e) => num(e, 'amount'));
}

export async function createExpense(input: { expense_date: string; amount: number; description: string | null }): Promise<void> {
  check(await supabase.from('expenses').insert(input));
}

export async function deleteExpense(id: string): Promise<void> {
  check(await supabase.from('expenses').delete().eq('id', id));
}
