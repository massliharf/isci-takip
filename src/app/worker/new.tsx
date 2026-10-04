import { router } from 'expo-router';
import { Screen } from '../../components/ui';
import { WorkerForm } from '../../components/WorkerForm';
import { createWorker } from '../../lib/api';

export default function NewWorker() {
  return (
    <Screen>
      <WorkerForm
        submitLabel="Kaydet"
        onSubmit={async (input) => {
          const w = await createWorker(input);
          router.replace(`/worker/${w.id}`);
        }}
      />
    </Screen>
  );
}
