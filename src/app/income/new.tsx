import { router } from 'expo-router';
import { MoneyEntryForm } from '../../components/MoneyEntryForm';
import { Screen } from '../../components/ui';
import { createIncome } from '../../lib/api';

export default function NewIncome() {
  return (
    <Screen>
      <MoneyEntryForm
        descriptionLabel="Açıklama (ör. X şantiyesi hakediş)"
        descriptionPresets={['Hakediş', 'Avans (müşteri)', 'Kalan ödeme', 'Ek iş']}
        successLabel="Gelir kaydedildi"
        onSubmit={async ({ date, amount, description }) => {
          await createIncome({ income_date: date, amount, description });
          router.back();
        }}
      />
    </Screen>
  );
}
