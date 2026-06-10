'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Coins, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCost } from '@/lib/token-cost';
import type { RagTrace } from '@/types/rag';

interface TokenCostCalculatorProps {
  trace: RagTrace | null;
}

export default function TokenCostCalculator({ trace }: TokenCostCalculatorProps) {
  const usage = trace?.tokenUsage;

  if (!usage) {
    return (
      <Card className="glass-panel border-none">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Coins className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Token usage and cost estimates appear after each completed chat response.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card className="glass-panel border-none md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Coins className="h-4 w-4 text-primary" />
            Estimated Cost
          </CardTitle>
          <CardDescription className="text-xs">Gemini 2.5 Flash + Embeddings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-3xl font-extrabold text-primary">
            {formatCost(usage.estimatedCostUsd)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">per request (approximate)</p>
        </CardContent>
      </Card>

      <Card className="glass-panel border-none md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Zap className="h-4 w-4 text-amber-500" />
            Token Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            {usage.totalTokens.toLocaleString()} total tokens consumed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border/30 bg-card/25 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
                Prompt + Embed
              </div>
              <p className="font-mono text-2xl font-bold text-foreground">
                {usage.promptTokens.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border/30 bg-card/25 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowDownRight className="h-3.5 w-3.5 text-violet-400" />
                Completion
              </div>
              <p className="font-mono text-2xl font-bold text-foreground">
                {usage.completionTokens.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border/30 bg-card/25 p-4">
              <div className="mb-1 text-xs text-muted-foreground">Total</div>
              <p className="font-mono text-2xl font-bold text-primary">
                {usage.totalTokens.toLocaleString()}
              </p>
            </div>
          </div>

          {trace && (
            <div className="mt-4 rounded-lg border border-border/20 bg-background/40 p-3 font-mono text-[10px] text-muted-foreground">
              Query: &quot;{trace.originalQuery.slice(0, 80)}
              {trace.originalQuery.length > 80 ? '…' : ''}&quot;
              <br />
              Expansions: {trace.expandedQueries?.length || 1} · Chunks retrieved:{' '}
              {trace.retrievedChunks?.length || 0}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
