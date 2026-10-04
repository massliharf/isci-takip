import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { Button, ErrorText, Loading, Screen } from '../../../components/ui';
import { WorkerForm } from '../../../components/WorkerForm';
import { deleteWorker, getWorker, updateWorker } from '../../../lib/api';
import { useFocusData } from '../../../lib/useAsync';

export default function EditWorker() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: worker, error } = useFocusData(() => getWorker(id), [id]);

  function confirmDelete() {
    Alert.alert('İşçiyi sil', 'İşçiye ait tüm puantaj ve ödeme kayıtları da silinecek. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWorker(id);
            router.dismissAll();
          } catch (e) {
            Alert.alert('Silinemedi', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
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
            submitLabel="Güncelle"
            onSubmit={async (input) => {
              await updateWorker(id, input);
              router.back();
            }}
          />
          <Button title="İşçiyi Sil" variant="danger" onPress={confirmDelete} />
        </>
      )}
    </Screen>
  );
}
