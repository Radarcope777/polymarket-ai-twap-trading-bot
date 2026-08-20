import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL ?? '';

export function useApi<T>(path: string, interval = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const fetchData = async () => {
      try {
        const res = await fetch(`${API}/api${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    if (interval > 0) timer = setInterval(fetchData, interval);
    return () => clearInterval(timer);
  }, [path, interval]);

  return { data, loading, error };
}

export function useSocket<T>(event: string) {
  const [payload, setPayload] = useState<T | null>(null);

  useEffect(() => {
    const socket = io(API || undefined, { path: '/socket.io' });
    socket.on(event, setPayload);
    return () => { socket.disconnect(); };
  }, [event]);

  return payload;
}

export function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function formatPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatPrice(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
