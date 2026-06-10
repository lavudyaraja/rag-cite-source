'use client';

import React, { useEffect, useState } from 'react';
import LatencyBreakdownChart from '@/components/analytics/latency-breakdown-chart';
import { useRagTrace } from '@/hooks/use-rag-trace';

export default function LatencyPage() {
  const { trace } = useRagTrace();
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTimeline(data.timeline || []);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Latency Performance Breakdown</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          API latency charts for embedding time, database query time, and LLM stream time
        </p>
      </div>
      <LatencyBreakdownChart trace={trace} historicalTimeline={timeline} />
    </div>
  );
}
