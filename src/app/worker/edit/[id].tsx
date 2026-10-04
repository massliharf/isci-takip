import { router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorText, Loading, Screen } from '../../../components/ui';
import { WorkerForm } from '../../../components/WorkerForm';
import { deleteWorker, getWorker, updateWorker } from '../../../lib/api';
import { confirmAction, errorMessage, showMessage } from '../../../lib/dialog';
import { useFocusData } from '../../../lib/useAsync';

export default function EditWorker() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: worker, error } = useFocusData(() => getWorker(id), id);

  function confirmDelete() {
    confirmAction({
      title: 'İşçiyi sil',
      message: 'İşçiye ait tüm puantaj ve ödeme kayıtları da silinecek. Emin misiniz?',
      confirmText: 'Sil',
      onConfirm: async () => {
        try {
          await deleteWorker(id);
          router.dismissAll();
        } catch (e) {
          showMessage('Silinemedi', errorMessage(e));
        }
      },
    });
  }

  return (
    <Screen>
      <ErrorText>{error}</ErrorText>
      {!worker ? (
        <Loading />
      ) : (
        <>
          <WorkerForm
            initial={worker}
            submitLabel="Kaydet"
            onSubmit={async (input) => {
              await updateWorker(id, input);
              router.back();
            }}
          />
          <Button title="İşçiyi sil" icon="trash-2" variant="danger" onPress={confirmDelete} />
        </>
      )}
    </Screen>
  );
}
