'use client';

import React from 'react';
import RrfHeatmap from '@/components/analytics/rrf-heatmap';
import { useRagTrace } from '@/hooks/use-rag-trace';

export default function RrfHeatmapPage() {
  const { trace } = useRagTrace();

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">RRF Rank Fusion Heatmap</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Vector-only rank vs FTS-only rank vs final fused rank for retrieved items
        </p>
      </div>
      <RrfHeatmap trace={trace} />
    </div>
  );
}
