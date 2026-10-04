import { router } from 'expo-router';
import { MoneyEntryForm } from '../../components/MoneyEntryForm';
import { Screen } from '../../components/ui';
import { createIncome } from '../../lib/api';

export default function NewIncome() {
  return (
    <Screen>
      <MoneyEntryForm
        descriptionLabel="Açıklama (ör. X şantiyesi hakediş)"
        onSubmit={async ({ date, amount, description }) => {
          await createIncome({ income_date: date, amount, description });
          router.back();
        }}
      />
    </Screen>
  );
}
