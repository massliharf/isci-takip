import { supabase } from './supabase';
import type { Attendance, AttendanceStatus, Budget, Expense, Income, PayMethod, Payment, PaymentKind, Worker } from './types';
import { overtimeRateFor } from './calc';

const MIGRATION_HINT =
  'Veritabanı güncel değil. Supabase → SQL Editor\'de supabase/migrations/0002_advanced.sql dosyasını çalıştırın.';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) {
    const m = res.error.message;
    // Yeni sütunlar/tablolar henüz oluşturulmadıysa anlaşılır bir mesaj ver
    if (/column .* does not exist|could not find the .* (column|table)|relation .* does not exist|schema cache/i.test(m)) throw new Error(MIGRATION_HINT);
    throw new Error(m);
  }
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
  return check(await q).map(toWorker);
}

const toWorker = (w: Worker): Worker => ({ ...num(w, 'daily_wage'), overtime_rate: w.overtime_rate == null ? null : Number(w.overtime_rate) });

export async function getWorker(id: string): Promise<Worker> {
  return toWorker(check(await supabase.from('workers').select('*').eq('id', id).single()) as Worker);
}

export type WorkerInput = Pick<
  Worker,
  'full_name' | 'phone' | 'daily_wage' | 'start_date' | 'active' | 'notes' | 'role' | 'iban' | 'overtime_rate' | 'emergency_contact'
>;

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
  return rows.map(toAttendance);
}

const toAttendance = (a: Attendance): Attendance => ({
  ...num(a, 'daily_wage'),
  overtime_hours: Number(a.overtime_hours ?? 0),
  overtime_rate: Number(a.overtime_rate ?? 0),
});

/** Yeni gün kaydı: o günün yevmiyesi ve mesai ücreti kayda kopyalanır */
export async function setAttendance(
  worker: Pick<Worker, 'id' | 'daily_wage' | 'overtime_rate'>,
  date: string,
  status: AttendanceStatus,
  extra: { overtime_hours?: number; note?: string | null } = {},
): Promise<Attendance> {
  const row = check(
    await supabase
      .from('attendance')
      .upsert(
        { worker_id: worker.id, work_date: date, status, daily_wage: worker.daily_wage, overtime_rate: overtimeRateFor(worker), ...extra },
        { onConflict: 'worker_id,work_date' },
      )
      .select()
      .single(),
  ) as Attendance;
  return toAttendance(row);
}

/** Kayıtlı bir günü günceller (o günün yevmiyesi korunur) */
export async function updateAttendance(
  id: string,
  patch: Partial<Pick<Attendance, 'status' | 'overtime_hours' | 'overtime_rate' | 'note'>>,
): Promise<Attendance> {
  return toAttendance(check(await supabase.from('attendance').update(patch).eq('id', id).select().single()) as Attendance);
}

export async function updateAttendanceStatus(id: string, status: AttendanceStatus): Promise<void> {
  await updateAttendance(id, { status });
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

export async function createPayment(input: {
  worker_id: string;
  pay_date: string;
  amount: number;
  kind: PaymentKind;
  note: string | null;
  method: PayMethod;
}): Promise<void> {
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

export type MoneyInput = { amount: number; description: string | null; category: string; method: PayMethod; site: string | null };

export async function createIncome(input: MoneyInput & { income_date: string }): Promise<void> {
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

export async function createExpense(input: MoneyInput & { expense_date: string }): Promise<void> {
  check(await supabase.from('expenses').insert(input));
}

export async function deleteExpense(id: string): Promise<void> {
  check(await supabase.from('expenses').delete().eq('id', id));
}

// ───────── Bütçeler ─────────

export async function listBudgets(): Promise<Budget[]> {
  return check(await supabase.from('budgets').select('category, monthly_limit')).map((b: Budget) => num(b, 'monthly_limit'));
}

export async function setBudget(category: string, monthly_limit: number | null): Promise<void> {
  if (monthly_limit === null || monthly_limit <= 0) check(await supabase.from('budgets').delete().eq('category', category));
  else check(await supabase.from('budgets').upsert({ category, monthly_limit }, { onConflict: 'owner_id,category' }));
}

/** Daha önce girilmiş şantiye adları (öneri olarak) */
export async function listSites(): Promise<string[]> {
  const [a, b] = await Promise.all([
    supabase.from('expenses').select('site').not('site', 'is', null).limit(500),
    supabase.from('incomes').select('site').not('site', 'is', null).limit(500),
  ]);
  const rows = [...(check(a) as { site: string }[]), ...(check(b) as { site: string }[])];
  return [...new Set(rows.map((r) => r.site.trim()).filter(Boolean))].sort((x, y) => x.localeCompare(y, 'tr'));
}
