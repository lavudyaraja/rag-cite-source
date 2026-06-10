'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  Clock,
  Grid3X3,
  Shield,
  Coins,
  FlaskConical,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useRagTrace } from '@/hooks/use-rag-trace';

const ANALYTICS_FEATURES = [
  {
    title: 'Visual Pipeline Trace',
    description: 'Step-by-step flowchart from query rewriting to LLM response.',
    href: '/dashboard/analytics/pipeline',
    icon: Activity,
  },
  {
    title: 'Latency Breakdown',
    description: 'Embedding, DB query, and LLM stream time charts.',
    href: '/dashboard/analytics/latency',
    icon: Clock,
  },
  {
    title: 'RRF Rank Fusion Heatmap',
    description: 'Vector vs FTS vs fused rank visualization.',
    href: '/dashboard/analytics/rrf',
    icon: Grid3X3,
  },
  {
    title: 'RAGAS-Lite Evaluation',
    description: 'Faithfulness, answer relevance, and retrieval recall scores.',
    href: '/dashboard/analytics/ragas',
    icon: Shield,
  },
  {
    title: 'Token & Cost Calculator',
    description: 'Per-request token usage and estimated API costs.',
    href: '/dashboard/analytics/tokens',
    icon: Coins,
  },
  {
    title: 'RAG Dry-Run Tester',
    description: 'Test retrieval without generating an LLM response.',
    href: '/dashboard/analytics/dry-run',
    icon: FlaskConical,
  },
];

export default function AnalyticsHubPage() {
  const { trace, refresh } = useRagTrace();
  const [kpis, setKpis] = useState({ totalQueries: 0, avgLatencyMs: 0 });

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setKpis({
            totalQueries: data.kpis.totalQueries,
            avgLatencyMs: data.kpis.avgLatencyMs,
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Analytics & Developer Dashboard</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pipeline diagnostics, retrieval analytics, and RAG quality tools
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-primary/45 hover:text-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Trace
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="glass-panel border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase text-muted-foreground">Total Queries Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold">{kpis.totalQueries}</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase text-muted-foreground">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold">{kpis.avgLatencyMs}ms</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase text-muted-foreground">Last Query Trace</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-sm font-semibold">
              {trace?.originalQuery || 'No trace yet — run a chat query'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ANALYTICS_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.href} href={feature.href} className="no-underline">
              <Card className="glass-panel glass-panel-interactive h-full cursor-pointer border-none transition-all hover:border-primary/30">
                <CardHeader>
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground">{feature.title}</CardTitle>
                  <CardDescription className="text-xs">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
