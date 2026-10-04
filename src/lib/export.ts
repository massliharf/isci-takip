import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { csvContent, type CsvRow } from './csv';

export { safeFileName } from './csv';

async function shareNativeFile(file: File, mimeType: string, uti: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Bu cihazda paylaşım desteklenmiyor');
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle });
}

function writeCacheFile(name: string, content: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  return file;
}

function downloadOnWeb(name: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Excel'de açılan CSV (Türkçe Excel için `;` ayraçlı, UTF-8 BOM'lu) */
export async function exportCsv(baseName: string, rows: CsvRow[]): Promise<void> {
  const name = `${baseName}.csv`;
  const content = csvContent(rows);
  if (Platform.OS === 'web') return downloadOnWeb(name, content, 'text/csv;charset=utf-8');
  await shareNativeFile(writeCacheFile(name, content), 'text/csv', 'public.comma-separated-values-text', name);
}

export async function exportJson(baseName: string, data: unknown): Promise<void> {
  const name = `${baseName}.json`;
  const content = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web') return downloadOnWeb(name, content, 'application/json');
  await shareNativeFile(writeCacheFile(name, content), 'application/json', 'public.json', name);
}

/** HTML'den PDF üretip paylaşır. Web'de yazdırma penceresi açılır ("PDF olarak kaydet"). */
export async function exportPdf(baseName: string, html: string): Promise<void> {
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) throw new Error('Tarayıcının açılır pencere engelini kapatıp tekrar deneyin.');
    w.document.write(html.replace('<title></title>', `<title>${baseName}</title>`));
    w.document.close();
    w.focus();
    w.print();
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  // Paylaşılan dosya anlamlı bir adla gitsin (WhatsApp'ta "Mehmet-Kaya-Ekim-2026.pdf" gibi)
  const target = new File(Paths.cache, `${baseName}.pdf`);
  if (target.exists) target.delete();
  await new File(uri).move(target);
  await shareNativeFile(target, 'application/pdf', 'com.adobe.pdf', baseName);
}
