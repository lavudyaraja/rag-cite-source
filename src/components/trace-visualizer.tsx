'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Search, Database, Clock, Eye, Sparkles, Network } from 'lucide-react';

interface TraceVisualizerProps {
  trace: any;
  highlightedChunkIndex: number | null;
  onClearHighlight: () => void;
}

export default function TraceVisualizer({
  trace,
  highlightedChunkIndex,
  onClearHighlight,
}: TraceVisualizerProps) {
  const [activeTab, setActiveTab] = useState('retrieval');
  const [selectedChunk, setSelectedChunk] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Avoid SSR hydration issues with Recharts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // When parent signals a highlighted index (citation clicked)
  useEffect(() => {
    if (highlightedChunkIndex !== null && trace?.retrievedChunks) {
      const chunk = trace.retrievedChunks[highlightedChunkIndex];
      if (chunk) {
        setSelectedChunk(chunk);
        setActiveTab('retrieval'); // Switch to retrieval tab to show it
        // Auto scroll or highlight target chunk
        setTimeout(() => {
          const el = document.getElementById(`chunk-row-${highlightedChunkIndex}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  }, [highlightedChunkIndex, trace]);

  if (!trace) {
    return (
      <Card className="glass-panel h-full flex flex-col justify-center items-center text-center p-6 border-none rounded-none md:rounded-r-xl">
        <Network className="h-12 w-12 text-muted-foreground/30 mb-3 animate-pulse" />
        <h3 className="text-sm font-semibold text-muted-foreground">RAG Trace Inspector</h3>
        <p className="text-xs text-muted-foreground/60 max-w-[280px] mt-1.5 leading-normal">
          Ask a question in the chat workspace. A live breakdown of retrieval, rank fusion, and response latencies will display here.
        </p>
      </Card>
    );
  }

  const chunks = trace.retrievedChunks || [];
  
  // Format latency data for chart
  const llmMs = trace.llmStreamTimeMs || 0;
  const overheadMs = Math.max(
    0,
    trace.totalLatencyMs - (trace.embeddingTimeMs || 0) - (trace.dbRetrievalTimeMs || 0) - llmMs
  );
  const latencyData = [
    { name: 'Gemini Embed', duration: trace.embeddingTimeMs || 0 },
    { name: 'Neon DB Query', duration: trace.dbRetrievalTimeMs || 0 },
    { name: 'LLM Stream', duration: llmMs },
    { name: 'Pipeline Overhead', duration: overheadMs },
  ].filter((d) => d.duration > 0);

  const CHART_COLORS = ['#E6990A', '#7A5FC0', '#111120'];

  return (
    <Card className="glass-panel h-full flex flex-col border-none rounded-none md:rounded-r-xl min-h-0">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <div>
            <CardTitle className="text-lg font-bold tracking-tight text-foreground">
              RAG Pipeline Trace
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              Query Latency: {trace.totalLatencyMs}ms | {trace.totalChunksFound} Chunks Scored
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2 border-b border-border/20 bg-card/10">
          <TabsList className="grid grid-cols-3 bg-secondary/50 p-1 rounded-lg">
            <TabsTrigger value="retrieval" className="text-xs py-1.5 cursor-pointer">
              Retrieve & Rank
            </TabsTrigger>
            <TabsTrigger value="latency" className="text-xs py-1.5 cursor-pointer">
              Latency Logs
            </TabsTrigger>
            <TabsTrigger value="query" className="text-xs py-1.5 cursor-pointer">
              Sub-Queries
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="flex-1 min-h-0 p-4 flex flex-col overflow-hidden">
          {/* TAB 1: RETRIEVAL & RANKING */}
          <TabsContent value="retrieval" className="flex-1 flex flex-col min-h-0 gap-4 mt-0">
            {/* Split view: Chunks list & Detailed Chunk Inspector */}
            <div className="flex-1 min-h-[50%] flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Rank Fusion Matrix (Vector vs GIN Keyword vs RRF)
              </span>
              <ScrollArea className="flex-1 border border-border/30 rounded-lg bg-card/25">
                <Table>
                  <TableHeader className="bg-secondary/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center text-[10px] font-bold">RRF Rank</TableHead>
                      <TableHead className="text-[10px] font-bold">Source Document</TableHead>
                      <TableHead className="w-16 text-center text-[10px] font-bold">Page</TableHead>
                      <TableHead className="w-16 text-center text-[10px] font-bold">Vec Rank</TableHead>
                      <TableHead className="w-16 text-center text-[10px] font-bold">Text Rank</TableHead>
                      <TableHead className="w-20 text-right text-[10px] font-bold">RRF Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chunks.map((chunk: any, idx: number) => {
                      const isHighlighted = highlightedChunkIndex === idx;
                      const isSelected = selectedChunk?.id === chunk.id;
                      return (
                        <TableRow
                          key={chunk.id}
                          id={`chunk-row-${idx}`}
                          onClick={() => {
                            setSelectedChunk(chunk);
                            if (isHighlighted) onClearHighlight();
                          }}
                          className={`cursor-pointer transition-colors text-xs ${
                            isHighlighted
                              ? 'bg-primary/20 hover:bg-primary/25 border-l-2 border-l-primary'
                              : isSelected
                              ? 'bg-secondary/70 hover:bg-secondary/80'
                              : 'hover:bg-secondary/30'
                          }`}
                        >
                          <TableCell className="font-mono font-bold text-center">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-medium truncate max-w-[120px]" title={chunk.filename}>
                            {chunk.filename}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {chunk.pageNumber}
                          </TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {chunk.vectorRank || '-'}
                          </TableCell>
                          <TableCell className="text-center font-mono text-muted-foreground">
                            {chunk.textRank || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-primary">
                            {chunk.rrfScore}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Bottom Panel: Chunk Viewer */}
            <div className="h-[40%] min-h-[120px] flex flex-col border-t border-border/40 pt-3">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Chunk Content Inspector
                </span>
                {selectedChunk && (
                  <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    File: {selectedChunk.filename} | Page: {selectedChunk.pageNumber}
                  </span>
                )}
              </div>
              <ScrollArea className="flex-1 p-3 rounded-lg border border-border/30 bg-card/40 text-xs leading-relaxed font-sans text-muted-foreground select-text">
                {selectedChunk ? (
                  selectedChunk.content
                ) : (
                  <div className="text-center text-muted-foreground/50 py-6">
                    Click a row in the Rank Fusion table above to inspect the document chunk text.
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* TAB 2: LATENCY LOGS */}
          <TabsContent value="latency" className="flex-1 flex flex-col min-h-0 gap-4 mt-0">
            <span className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Latency Diagnostics (Total Time: {trace.totalLatencyMs}ms)
            </span>
            <div className="flex-1 min-h-[200px] border border-border/30 rounded-lg p-4 bg-card/25 flex flex-col justify-center">
              {isMounted && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={latencyData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                    <XAxis type="number" stroke="#7A7A96" fontSize={10} unit="ms" />
                    <YAxis type="category" dataKey="name" stroke="#7A7A96" fontSize={9} width={100} />
                    <Tooltip
                      contentStyle={{ background: '#0F0F16', borderColor: '#1C1C28' }}
                      labelStyle={{ color: '#EEEEF2', fontSize: 11 }}
                      itemStyle={{ color: '#E6990A', fontSize: 11 }}
                      formatter={(value: any) => [`${value} ms`, 'Duration']}
                    />
                    <Bar dataKey="duration" radius={[0, 4, 4, 0]} barSize={20}>
                      {latencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 border border-border/30 rounded-lg bg-card/20 flex flex-col gap-1">
                <span className="text-muted-foreground">Embedding API Latency</span>
                <span className="font-mono font-bold text-sm text-primary">{trace.embeddingTimeMs}ms</span>
                <span className="text-[10px] text-muted-foreground/60">Generate 768d vectors for all expansions</span>
              </div>
              <div className="p-3 border border-border/30 rounded-lg bg-card/20 flex flex-col gap-1">
                <span className="text-muted-foreground">PostgreSQL Search Latency</span>
                <span className="font-mono text-sm font-bold text-[#7A5FC0]">{trace.dbRetrievalTimeMs}ms</span>
                <span className="text-[10px] text-muted-foreground/60">Parallel vector and GIN full-text index queries</span>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: QUERY EXPANSION */}
          <TabsContent value="query" className="flex-1 flex flex-col min-h-0 gap-4 mt-0">
            <span className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Sub-Queries & Expanded Search Variances
            </span>
            <div className="flex-1 flex flex-col gap-3">
              <div className="p-3.5 border border-border/30 rounded-lg bg-card/40">
                <span className="text-[10px] font-bold text-muted-foreground/60 block uppercase font-mono">Original User Query</span>
                <p className="text-sm font-semibold mt-1 text-foreground leading-relaxed">
                  "{trace.originalQuery}"
                </p>
              </div>

              <div className="flex-1 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-muted-foreground/60 block uppercase font-mono">LLM Expanded Sub-Queries</span>
                {trace.expandedQueries?.map((q: string, idx: number) => {
                  if (idx === 0) return null; // Skip original query in expansions
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-2.5 hover:border-primary/45 transition-colors"
                    >
                      <span className="font-mono text-[10px] font-extrabold text-primary bg-primary/10 h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        {idx}
                      </span>
                      <p className="text-xs font-medium text-muted-foreground italic leading-normal">
                        "{q}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
