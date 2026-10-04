import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthReport, monthlyHistory, openingBalances, puantajGrid, summarizeWorker } from './calc.ts';
import { csvContent, safeFileName } from './csv.ts';
import { formatMoney, formatNumber, monthRange, parseMoney } from './format.ts';
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
  assert.equal(formatMoney(1234567.5), '1.234.567,50\u00A0₺');
  assert.equal(formatMoney(-1500), '-1.500\u00A0₺');
  assert.equal(formatNumber(30.5), '30,5');
  assert.equal(parseMoney('1.250,50'), 1250.5);
  assert.equal(parseMoney('1500'), 1500);
  assert.deepEqual(monthRange(2026, 1), { start: '2026-02-01', end: '2026-02-28' });
});

test('devreden bakiye: tüm zamanlar − dönem başından sonraki hareketler', () => {
  // Toplam bakiye 5000; ay içinde 2 gün (2000) çalıştı, 500 avans aldı → ay başında 3500 alacaklıydı
  const o = openingBalances(
    [{ worker_id: 'w1', balance: 5000 }],
    [att('2026-10-01', 'full'), att('2026-10-02', 'full')],
    [{ worker_id: 'w1', amount: 500 }],
  );
  assert.equal(o.get('w1'), 3500);
});

test('aylık rapor devreden ve ay sonu bakiyeyi taşır', () => {
  const r = buildMonthReport([w], [att('2026-10-01', 'full')], [], [], [], new Map([['w1', 2000]]));
  assert.equal(r.workers[0].opening, 2000);
  assert.equal(r.workers[0].closing, 3000);
  assert.equal(r.totalClosing, 3000);
  // Bu ay hareketi olmasa da devreden bakiyesi olan işçi raporda görünür
  const empty = buildMonthReport([w], [], [], [], [], new Map([['w1', 750]]));
  assert.equal(empty.workers.length, 1);
});

test('aylık geçmiş: aylara böler ve kümülatif bakiye hesaplar', () => {
  const rows = monthlyHistory(
    [att('2026-09-30', 'full'), att('2026-10-01', 'half'), att('2026-10-02', 'leave')],
    [{ id: 'p', worker_id: 'w1', pay_date: '2026-10-05', amount: 1200, kind: 'payment', note: null }],
  );
  assert.deepEqual(rows.map((r) => [r.key, r.workedDays, r.earned, r.paid, r.cumulative]), [
    ['2026-09', 1, 1000, 0, 1000],
    ['2026-10', 0.5, 500, 1200, 300],
  ]);
  assert.equal(rows[1].month, 9);
  assert.equal(rows[1].leaveDays, 1);
});

test('puantaj cetveli: işçi × gün, kaydı olmayan işçi listelenmez', () => {
  const grid = puantajGrid(
    [{ id: 'w1', full_name: 'Ali', daily_wage: 1000 }, { id: 'w2', full_name: 'Boş', daily_wage: 900 }],
    [att('2026-10-01', 'full'), att('2026-10-03', 'absent')],
    31,
  );
  assert.equal(grid.length, 1);
  assert.equal(grid[0].cells.length, 31);
  assert.deepEqual(grid[0].cells.slice(0, 4), ['full', null, 'absent', null]);
  assert.equal(grid[0].earned, 1000);
});

test('CSV: Excel için ; ayraç, BOM, ondalık virgül ve kaçış', () => {
  const s = csvContent([['Ad', 'Tutar'], ['Ali; Veli', 1250.5], ['"Usta"', null]]);
  assert.ok(s.startsWith('﻿'));
  assert.equal(s.slice(1), 'Ad;Tutar\r\n"Ali; Veli";1250,5\r\n"""Usta""";');
  assert.equal(safeFileName('Mehmet Çelik – Ekim 2026'), 'Mehmet-Celik-Ekim-2026');
  assert.equal(safeFileName('İşçi Şükrü Ğ'), 'Isci-Sukru-G');
});
