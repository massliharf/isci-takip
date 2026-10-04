import { router } from 'expo-router';
import { MoneyEntryForm } from '../../components/MoneyEntryForm';
import { Screen } from '../../components/ui';
import { createExpense } from '../../lib/api';

export default function NewExpense() {
  return (
    <Screen>
      <MoneyEntryForm
        kind="expense"
        onSubmit={async ({ date, ...rest }) => {
          await createExpense({ expense_date: date, ...rest });
          router.back();
        }}
      />
    </Screen>
  );
}
