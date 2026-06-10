'use client';

import React from 'react';
import RagasScoresPanel from '@/components/analytics/ragas-scores';
import { useRagTrace } from '@/hooks/use-rag-trace';

export default function RagasPage() {
  const { trace, lastAnswer } = useRagTrace();

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">RAG Quality Evaluation (RAGAS-Lite)</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Real-time scoring of Faithfulness, Answer Relevance, and Retrieval Recall
        </p>
      </div>
      <RagasScoresPanel trace={trace} lastAnswer={lastAnswer} />
    </div>
  );
}
