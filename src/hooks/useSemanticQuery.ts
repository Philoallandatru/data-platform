import { useCallback, useEffect, useState } from 'react';

export interface SemanticQueryParams {
  dataset: string;
  datasource?: string;
  metrics: string[];
  groupBy?: string[];
  where?: Record<string, string | number>;
  orderBy?: { field: string; dir?: 'asc' | 'desc' };
  limit?: number;
}

export interface SemanticQueryResult<T = Record<string, any>> {
  datasource: string;
  dataset: string;
  elapsedMs: number;
  rowCount: number;
  rows: T[];
}

export function useSemanticQuery<T = Record<string, any>>(params: SemanticQueryParams | null) {
  const [data, setData] = useState<SemanticQueryResult<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = params ? JSON.stringify(params) : '';

  const refetch = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/semantic/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: key,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Semantic query failed');
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
