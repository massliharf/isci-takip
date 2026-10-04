import type { MonthReport } from './calc';
import { formatMoney } from './format';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function buildReportHtml(title: string, business: string, r: MonthReport): string {
  const rows = r.workers
    .map(
      (w) => `<tr>
        <td>${esc(w.name)}</td>
        <td>${w.fullDays}</td><td>${w.halfDays}</td><td>${w.leaveDays}</td><td>${w.absentDays}</td>
        <td>${formatMoney(w.earned)}</td><td>${formatMoney(w.paid)}</td><td><b>${formatMoney(w.balance)}</b></td>
      </tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, Roboto, sans-serif; padding: 24px; color: #1c1f23; }
    h1 { margin: 0 } h2 { margin-top: 28px }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    th { background: #f4f5f7; }
    .sum td { font-size: 14px; }
  </style></head><body>
  <h1>${esc(title)}</h1>
  <div>${esc(business)}</div>
  <h2>Özet</h2>
  <table class="sum">
    <tr><td>Toplam gelir</td><td>${formatMoney(r.totalIncome)}</td></tr>
    <tr><td>İşçilik gideri (hak edilen yevmiye)</td><td>${formatMoney(r.totalLabor)}</td></tr>
    <tr><td>Diğer giderler</td><td>${formatMoney(r.totalOtherExpense)}</td></tr>
    <tr><td><b>Net kalan (gelir − işçilik − giderler)</b></td><td><b>${formatMoney(r.net)}</b></td></tr>
    <tr><td>İşçilere fiilen verilen (avans + ödeme)</td><td>${formatMoney(r.totalPaid)}</td></tr>
    <tr><td>Kasa net (gelir − verilen − giderler)</td><td>${formatMoney(r.cashNet)}</td></tr>
  </table>
  <h2>İşçi bazında</h2>
  <table>
    <tr><th>İşçi</th><th>Tam</th><th>Yarım</th><th>İzin</th><th>Gelmedi</th><th>Hak edilen</th><th>Verilen</th><th>Fark</th></tr>
    ${rows || '<tr><td colspan="8">Kayıt yok</td></tr>'}
  </table>
  </body></html>`;
}
