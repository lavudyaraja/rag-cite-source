'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import type { RagTrace } from '@/types/rag';

interface RrfHeatmapProps {
  trace: RagTrace | null;
}

function rankColor(rank: number | null, maxRank: number): string {
  if (rank === null) return 'bg-secondary/30';
  const intensity = 1 - (rank - 1) / Math.max(maxRank - 1, 1);
  const alpha = 0.15 + intensity * 0.75;
  return `rgba(230, 153, 10, ${alpha})`;
}

export default function RrfHeatmap({ trace }: RrfHeatmapProps) {
  const chunks = trace?.retrievedChunks || [];
  const maxRank = Math.max(
    ...chunks.flatMap((c) => [c.vectorRank, c.textRank].filter((r): r is number => r !== null)),
    1
  );

  if (!trace || chunks.length === 0) {
    return (
      <Card className="glass-panel border-none">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Run a retrieval query to visualize RRF rank fusion heatmap.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-none">
      <CardHeader>
        <CardTitle className="text-sm font-bold">RRF Rank Fusion Heatmap</CardTitle>
        <CardDescription className="text-xs">
          Vector-only rank vs FTS-only rank vs final fused RRF score — darker = better rank
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded" style={{ background: 'rgba(230,153,10,0.9)' }} />
            Rank 1 (best)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-secondary/30" />
            Not ranked
          </span>
        </div>

        <ScrollArea className="max-h-[500px]">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Document</th>
                <th className="p-2 text-center">Pg</th>
                <th className="p-2 text-center">Vector Rank</th>
                <th className="p-2 text-center">FTS Rank</th>
                <th className="p-2 text-center">Fused RRF</th>
                <th className="p-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {chunks.map((chunk, idx) => {
                const fusedIntensity = chunk.rrfScore / (chunks[0]?.rrfScore || 1);
                return (
                  <tr key={chunk.id} className="border-b border-border/20 hover:bg-secondary/20">
                    <td className="p-2 font-mono font-bold">{idx + 1}</td>
                    <td className="max-w-[140px] truncate p-2 font-medium" title={chunk.filename}>
                      {chunk.filename}
                    </td>
                    <td className="p-2 text-center font-mono">{chunk.pageNumber}</td>
                    <td className="p-2 text-center">
                      <span
                        className="inline-block min-w-[2rem] rounded px-2 py-1 font-mono font-bold"
                        style={{ background: rankColor(chunk.vectorRank, maxRank) }}
                      >
                        {chunk.vectorRank ?? '—'}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className="inline-block min-w-[2rem] rounded px-2 py-1 font-mono font-bold"
                        style={{ background: rankColor(chunk.textRank, maxRank) }}
                      >
                        {chunk.textRank ?? '—'}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className="inline-block min-w-[2rem] rounded px-2 py-1 font-mono font-bold text-primary-foreground"
                        style={{ background: `rgba(122, 95, 192, ${0.2 + fusedIntensity * 0.8})` }}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono font-semibold text-primary">
                      {chunk.rrfScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
