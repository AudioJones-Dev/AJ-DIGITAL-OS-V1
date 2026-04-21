import { useCallback, useEffect, useRef, useState } from "react";

interface UsePollingOptions<T> {
  /** Async fetcher — called every interval. */
  fetcher: () => Promise<T>;
  /** Polling interval in ms. Default 10 000. */
  interval?: number;
  /** Start polling immediately. Default true. */
  enabled?: boolean;
}

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Force an immediate refetch. */
  refetch: () => void;
}

/**
 * Generic polling hook. Calls `fetcher` on mount and every `interval` ms.
 * Cancels in-flight requests on unmount.
 */
export function usePolling<T>({
  fetcher,
  interval = 10_000,
  enabled = true,
}: UsePollingOptions<T>): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const doFetch = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    doFetch();
    const id = setInterval(doFetch, interval);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [doFetch, interval, enabled]);

  return { data, loading, error, refetch: doFetch };
}
