'use client';

import React from 'react';
import { Upload, Brain, Zap, MessageSquare } from 'lucide-react';

const STEPS = [
  {
    num:  '01',
    Icon: Upload,
    title: 'Upload your documents',
    desc:  'Drag and drop PDF, DOCX, TXT, CSV, Markdown, or JSON files. PdfParseRag parses and chunks them with layout-aware intelligence.',
  },
  {
    num:  '02',
    Icon: Brain,
    title: 'AI indexing & embedding',
    desc:  'Documents are converted to 768-dim Gemini vectors, full-text GIN indexed, and stored in Neon pgvector — ready for sub-second retrieval.',
  },
  {
    num:  '03',
    Icon: Zap,
    title: 'Hybrid search & RRF',
    desc:  'PdfParseRag expands your query × 3, runs parallel vector + keyword SQL search, then fuses ranks via Reciprocal Rank Fusion.',
  },
  {
    num:  '04',
    Icon: MessageSquare,
    title: 'Cited AI answers',
    desc:  'Gemini 2.5 Flash streams a precise answer with traceable [Source N] citations. Click any citation to jump to the exact page.',
  },
];

const PIPELINE: { label: string; color: string; arrow?: boolean; plus?: boolean }[] = [
  { label: 'User query',                  color: '#4B8EF0', arrow: true  },
  { label: 'Query expansion × 3',         color: '#E6990A'               },
  { label: 'Gemini embeddings',           color: '#E6990A', arrow: true  },
  { label: 'Vector search (cosine)',      color: '#A07AF0'               },
  { label: 'Full-text GIN search',        color: '#A07AF0', plus: true, arrow: true },
  { label: 'RRF score fusion',            color: '#1DB875'               },
  { label: 'Top-K context',              color: '#1DB875', arrow: true  },
  { label: 'Gemini 2.5 Flash',           color: '#4B8EF0', arrow: true  },
  { label: 'Streamed answer + citations', color: '#4B8EF0'               },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-[#08080C] px-4 py-20 sm:px-5 lg:px-6">

      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[350px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6990A] opacity-[0.03] blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl">

        {/* ── Header ── */}
        <div className="mb-12 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E6990A]/20 bg-[#E6990A]/[0.07] px-4 py-1.5">
            <Zap className="h-3 w-3 text-[#E6990A]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#E6990A]">
              How it works
            </span>
          </div>

          <h2
            className="mb-4 text-4xl font-bold text-[#EEEEF2] sm:text-5xl"
            style={{ letterSpacing: '-0.035em', lineHeight: 1.1 }}
          >
            From upload to{' '}
            <span className="text-[#E6990A]">insight</span>
            {' '}in seconds
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-[#7A7A96]">
            Four steps — backed by production-grade AI engineering.
          </p>
        </div>

        {/* ── Steps ── */}
        <div className="relative mb-12">

          {/* Connecting line — desktop only */}
          <div className="absolute top-9 hidden h-px bg-gradient-to-r from-[#E6990A]/40 via-[#E6990A]/20 to-[#E6990A]/40 lg:block"
               style={{ left: 'calc(12.5% + 10px)', right: 'calc(12.5% + 10px)' }} />

          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {STEPS.map(({ num, Icon, title, desc }) => (
              <div key={num} className="flex flex-col items-center gap-4 text-center">

                {/* Icon circle */}
                <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border border-[#1C1C28] bg-[#0F0F16]">
                  <Icon className="h-6 w-6 text-[#E6990A]" />
                  {/* Step badge */}
                  <div className="absolute -right-1.5 -top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#E6990A]/40 bg-[#1C1200]">
                    <span className="font-mono text-[9px] font-bold text-[#E6990A]">{num}</span>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-[13px] font-semibold leading-snug text-[#EEEEF2]"
                      style={{ letterSpacing: '-0.01em' }}>
                    {title}
                  </h3>
                  <p className="mx-auto max-w-[200px] text-xs leading-relaxed text-[#7A7A96]">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pipeline architecture block ── */}
        <div className="rounded-2xl border border-[#1C1C28] bg-[#0F0F16] p-5">
          <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.12em] text-[#3C3C54]">
            ↳ retrieval pipeline architecture
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            {PIPELINE.map((item, i) => (
              <React.Fragment key={i}>
                {item.plus && (
                  <span className="text-sm font-bold text-[#3C3C54]">+</span>
                )}
                <span
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-[10px] font-medium"
                  style={{
                    color:            item.color,
                    borderColor:      `${item.color}30`,
                    backgroundColor:  `${item.color}0F`,
                  }}
                >
                  {item.label}
                </span>
                {item.arrow && (
                  <span className="text-sm text-[#3C3C54]">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}