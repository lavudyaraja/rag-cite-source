'use client';

import React, { useState } from 'react';
import {
  FileText, Database, Search, Zap, Brain, BarChart2, Eye,
  Layers, Filter, Target, RefreshCw, GitBranch, Activity, Cpu,
  Table, BookOpen, Archive, Shuffle, SlidersHorizontal,
  Award, CheckCircle, Play, Tag, TrendingUp, Hash, Image,
  MessageSquare, Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'parsing', label: 'Document Parsing', shortLabel: 'Parsing',
    icon: FileText, accent: '#38BDF8',
    features: [
      { icon: FileText, title: 'Multi-format ingestion', desc: 'PDF, DOCX, TXT, MD, CSV, JSON with byte-level accuracy.' },
      { icon: Eye, title: 'Layout-aware PDF', desc: 'Tracks page boundaries, headers, and footers with precision.' },
      { icon: Table, title: 'Table extraction', desc: 'Detects tabular data and converts to clean Markdown or JSON.' },
      { icon: Image, title: 'Image captioning', desc: 'Vision LLM generates captions for charts and diagrams.' },
      { icon: Layers, title: 'Semantic chunking', desc: 'Splits at natural thematic transitions, not token limits.' },
      { icon: GitBranch, title: 'Parent-child chunks', desc: 'Pairs small search chunks with larger parent context.' },
      { icon: RefreshCw, title: 'Incremental indexing', desc: 'Re-indexes only changed sections to save API costs.' },
      { icon: Tag, title: 'Auto tagging', desc: 'LLM-generated tags and summaries for structured filtering.' },
    ],
  },
  {
    id: 'retrieval', label: 'Retrieval Engine', shortLabel: 'Retrieval',
    icon: Search, accent: '#A78BFA',
    features: [
      { icon: Brain, title: 'Dense embeddings', desc: 'Gemini API converts text to 768-dim vector representations.' },
      { icon: Database, title: 'GIN full-text index', desc: 'PostgreSQL tokenised search vectors with sub-ms lookups.' },
      { icon: Shuffle, title: 'RRF score fusion', desc: 'Merges vector + keyword ranks in a single SQL query.' },
      { icon: Search, title: 'LLM query expansion', desc: 'Generates 3 alternative phrasings to fill vocabulary gaps.' },
      { icon: Filter, title: 'Metadata filtering', desc: 'Filter by file type, date, page number, and custom tags.' },
      { icon: Hash, title: 'Synonym matching', desc: 'Custom vocabulary and domain abbreviations in search.' },
      { icon: Target, title: 'HyDE embeddings', desc: 'Hypothetical answer embedding search for hard queries.' },
      { icon: Award, title: 'Cross-encoder re-rank', desc: 'LLM re-ranker sorts chunks by semantic relevance pre-prompt.' },
    ],
  },
  {
    id: 'chat', label: 'Chat & Citations', shortLabel: 'Chat',
    icon: MessageSquare, accent: '#34D399',
    features: [
      { icon: Zap, title: 'Real-time streaming', desc: 'Token-level SSE streaming via Gemini for instant UX.' },
      { icon: CheckCircle, title: 'Traceable citations', desc: 'Highlights exact sentences used to construct the answer.' },
      { icon: BookOpen, title: 'Page viewer', desc: 'Opens the exact document page matched to every citation.' },
      { icon: Archive, title: 'Chat history', desc: 'Save, rename, search, and export past sessions.' },
      { icon: MessageSquare, title: 'Multi-doc targeting', desc: 'Choose exactly which files are queried per session.' },
      { icon: Layers, title: 'Query decomposition', desc: 'Breaks complex queries into sub-questions automatically.' },
    ],
  },
  {
    id: 'analytics', label: 'Analytics & Dev', shortLabel: 'Analytics',
    icon: BarChart2, accent: '#E6990A',
    features: [
      { icon: Activity, title: 'Visual pipeline trace', desc: 'Step-by-step flowchart from query to answer.' },
      { icon: BarChart2, title: 'Latency breakdown', desc: 'Embedding, DB query, and LLM stream latency charts.' },
      { icon: TrendingUp, title: 'RRF rank heatmap', desc: 'Vector vs. keyword vs. fused score visualisation.' },
      { icon: CheckCircle, title: 'RAGAS evaluation', desc: 'Real-time Faithfulness, Relevance, and Recall scores.' },
      { icon: Cpu, title: 'Token & cost meter', desc: 'Tracks tokens consumed and estimates API spend.' },
      { icon: Play, title: 'RAG dry-run tester', desc: 'Test retrieval without consuming a Gemini generation.' },
      { icon: SlidersHorizontal, title: 'Stopword control', desc: 'Domain-aware noise word exclusion for better precision.' },
      { icon: Eye, title: 'Prompt visualizer', desc: 'Shows the exact context injected into every prompt.' },
    ],
  },
];

