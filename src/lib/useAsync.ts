import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/** Ekran her odaklandığında ve deps değiştiğinde veriyi yeniden yükler */
export function useFocusData<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      reload();
    }, deps),
  );

  return { data, setData, error, loading, reload };
}
