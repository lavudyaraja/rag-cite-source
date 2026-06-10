'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { RefreshCw, Shield, Target, Search } from 'lucide-react';
import type { RagasScores, RagTrace } from '@/types/rag';

interface RagasScoresPanelProps {
  trace: RagTrace | null;
  lastAnswer?: string;
}

function ScoreBar({ label, value, icon: Icon, color }: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="rounded-lg border border-border/30 bg-card/25 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          {label}
        </span>
        <span className={`font-mono text-lg font-bold ${color}`}>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary/60">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color.includes('emerald') ? '#1DB875' : color.includes('violet') ? '#7A5FC0' : '#E6990A' }}
        />
      </div>
    </div>
  );
}

export default function RagasScoresPanel({ trace, lastAnswer = '' }: RagasScoresPanelProps) {
  const [scores, setScores] = useState<RagasScores | null>(trace?.ragasScores || null);
  const [loading, setLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState(trace?.originalQuery || '');
  const [customAnswer, setCustomAnswer] = useState(lastAnswer);

  React.useEffect(() => {
    if (trace?.ragasScores) setScores(trace.ragasScores);
    if (trace?.originalQuery) setCustomQuery(trace.originalQuery);
    if (lastAnswer) setCustomAnswer(lastAnswer);
  }, [trace, lastAnswer]);

  const runEvaluation = async () => {
    if (!customQuery.trim() || !customAnswer.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ragas/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: customQuery,
          answer: customAnswer,
          contextChunks: trace?.retrievedChunks?.map((c) => c.content) || [],
        }),
      });
      const data = await res.json();
      if (data.success) setScores(data.scores);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="glass-panel border-none">
        <CardHeader>
          <CardTitle className="text-sm font-bold">RAGAS-Lite Quality Scores</CardTitle>
          <CardDescription className="text-xs">
            Real-time Faithfulness, Answer Relevance, and Retrieval Recall
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {scores ? (
            <>
              <ScoreBar label="Faithfulness" value={scores.faithfulness} icon={Shield} color="text-emerald-400" />
              <ScoreBar label="Answer Relevance" value={scores.answerRelevance} icon={Target} color="text-primary" />
              <ScoreBar label="Retrieval Recall" value={scores.retrievalRecall} icon={Search} color="text-violet-400" />
            </>
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Scores appear automatically after each chat response, or run manual evaluation →
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-none">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Manual Evaluation</CardTitle>
          <CardDescription className="text-xs">Re-score any query/answer pair against retrieved context</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="User query…"
            className="min-h-[60px] text-xs"
          />
          <Textarea
            value={customAnswer}
            onChange={(e) => setCustomAnswer(e.target.value)}
            placeholder="Generated answer…"
            className="min-h-[100px] text-xs"
          />
          <Button
            onClick={runEvaluation}
            disabled={loading}
            className="cursor-pointer gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Evaluate with RAGAS-Lite
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
