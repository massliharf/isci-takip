import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Ekran her odaklandığında ve `key` değiştiğinde veriyi yeniden yükler.
 * `key`, loader'ın bağlı olduğu değerlerden oluşan bir metindir (ör. seçili tarih).
 */
export function useFocusData<T>(loader: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  useLayoutEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
      // key, loader'ın girdileri değiştiğinde yeniden yüklemeyi tetikler
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, key]),
  );

  return { data, setData, error, loading, reload };
}
