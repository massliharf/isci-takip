import { useState } from 'react';
import { errorMessage } from '../lib/dialog';
import { palette } from '../theme/tokens';
import { useToast } from './Toast';
import { ActionMenu, Button, type IconName } from './ui';

export type ExportOption = {
  label: string;
  subtitle: string;
  icon: IconName;
  kind: 'pdf' | 'excel' | 'data';
  run: () => Promise<void>;
};

const KIND_TONE = {
  pdf: { color: '#D93036', soft: 'rgba(217,48,54,0.10)' },
  excel: { color: '#0E8A5F', soft: 'rgba(14,138,95,0.10)' },
  data: { color: palette.textSecondary, soft: palette.control },
};

/** "Dışa aktar" butonu + biçim seçtiren alt menü. Hataları bildirim olarak gösterir. */
export function ExportMenu({ title, options, label = 'Dışa aktar' }: { title: string; options: ExportOption[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function run(o: ExportOption) {
    setBusy(true);
    try {
      await o.run();
    } catch (e) {
      toast(`Dışa aktarılamadı: ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button title={label} icon="download" variant="secondary" onPress={() => setOpen(true)} loading={busy} />
      <ActionMenu
        visible={open}
        title={title}
        onClose={() => setOpen(false)}
        items={options.map((o) => ({ label: o.label, subtitle: o.subtitle, icon: o.icon, ...KIND_TONE[o.kind], onPress: () => run(o) }))}
      />
    </>
  );
}
