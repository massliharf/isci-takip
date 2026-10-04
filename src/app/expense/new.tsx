import { router } from 'expo-router';
import { MoneyEntryForm } from '../../components/MoneyEntryForm';
import { Screen } from '../../components/ui';
import { createExpense } from '../../lib/api';

export default function NewExpense() {
  return (
    <Screen>
      <MoneyEntryForm
        descriptionLabel="Açıklama (ör. malzeme, nakliye)"
        descriptionPresets={['Malzeme', 'Nakliye', 'Yemek', 'Yakıt', 'Alet / ekipman']}
        successLabel="Gider kaydedildi"
        onSubmit={async ({ date, amount, description }) => {
          await createExpense({ expense_date: date, amount, description });
          router.back();
        }}
      />
    </Screen>
  );
}
