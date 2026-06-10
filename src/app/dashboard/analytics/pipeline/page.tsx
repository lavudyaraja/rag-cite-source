'use client';

import React from 'react';
import PipelineTraceFlow from '@/components/analytics/pipeline-trace-flow';
import { useRagTrace } from '@/hooks/use-rag-trace';

export default function PipelineTracePage() {
  const { trace } = useRagTrace();

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Visual Pipeline Trace</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Step-by-step flowchart tracking query rewriting, retrieval rank changes, and prompt construction
        </p>
      </div>
      <PipelineTraceFlow trace={trace} />
    </div>
  );
}
