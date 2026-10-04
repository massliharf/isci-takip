import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthReport, summarizeWorker } from './calc.ts';
import { formatMoney, monthRange, parseMoney } from './format.ts';
import type { Attendance, Payment } from './types.ts';

const w = { id: 'w1', full_name: 'Ali' };
const att = (date: string, status: Attendance['status'], wage = 1000): Attendance => ({
  id: date, worker_id: 'w1', work_date: date, status, daily_wage: wage, note: null,
});

test('işçi alacağı: tam + yarım gün - avans', () => {
  const a = [att('2026-10-01', 'full'), att('2026-10-02', 'half'), att('2026-10-03', 'leave'), att('2026-10-04', 'absent', 1200)];
  const p: Payment[] = [{ id: 'p', worker_id: 'w1', pay_date: '2026-10-02', amount: 400, kind: 'advance', note: null }];
  const s = summarizeWorker(w, a, p);
  assert.equal(s.workedDays, 1.5);
  assert.equal(s.earned, 1500);
  assert.equal(s.advances, 400);
  assert.equal(s.balance, 1100);
  assert.equal(s.leaveDays, 1);
  assert.equal(s.absentDays, 1);
});

test('yevmiye değişse de geçmiş günler kendi yevmiyesiyle hesaplanır', () => {
  const s = summarizeWorker(w, [att('2026-10-01', 'full', 1000), att('2026-10-02', 'full', 1500)], []);
  assert.equal(s.earned, 2500);
});

test('aylık rapor: gelir - işçilik - gider', () => {
  const r = buildMonthReport(
    [w, { id: 'w2', full_name: 'Boş' }],
    [att('2026-10-01', 'full', 2000)],
    [{ id: 'p', worker_id: 'w1', pay_date: '2026-10-02', amount: 500, kind: 'payment', note: null }],
    [{ id: 'i', income_date: '2026-10-05', amount: 10000, description: null }],
    [{ id: 'e', expense_date: '2026-10-05', amount: 1000, description: null }],
  );
  assert.equal(r.workers.length, 1);
  assert.equal(r.totalLabor, 2000);
  assert.equal(r.net, 7000);
  assert.equal(r.cashNet, 8500);
});

test('format yardımcıları', () => {
  assert.equal(formatMoney(1234567.5), '1.234.567,50 ₺');
  assert.equal(parseMoney('1.250,50'), 1250.5);
  assert.equal(parseMoney('1500'), 1500);
  assert.deepEqual(monthRange(2026, 1), { start: '2026-02-01', end: '2026-02-28' });
});
