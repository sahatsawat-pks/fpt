'use client';

import { useEffect, useState } from 'react';
import { DUEL_SYNC_KEY } from './duel-utils';

export function useDuelQuestions() {
  const [questions, setQuestions] = useState([]);
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/duel/questions', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to load duel questions');
      }

      setQuestions(data.questions || []);
      setCsv(data.csv || '');
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    const handleStorage = (event) => {
      if (event.key === DUEL_SYNC_KEY) {
        refresh();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { questions, csv, loading, error, refresh };
}