const TOTAL = CATEGORIES.reduce((sum, c) => sum + c.features.length, 0);

function FeatureCard({
  icon: Icon, title, desc, accent,
}: { icon: React.ElementType; title: string; desc: string; accent: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative cursor-default rounded-xl p-4 transition-all duration-200"
      style={{
        background: hovered ? `${accent}08` : '#0F0F16',
        border: `0.5px solid ${hovered ? accent + '35' : '#1C1C28'}`,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div
        className="pointer-events-none absolute left-6 right-6 top-0 h-px transition-opacity duration-200"
        style={{
          background: `linear-gradient(to right, transparent, ${accent}60, transparent)`,
          opacity: hovered ? 1 : 0,
        }}
      />
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] transition-all duration-200"
          style={{
            background: hovered ? `${accent}14` : '#111120',
            border: `0.5px solid ${hovered ? accent + '40' : '#1C1C28'}`,
          }}
        >
          <Icon className="h-[15px] w-[15px] transition-colors duration-200" style={{ color: hovered ? accent : '#3C3C54' }} />
        </div>
        <div className="min-w-0">
          <h3
            className="mb-1 text-[12px] font-semibold leading-snug transition-colors duration-200"
            style={{ letterSpacing: '-0.01em', color: hovered ? '#EEEEF2' : '#7A7A96' }}
          >
            {title}
          </h3>
          <p className="text-[11px] leading-relaxed text-[#3C3C54]">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  cat, active, onClick,
}: { cat: typeof CATEGORIES[0]; active: boolean; onClick: () => void }) {
  const { icon: Icon } = cat;
  return (
    <button
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200"
      style={{
        background: active ? `${cat.accent}10` : 'transparent',
        border: `0.5px solid ${active ? cat.accent + '40' : '#1C1C28'}`,
        color: active ? cat.accent : '#7A7A96',
      }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="hidden sm:inline">{cat.label}</span>
      <span className="sm:hidden">{cat.shortLabel}</span>
      {active && (
        <span
          className="ml-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px]"
          style={{ background: `${cat.accent}15`, color: cat.accent }}
        >
          {cat.features.length}
        </span>
      )}
    </button>
  );
}

export default function FeaturesSection() {
  const [activeId, setActiveId] = useState('parsing');
  const active = CATEGORIES.find(c => c.id === activeId) ?? CATEGORIES[0];

  return (
    <section id="features" className="relative overflow-hidden bg-[#08080C] px-4 py-20 sm:px-5 lg:px-6">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-500"
        style={{ background: `radial-gradient(ellipse, ${active.accent}07 0%, transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: 'radial-gradient(circle, #1C1C28 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl">
        <div className="mb-12 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E6990A]/20 bg-[#E6990A]/[0.07] px-4 py-1.5">
            <Sparkles className="h-3 w-3 text-[#E6990A]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#E6990A]">
              {TOTAL} production-grade capabilities
            </span>
          </div>
          <h2
            className="mb-4 text-4xl font-bold text-[#EEEEF2] sm:text-5xl"
            style={{ letterSpacing: '-0.035em', lineHeight: 1.1 }}
          >
            Everything for{' '}
            <span className="text-[#E6990A]">enterprise RAG</span>
          </h2>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-[#7A7A96]">
            From intelligent document parsing to hybrid vector retrieval and real-time pipeline analytics — PdfParseRag covers every layer.
          </p>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="flex flex-wrap justify-center gap-1.5 rounded-xl border border-[#1C1C28] bg-[#111120] p-1.5">
            {CATEGORIES.map(cat => (
              <TabButton
                key={cat.id}
                cat={cat}
                active={activeId === cat.id}
                onClick={() => setActiveId(cat.id)}
              />
            ))}
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${active.accent}30, transparent)` }} />
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: `${active.accent}0C`, border: `0.5px solid ${active.accent}35` }}
          >
            <active.icon className="h-3 w-3" style={{ color: active.accent }} />
            <span className="text-[11px] font-semibold" style={{ color: active.accent }}>{active.label}</span>
            <span className="font-mono text-[9px] text-[#3C3C54]">— {active.features.length} features</span>
          </div>
          <div className="h-px flex-1" style={{ background: `linear-gradient(to left, ${active.accent}30, transparent)` }} />
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {active.features.map(f => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} accent={active.accent} />
          ))}
        </div>
      </div>
    </section>
  );
}
