'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import {
  Search,
  Sparkles,
  Database,
  Merge,
  FileText,
  Bot,
  ArrowDown,
  CheckCircle2,
} from 'lucide-react';
import type { RagTrace } from '@/types/rag';

interface PipelineTraceFlowProps {
  trace: RagTrace | null;
}

const STEPS = [
  { key: 'query', label: 'User Query', icon: Search, color: 'text-foreground' },
  { key: 'expand', label: 'Query Expansion', icon: Sparkles, color: 'text-primary' },
  { key: 'embed', label: 'Gemini Embeddings', icon: Sparkles, color: 'text-amber-500' },
  { key: 'retrieve', label: 'Hybrid Retrieval', icon: Database, color: 'text-violet-400' },
  { key: 'rrf', label: 'RRF Rank Fusion', icon: Merge, color: 'text-emerald-400' },
  { key: 'prompt', label: 'Prompt Construction', icon: FileText, color: 'text-blue-400' },
  { key: 'llm', label: 'LLM Stream Response', icon: Bot, color: 'text-primary' },
];

export default function PipelineTraceFlow({ trace }: PipelineTraceFlowProps) {
  if (!trace) {
    return (
      <Card className="glass-panel border-none">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Run a query in Chat Engine to see the pipeline trace flowchart.
          </p>
        </CardContent>
      </Card>
    );
  }

  const expansions = (trace.expandedQueries?.length || 1) - 1;

  return (
    <Card className="glass-panel border-none">
      <CardHeader>
        <CardTitle className="text-sm font-bold">Visual Pipeline Trace</CardTitle>
        <CardDescription className="text-xs">
          Step-by-step flow from query rewriting through retrieval to generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mx-auto flex max-w-md flex-col items-center gap-1">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            let detail = '';

            switch (step.key) {
              case 'query':
                detail = `"${trace.originalQuery.slice(0, 50)}${trace.originalQuery.length > 50 ? '…' : ''}"`;
                break;
              case 'expand':
                detail = `${expansions} expanded sub-queries generated`;
                break;
              case 'embed':
                detail = `${trace.embeddingTimeMs}ms · 768d vectors`;
                break;
              case 'retrieve':
                detail = `${trace.dbRetrievalTimeMs}ms · vector + GIN FTS parallel`;
                break;
              case 'rrf':
                detail = `${trace.totalChunksFound} chunks scored via RRF (k=60)`;
                break;
              case 'prompt':
                detail = `Top ${trace.retrievedChunks?.length || 0} chunks packaged`;
                break;
              case 'llm':
                detail = trace.llmStreamTimeMs
                  ? `${trace.llmStreamTimeMs}ms streamed via Gemini 2.5 Flash`
                  : 'Awaiting stream…';
                break;
            }

            return (
              <React.Fragment key={step.key}>
                <div className="w-full rounded-xl border border-border/40 bg-card/40 p-3 transition-all hover:border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60 ${step.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{step.label}</span>
                        {idx < STEPS.length - 1 && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {detail}
                      </p>
                    </div>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <ArrowDown className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {trace.expandedQueries && trace.expandedQueries.length > 1 && (
          <div className="mt-6 rounded-lg border border-border/30 bg-card/25 p-4">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Query Rewriting Output
            </p>
            <div className="flex flex-col gap-2">
              {trace.expandedQueries.map((q, i) => (
                <div key={i} className="rounded border border-border/20 bg-background/40 px-3 py-2 text-xs">
                  <span className="font-mono text-[10px] text-primary">Q{i}</span>{' '}
                  <span className="text-muted-foreground">{q}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
