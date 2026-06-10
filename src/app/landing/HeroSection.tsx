'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

const WORDS = ['documents', 'PDFs', 'contracts', 'reports', 'spreadsheets'];
const TICKER = [
  'PDF Parsing', 'DOCX Support', 'CSV Ingestion', 'Hybrid Search',
  'RRF Fusion', 'Query Expansion', 'Gemini 2.5 Flash', 'Neon pgvector',
  'Streaming Answers', 'Citation Tracking', 'Semantic Chunking', 'Analytics',
];
const PIPELINE = [
  { label: 'Query expansion', time: '12ms', pct: 15 },
  { label: 'Vector search', time: '48ms', pct: 65 },
  { label: 'RRF fusion', time: '8ms', pct: 10 },
  { label: 'Gemini stream', time: '320ms', pct: 85 },
];
const STATS = [
  { label: 'AI features' },
  { label: 'File formats' },
  { label: 'Vectors' },
  { label: 'Query time' },
];
const AI_ANSWER =
  'Based on [Source 1], Q4 revenue grew 34% YoY to $2.4M, driven by enterprise expansion and a 28% rise in new customer acquisition across APAC markets.';

function useCountUp(target: number, duration: number, start: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t0: number;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [start, target, duration]);
  return val;
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);
  const [pipeStep, setPipeStep] = useState(-1);
  const [typedIdx, setTypedIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSrc, setShowSrc] = useState(false);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.1 },
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => { setWordIdx(i => (i + 1) % WORDS.length); setWordVisible(true); }, 280);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setPipeStep(0), 500);
    return () => clearTimeout(t);
  }, [inView]);

  useEffect(() => {
    if (pipeStep < 0) return;
    if (pipeStep < PIPELINE.length - 1) {
      const t = setTimeout(() => setPipeStep(v => v + 1), 520);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShowAnswer(true), 620);
    return () => clearTimeout(t);
  }, [pipeStep]);

  useEffect(() => {
    if (!showAnswer || typedIdx >= AI_ANSWER.length) return;
    const t = setTimeout(() => setTypedIdx(i => i + 1), 22);
    return () => clearTimeout(t);
  }, [showAnswer, typedIdx]);

  useEffect(() => {
    if (typedIdx >= AI_ANSWER.length && typedIdx > 0) setShowSrc(true);
  }, [typedIdx]);

  useEffect(() => {
    const id = setInterval(() => setCursor(v => !v), 520);
    return () => clearInterval(id);
  }, []);

  const c0 = useCountUp(30, 1400, inView);
  const c1 = useCountUp(6, 1000, inView);
  const c2 = useCountUp(768, 1800, inView);
  const c3 = useCountUp(2, 900, inView);
  const statDisplays = [`${c0}+`, `${c1}`, `${c2}D`, `<${c3}s`];

  return (
    <section
      ref={sectionRef}
      className="relative overflow-x-hidden bg-[#08080C] px-4 pb-10 pt-20 sm:px-5 lg:px-6"
    >
      <div className="pointer-events-none absolute right-[3%] top-[12%] h-[420px] w-[420px] rounded-full bg-[#E6990A] opacity-[0.04] blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-14">

          {/* Left — copy */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1DB875] shadow-[0_0_6px_#1DB87580]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3C3C54]">
                Live · Gemini 2.5 Flash
              </span>
            </div>

            <div>
              <h1
                className="m-0 text-[#EEEEF2]"
                style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.06, letterSpacing: '-0.04em' }}
              >
                Ask your
                <br />
                <span
                  key={wordIdx}
                  className="inline-block text-[#E6990A]"
                  style={{
                    opacity: wordVisible ? 1 : 0,
                    transform: wordVisible ? 'translateY(0px)' : 'translateY(10px)',
                    transition: 'opacity 0.26s ease, transform 0.26s ease',
                  }}
                >
                  {WORDS[wordIdx]}
                </span>
                <br />
                anything.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-[1.75] text-[#7A7A96]">
                Upload PDFs, CSVs, DOCX files. Get cited answers in under 2 seconds — powered by hybrid vector search and RRF fusion.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href="/auth/sign-up">
                <Button
                  size="sm"
                  className="cursor-pointer gap-2 border-0 bg-[#E6990A] px-5 font-semibold text-[#08080C] hover:bg-[#D4880A]"
                >
                  Start for free
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/dashboard/documents">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer gap-2 border border-[#1C1C28] bg-transparent px-5 text-[#7A7A96] hover:border-[#3C3C54] hover:bg-transparent hover:text-[#EEEEF2]"
                >
                  <Play className="h-3 w-3 text-[#E6990A]" />
                  Watch demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Right — terminal */}
          <div className="overflow-hidden rounded-2xl border border-[#1C1C28] bg-[#0F0F16]">
            <div className="flex items-center gap-2 border-b border-[#1C1C28] bg-[#13131E] px-4 py-2.5">
              <div className="flex gap-1.5">
                {['#E24B4A', '#BA7517', '#639922'].map((c, i) => (
                  <div key={i} className="h-2 w-2 rounded-full opacity-60" style={{ background: c }} />
                ))}
              </div>
              <span className="flex-1 text-center font-mono text-[10px] text-[#3C3C54]">
                insightrag · query trace
              </span>
              <span className="font-mono text-[10px] text-[#1DB875]">● live</span>
            </div>

            <div className="p-5 font-mono text-[11px]">
              <div className="mb-5 leading-relaxed">
                <span className="text-[#3C3C54]">$ </span>
                <span className="text-[#7A7A96]">query </span>
                <span className="text-[#E6990A]">&quot;What were the Q4 revenue highlights?&quot;</span>
              </div>

              <div className="mb-5 flex flex-col gap-1.5">
                {PIPELINE.map((p, i) => {
                  const done = i <= pipeStep;
                  const isLast = i === PIPELINE.length - 1;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 transition-opacity duration-300"
                      style={{ opacity: done ? 1 : 0.18 }}
                    >
                      <span
                        className="w-2.5 text-[10px]"
                        style={{ color: done ? (isLast && !showAnswer ? '#E6990A' : '#1DB875') : '#3C3C54' }}
                      >
                        {done ? '✓' : '○'}
                      </span>
                      <span className="flex-1" style={{ color: done ? '#7A7A96' : '#3C3C54' }}>
                        {p.label}
                      </span>
                      <div className="h-0.5 w-[52px] overflow-hidden rounded-full bg-[#1C1C28]">
                        <div
                          className="h-full rounded-full bg-[#E6990A] opacity-75 transition-all duration-500"
                          style={{ width: done ? `${p.pct}%` : '0%' }}
                        />
                      </div>
                      <span
                        className="min-w-[38px] text-right text-[10px]"
                        style={{ color: done ? '#E6990A' : '#3C3C54' }}
                      >
                        {done ? p.time : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {showAnswer && (
                <div className="animate-fadeUp border-t border-[#1C1C28] pt-4">
                  <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#3C3C54]">
                    ↳ answer
                  </p>
                  <p className="text-[11px] leading-[1.75] text-[#B4B4CC]">
                    {AI_ANSWER.slice(0, typedIdx)}
                    {typedIdx < AI_ANSWER.length && (
                      <span className="text-[#E6990A]" style={{ opacity: cursor ? 1 : 0 }}>█</span>
                    )}
                  </p>
                  {showSrc && (
                    <div className="mt-3">
                      <span className="animate-fadeUp inline-flex items-center gap-1.5 rounded-full border border-[#E6990A]/20 bg-[#1C1200] px-2.5 py-0.5 font-mono text-[10px] text-[#E6990A]">
                        ↗ Q4_Report_2024.pdf · p.12
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats + trust — full width */}
        <div className="mt-10 border-t border-[#1C1C28] pt-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 sm:gap-x-6">
            {STATS.map((s, i) => (
              <div key={s.label} className={i > 0 ? 'sm:border-l sm:border-[#1C1C28] sm:pl-6' : ''}>
                <div className="tabular-nums text-xl font-semibold tracking-tight text-[#EEEEF2]">
                  {statDisplays[i]}
                </div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#3C3C54]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {['No credit card', 'Free tier forever', 'GDPR friendly'].map(t => (
              <span key={t} className="flex items-center gap-1.5 text-[11px] text-[#3C3C54]">
                <span className="text-[#1DB875]">✓</span>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Ticker — edge to edge */}
      <div className="relative mt-8 w-full overflow-hidden">
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-12 bg-gradient-to-r from-[#08080C] to-transparent sm:w-16" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-[#08080C] to-transparent sm:w-16" />
        <div className="flex animate-ticker gap-2 whitespace-nowrap">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span
              key={i}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#1C1C28] bg-[#0F0F16] px-3.5 py-1.5 font-mono text-[10px] tracking-[0.04em] text-[#3C3C54]"
            >
              <span className="inline-block h-[3px] w-[3px] rounded-full bg-[#3C3C54]" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-ticker { animation: ticker 34s linear infinite; }
        .animate-fadeUp { animation: fadeUp 0.35s ease both; }
      `}</style>
    </section>
  );
}
