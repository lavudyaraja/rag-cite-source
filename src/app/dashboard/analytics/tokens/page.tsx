'use client';

import React from 'react';
import TokenCostCalculator from '@/components/analytics/token-cost-calculator';
import { useRagTrace } from '@/hooks/use-rag-trace';

export default function TokensPage() {
  const { trace } = useRagTrace();

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Token & Cost Calculator</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tracks tokens consumed per request and calculates estimated API costs
        </p>
      </div>
      <TokenCostCalculator trace={trace} />
    </div>
  );
}
