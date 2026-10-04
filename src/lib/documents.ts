// Dışa aktarılan belgeler: PDF için HTML, Excel için CSV satırları.
// Saf fonksiyonlar; UI ve platformdan bağımsızdır.
import { STATUS_CODE, attendanceEarning, type GridRow, type MonthHistoryRow, type MonthReport, type WorkerSummary } from './calc';
import type { CsvRow } from './csv';
import { formatDate, formatMoney, formatNumber, fromISODate, MONTHS } from './format';
import { PAYMENT_LABELS, STATUS_LABELS, type Attendance, type Expense, type Income, type Payment, type Worker } from './types';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const DAY_MIN = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
const STATUS_BG: Record<string, string> = { full: '#d4f5e8', half: '#dfe4fd', leave: '#e9e1f8', absent: '#fbdcdd' };

export const monthLabel = (year: number, month: number) => `${MONTHS[month]} ${year}`;

function page(title: string, business: string, body: string, landscape = false): string {
  const printed = formatDate(new Date().toISOString().slice(0, 10));
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8" /><title></title>
  <style>
    @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 12px; margin: 0; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0; }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: #616161; margin: 20px 0 6px; }
    .muted { color: #616161; }
    .kpis { display: flex; gap: 8px; }
    .kpi { flex: 1; background: #f5f5f5; border-radius: 8px; padding: 10px 12px; }
    .kpi .l { font-size: 10px; text-transform: uppercase; color: #616161; letter-spacing: .3px; }
    .kpi .v { font-size: 16px; font-weight: 700; margin-top: 2px; }
    .pos { color: #0e8a5f; } .neg { color: #d93036; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #e3e3e3; text-align: right; white-space: nowrap; }
    th { font-size: 10px; text-transform: uppercase; color: #616161; font-weight: 600; background: #f5f5f5; }
    th:first-child, td:first-child { text-align: left; }
    td.l, th.l { text-align: left; white-space: normal; }
    tfoot td { font-weight: 700; border-top: 2px solid #1a1a1a; border-bottom: none; }
    .grid th, .grid td { padding: 3px 2px; text-align: center; font-size: 9px; border: 1px solid #e3e3e3; }
    .grid td:first-child, .grid th:first-child { text-align: left; padding-left: 6px; font-size: 10px; }
    .legend { margin-top: 8px; font-size: 10px; color: #616161; }
    footer { margin-top: 24px; font-size: 10px; color: #737373; }
  </style></head><body>
  <header><div><h1>${esc(title)}</h1>${business ? `<div class="muted">${esc(business)}</div>` : ''}</div>
  <div class="muted">Düzenlenme: ${printed}</div></header>
  ${body}
  <footer>İşçi Takip ile hazırlanmıştır.</footer>
  </body></html>`;
}

const money = (n: number, signed = false) => `<span class="${signed ? (n < 0 ? 'neg' : n > 0 ? 'pos' : '') : ''}">${formatMoney(n)}</span>`;
const kpi = (label: string, value: string) => `<div class="kpi"><div class="l">${esc(label)}</div><div class="v">${value}</div></div>`;

// ───────── Aylık işletme raporu ─────────

export function monthReportHtml(title: string, business: string, r: MonthReport): string {
  const rows = r.workers
    .map(
      (w) => `<tr><td>${esc(w.name)}</td><td>${formatNumber(w.workedDays)}</td><td>${w.leaveDays}</td><td>${w.absentDays}</td>
      <td>${formatMoney(w.opening)}</td><td>${formatMoney(w.earned)}</td><td>${formatMoney(w.paid)}</td><td><b>${money(w.closing, true)}</b></td></tr>`,
    )
    .join('');
  const body = `
  <div class="kpis">
    ${kpi('Gelir', money(r.totalIncome))}
    ${kpi('İşçilik', money(r.totalLabor))}
    ${kpi('Diğer gider', money(r.totalOtherExpense))}
    ${kpi('Net kalan', money(r.net, true))}
  </div>
  <h2>Kasa</h2>
  <table>
    <tr><td>İşçilere fiilen verilen (avans + ödeme)</td><td>${formatMoney(r.totalPaid)}</td></tr>
    <tr><td>Kasa net (gelir − verilen − diğer giderler)</td><td>${money(r.cashNet, true)}</td></tr>
    <tr><td>Ay başında işçilere borç (devreden)</td><td>${formatMoney(r.totalOpening)}</td></tr>
    <tr><td><b>Ay sonunda işçilere borç</b></td><td><b>${formatMoney(r.totalClosing)}</b></td></tr>
  </table>
  <h2>İşçi bazında</h2>
  <table>
    <thead><tr><th>İşçi</th><th>Gün</th><th>İzin</th><th>Gelmedi</th><th>Devreden</th><th>Hak edilen</th><th>Verilen</th><th>Kalan</th></tr></thead>
    <tbody>${rows || '<tr><td class="l" colspan="8">Kayıt yok</td></tr>'}</tbody>
    <tfoot><tr><td>Toplam</td><td></td><td></td><td></td><td>${formatMoney(r.totalOpening)}</td><td>${formatMoney(r.totalLabor)}</td><td>${formatMoney(r.totalPaid)}</td><td>${formatMoney(r.totalClosing)}</td></tr></tfoot>
  </table>`;
  return page(title, business, body);
}

export function monthReportCsv(r: MonthReport): CsvRow[] {
  return [
    ['İşçi', 'Tam gün', 'Yarım gün', 'İzinli', 'Gelmedi', 'Çalışılan gün', 'Devreden', 'Hak edilen', 'Avans', 'Ödeme', 'Kalan'],
    ...r.workers.map((w) => [w.name, w.fullDays, w.halfDays, w.leaveDays, w.absentDays, w.workedDays, w.opening, w.earned, w.advances, w.payments, w.closing]),
    [],
    ['Toplam gelir', r.totalIncome],
    ['İşçilik gideri', r.totalLabor],
    ['Diğer giderler', r.totalOtherExpense],
    ['Net kalan', r.net],
    ['İşçilere verilen', r.totalPaid],
    ['Kasa net', r.cashNet],
  ];
}

// ───────── İşçi aylık hesap ekstresi ─────────

export function workerStatementHtml(
  business: string,
  worker: Pick<Worker, 'full_name' | 'phone' | 'daily_wage'>,
  year: number,
  month: number,
  s: WorkerSummary,
  attendance: Attendance[],
  payments: Payment[],
): string {
  const days = [...attendance]
    .sort((a, b) => a.work_date.localeCompare(b.work_date))
    .map((a) => {
      const d = fromISODate(a.work_date);
      return `<tr><td>${formatDate(a.work_date)} <span class="muted">${DAY_SHORT[d.getDay()]}</span></td><td class="l">${STATUS_LABELS[a.status]}</td><td>${formatMoney(Number(a.daily_wage))}</td><td>${formatMoney(attendanceEarning(a))}</td></tr>`;
    })
    .join('');
  const pays = [...payments]
    .sort((a, b) => a.pay_date.localeCompare(b.pay_date))
    .map((p) => `<tr><td>${formatDate(p.pay_date)}</td><td class="l">${PAYMENT_LABELS[p.kind]}${p.note ? ` — ${esc(p.note)}` : ''}</td><td>${formatMoney(Number(p.amount))}</td></tr>`)
    .join('');
  const body = `
  <p><b>${esc(worker.full_name)}</b>${worker.phone ? ` · ${esc(worker.phone)}` : ''} · Güncel yevmiye ${formatMoney(Number(worker.daily_wage))}</p>
  <div class="kpis">
    ${kpi('Devreden', money(s.opening))}
    ${kpi(`Hak edilen (${formatNumber(s.workedDays)} gün)`, money(s.earned))}
    ${kpi('Verilen', money(s.paid))}
    ${kpi(s.closing < 0 ? 'Fazla ödenen' : 'Kalan alacak', money(Math.abs(s.closing), false))}
  </div>
  <h2>Puantaj — ${s.fullDays} tam, ${s.halfDays} yarım, ${s.leaveDays} izinli, ${s.absentDays} gelmedi</h2>
  <table>
    <thead><tr><th>Tarih</th><th class="l">Durum</th><th>Yevmiye</th><th>Hak edilen</th></tr></thead>
    <tbody>${days || '<tr><td class="l" colspan="4">Kayıt yok</td></tr>'}</tbody>
    <tfoot><tr><td>Toplam</td><td class="l">${formatNumber(s.workedDays)} gün</td><td></td><td>${formatMoney(s.earned)}</td></tr></tfoot>
  </table>
  <h2>Avans ve ödemeler</h2>
  <table>
    <thead><tr><th>Tarih</th><th class="l">Açıklama</th><th>Tutar</th></tr></thead>
    <tbody>${pays || '<tr><td class="l" colspan="3">Kayıt yok</td></tr>'}</tbody>
    <tfoot><tr><td>Toplam</td><td></td><td>${formatMoney(s.paid)}</td></tr></tfoot>
  </table>
  <h2>Hesap</h2>
  <table>
    <tr><td>Önceki aylardan devreden</td><td>${formatMoney(s.opening)}</td></tr>
    <tr><td>+ Bu ay hak edilen</td><td>${formatMoney(s.earned)}</td></tr>
    <tr><td>− Bu ay verilen</td><td>${formatMoney(s.paid)}</td></tr>
    <tr><td><b>${s.closing < 0 ? 'Fazla ödenen (işçinin borcu)' : 'Kalan alacak'}</b></td><td><b>${formatMoney(Math.abs(s.closing))}</b></td></tr>
  </table>`;
  return page(`Hesap ekstresi · ${monthLabel(year, month)}`, business, body);
}

// ───────── İşçi tüm geçmiş ─────────

export function workerHistoryHtml(business: string, worker: Pick<Worker, 'full_name' | 'phone' | 'daily_wage'>, rows: MonthHistoryRow[]): string {
  const sum = (k: 'workedDays' | 'earned' | 'paid') => rows.reduce((t, r) => t + r[k], 0);
  const body = `
  <p><b>${esc(worker.full_name)}</b>${worker.phone ? ` · ${esc(worker.phone)}` : ''} · Güncel yevmiye ${formatMoney(Number(worker.daily_wage))}</p>
  <div class="kpis">
    ${kpi('Toplam gün', formatNumber(sum('workedDays')))}
    ${kpi('Toplam hak edilen', money(sum('earned')))}
    ${kpi('Toplam verilen', money(sum('paid')))}
    ${kpi('Güncel bakiye', money(rows.at(-1)?.cumulative ?? 0, true))}
  </div>
  <h2>Ay ay</h2>
  <table>
    <thead><tr><th>Ay</th><th>Tam</th><th>Yarım</th><th>İzin</th><th>Gelmedi</th><th>Gün</th><th>Hak edilen</th><th>Verilen</th><th>Ay farkı</th><th>Bakiye</th></tr></thead>
    <tbody>${rows
      .map(
        (r) => `<tr><td>${monthLabel(r.year, r.month)}</td><td>${r.fullDays}</td><td>${r.halfDays}</td><td>${r.leaveDays}</td><td>${r.absentDays}</td><td>${formatNumber(r.workedDays)}</td>
        <td>${formatMoney(r.earned)}</td><td>${formatMoney(r.paid)}</td><td>${money(r.balance, true)}</td><td><b>${formatMoney(r.cumulative)}</b></td></tr>`,
      )
      .join('') || '<tr><td class="l" colspan="10">Kayıt yok</td></tr>'}</tbody>
  </table>`;
  return page('İşçi geçmişi', business, body);
}

export function workerHistoryCsv(name: string, rows: MonthHistoryRow[]): CsvRow[] {
  return [
    [name],
    ['Ay', 'Tam gün', 'Yarım gün', 'İzinli', 'Gelmedi', 'Çalışılan gün', 'Hak edilen', 'Verilen', 'Ay farkı', 'Bakiye'],
    ...rows.map((r) => [monthLabel(r.year, r.month), r.fullDays, r.halfDays, r.leaveDays, r.absentDays, r.workedDays, r.earned, r.paid, r.balance, r.cumulative]),
  ];
}

/** Tek işçinin tüm hareketleri (gün gün ve ödeme ödeme) */
export function workerLedgerCsv(name: string, attendance: Attendance[], payments: Payment[]): CsvRow[] {
  const items = [
    ...attendance.map((a) => ({ date: a.work_date, row: [formatDate(a.work_date), 'Puantaj', STATUS_LABELS[a.status], Number(a.daily_wage), attendanceEarning(a), null] as CsvRow })),
    ...payments.map((p) => ({ date: p.pay_date, row: [formatDate(p.pay_date), PAYMENT_LABELS[p.kind], p.note ?? '', null, null, Number(p.amount)] as CsvRow })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return [[name], ['Tarih', 'Tür', 'Açıklama', 'Yevmiye', 'Hak edilen', 'Verilen'], ...items.map((i) => i.row)];
}

// ───────── Puantaj cetveli ─────────

export function puantajGridHtml(title: string, business: string, grid: GridRow[], year: number, month: number, daysInMonth: number): string {
  const dayHead = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1).getDay();
    return `<th style="${d === 0 ? 'color:#d93036' : ''}">${i + 1}<br/>${DAY_MIN[d]}</th>`;
  }).join('');
  const rows = grid
    .map(
      (r) => `<tr><td>${esc(r.name)}</td>${r.cells
        .map((c) => `<td style="background:${c ? STATUS_BG[c] : 'transparent'}">${c ? STATUS_CODE[c] : ''}</td>`)
        .join('')}<td><b>${formatNumber(r.workedDays)}</b></td><td>${formatMoney(r.earned)}</td></tr>`,
    )
    .join('');
  const total = grid.reduce((t, r) => t + r.earned, 0);
  const body = `
  <table class="grid">
    <thead><tr><th>İşçi</th>${dayHead}<th>Gün</th><th>Tutar</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="${daysInMonth + 3}">Kayıt yok</td></tr>`}</tbody>
    <tfoot><tr><td>Toplam</td><td colspan="${daysInMonth + 1}"></td><td>${formatMoney(total)}</td></tr></tfoot>
  </table>
  <div class="legend">T: Tam gün · Y: Yarım gün · İ: İzinli · X: Gelmedi</div>`;
  return page(title, business, body, true);
}

export function puantajGridCsv(grid: GridRow[], daysInMonth: number): CsvRow[] {
  return [
    ['İşçi', 'Yevmiye', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), 'Çalışılan gün', 'Hak edilen'],
    ...grid.map((r) => [r.name, r.dailyWage, ...r.cells.map((c) => (c ? STATUS_CODE[c] : '')), r.workedDays, r.earned]),
    [],
    ['T: Tam gün', 'Y: Yarım gün', 'İ: İzinli', 'X: Gelmedi'],
  ];
}

// ───────── Kasa ─────────

export function cashCsv(incomes: Income[], payments: Payment[], expenses: Expense[], workerName: (id: string) => string): CsvRow[] {
  const items = [
    ...incomes.map((i) => ({ date: i.income_date, row: [formatDate(i.income_date), 'Gelir', i.description ?? '', Number(i.amount)] as CsvRow })),
    ...payments.map((p) => ({
      date: p.pay_date,
      row: [formatDate(p.pay_date), PAYMENT_LABELS[p.kind], `${workerName(p.worker_id)}${p.note ? ` — ${p.note}` : ''}`, -Number(p.amount)] as CsvRow,
    })),
    ...expenses.map((e) => ({ date: e.expense_date, row: [formatDate(e.expense_date), 'Gider', e.description ?? '', -Number(e.amount)] as CsvRow })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const total = items.reduce((t, i) => t + Number(i.row[3]), 0);
  return [['Tarih', 'Tür', 'Açıklama', 'Tutar'], ...items.map((i) => i.row), [], ['', '', 'Net', total]];
}
