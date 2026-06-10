'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Clock } from 'lucide-react';
import type { RagTrace } from '@/types/rag';

interface LatencyBreakdownChartProps {
  trace: RagTrace | null;
  historicalTimeline?: Array<{
    index: number;
    latencyMs: number;
    embeddingTimeMs: number;
    dbTimeMs: number;
    timeLabel: string;
  }>;
}

const COLORS = ['#E6990A', '#7A5FC0', '#2A7FBF', '#1DB875'];

export default function LatencyBreakdownChart({
  trace,
  historicalTimeline = [],
}: LatencyBreakdownChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const embedMs = trace?.embeddingTimeMs || 0;
  const dbMs = trace?.dbRetrievalTimeMs || 0;
  const llmMs = trace?.llmStreamTimeMs || 0;
  const totalMs = trace?.totalLatencyMs || 0;
  const overheadMs = Math.max(0, totalMs - embedMs - dbMs - llmMs);

  const breakdownData = [
    { name: 'Embedding API', duration: embedMs },
    { name: 'DB Query', duration: dbMs },
    { name: 'LLM Stream', duration: llmMs },
    { name: 'Pipeline Overhead', duration: overheadMs },
  ].filter((d) => d.duration > 0);

  const pieData = breakdownData.map((d) => ({ name: d.name, value: d.duration }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="glass-panel border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Clock className="h-4 w-4 text-primary" />
            Latency Performance Breakdown
          </CardTitle>
          <CardDescription className="text-xs">
            Last query: {totalMs}ms total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!trace ? (
            <p className="py-12 text-center text-xs text-muted-foreground">
              No latency data yet. Run a chat query to populate metrics.
            </p>
          ) : mounted ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={breakdownData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" stroke="#7A7A96" fontSize={10} unit="ms" />
                <YAxis type="category" dataKey="name" stroke="#7A7A96" fontSize={9} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0F0F16', borderColor: '#1C1C28' }}
                  formatter={(value) => [`${value} ms`, 'Duration']}
                />
                <Bar dataKey="duration" radius={[0, 4, 4, 0]} barSize={18}>
                  {breakdownData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : null}

          {trace && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              {breakdownData.map((d, i) => (
                <div key={d.name} className="rounded-lg border border-border/30 bg-card/20 p-3">
                  <span className="text-muted-foreground">{d.name}</span>
                  <p className="font-mono text-lg font-bold" style={{ color: COLORS[i] }}>
                    {d.duration}ms
                  </p>
                  <span className="text-[10px] text-muted-foreground/60">
                    {totalMs > 0 ? `${((d.duration / totalMs) * 100).toFixed(1)}%` : '—'} of total
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-none">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Latency Distribution</CardTitle>
          <CardDescription className="text-xs">Proportional time per pipeline stage</CardDescription>
        </CardHeader>
        <CardContent>
          {!trace || pieData.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">No distribution data</p>
          ) : mounted ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0F0F16', borderColor: '#1C1C28' }}
                  formatter={(value) => [`${value} ms`, 'Duration']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>

      {historicalTimeline.length > 0 && (
        <Card className="glass-panel col-span-full border-none">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Historical Query Latency</CardTitle>
            <CardDescription className="text-xs">Last {historicalTimeline.length} queries from analytics log</CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={historicalTimeline}>
                  <XAxis dataKey="timeLabel" stroke="#7A7A96" fontSize={9} />
                  <YAxis stroke="#7A7A96" fontSize={10} unit="ms" />
                  <Tooltip contentStyle={{ background: '#0F0F16', borderColor: '#1C1C28' }} />
                  <Bar dataKey="embeddingTimeMs" stackId="a" fill="#E6990A" name="Embed" />
                  <Bar dataKey="dbTimeMs" stackId="a" fill="#7A5FC0" name="DB" />
                  <Bar
                    dataKey={(d) => Math.max(0, d.latencyMs - d.embeddingTimeMs - d.dbTimeMs)}
                    stackId="a"
                    fill="#2A7FBF"
                    name="Other"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
