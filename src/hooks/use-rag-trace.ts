'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadLastTrace, loadLastAnswer } from '@/lib/trace-store';
import type { RagTrace } from '@/types/rag';

export function useRagTrace() {
  const [trace, setTrace] = useState<RagTrace | null>(null);
  const [lastAnswer, setLastAnswer] = useState('');

  useEffect(() => {
    setTrace(loadLastTrace());
    setLastAnswer(loadLastAnswer());
  }, []);

  const refresh = useCallback(() => {
    setTrace(loadLastTrace());
    setLastAnswer(loadLastAnswer());
  }, []);

  return { trace, lastAnswer, setTrace, refresh };
}
