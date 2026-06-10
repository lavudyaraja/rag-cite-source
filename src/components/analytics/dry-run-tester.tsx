'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { FlaskConical, Search, Clock, Database } from 'lucide-react';
import DocumentTargetSelector from '../chat/document-target-selector';
import type { Document } from '../document-panel';
import type { RagTrace } from '@/types/rag';

interface DryRunTesterProps {
  documents: Document[];
  onTraceReceived?: (trace: RagTrace) => void;
}

export default function DryRunTester({ documents, onTraceReceived }: DryRunTesterProps) {
  const [query, setQuery] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RagTrace | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDryRun = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/retrieval/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
          topK: 10,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Dry-run failed');

      setResult(data.trace);
      onTraceReceived?.(data.trace);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dry-run failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="glass-panel border-none lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <FlaskConical className="h-4 w-4 text-primary" />
            RAG Dry-Run Tester
          </CardTitle>
          <CardDescription className="text-xs">
            Test retrieval queries without generating an LLM response
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a retrieval test query…"
            className="min-h-[80px] text-sm"
          />

          <DocumentTargetSelector
            documents={documents}
            selectedIds={selectedDocIds}
            onSelectionChange={setSelectedDocIds}
            compact
          />

          <Button
            onClick={runDryRun}
            disabled={loading || !query.trim()}
            className="cursor-pointer gap-2"
          >
            <Search className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Retrieving…' : 'Run Dry-Run'}
          </Button>

          {error && (
            <p className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-none lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Retrieved Chunks</CardTitle>
          {result && (
            <CardDescription className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {result.totalLatencyMs}ms total
              </span>
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                {result.totalChunksFound} chunks scored
              </span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="py-16 text-center text-xs text-muted-foreground">
              Run a dry-run query to preview retrieved chunks here.
            </p>
          ) : (
            <ScrollArea className="h-[480px]">
              <div className="flex flex-col gap-3 pr-3">
                {result.retrievedChunks.map((chunk, idx) => (
                  <div
                    key={chunk.id}
                    className="rounded-lg border border-border/30 bg-card/25 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 font-bold text-primary">
                        Rank {idx + 1}
                      </span>
                      <span className="text-muted-foreground">{chunk.filename}</span>
                      <span className="text-muted-foreground">· Page {chunk.pageNumber}</span>
                      <span className="text-muted-foreground">
                        · Vec:{chunk.vectorRank ?? '—'} FTS:{chunk.textRank ?? '—'}
                      </span>
                      <span className="ml-auto font-semibold text-primary">
                        RRF {chunk.rrfScore}
                      </span>
                    </div>
                    <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                      {chunk.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
