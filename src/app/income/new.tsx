import { router } from 'expo-router';
import { MoneyEntryForm } from '../../components/MoneyEntryForm';
import { Screen } from '../../components/ui';
import { createIncome } from '../../lib/api';

export default function NewIncome() {
  return (
    <Screen>
      <MoneyEntryForm
        kind="income"
        onSubmit={async ({ date, ...rest }) => {
          await createIncome({ income_date: date, ...rest });
          router.back();
        }}
      />
    </Screen>
  );
}
