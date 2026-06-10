'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, GitBranch, Share2, Globe, Mail } from 'lucide-react';

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Workspace',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Documents', href: '/dashboard/documents' },
      { label: 'Sign In', href: '/auth/sign-in' },
      { label: 'Sign Up', href: '/auth/sign-up' },
    ],
  },
  {
    title: 'Stack',
    links: [
      { label: 'Next.js 16', href: 'https://nextjs.org', external: true },
      { label: 'Neon pgvector', href: 'https://neon.tech', external: true },
      { label: 'Gemini 2.5 Flash', href: 'https://ai.google.dev', external: true },
      { label: 'shadcn/ui', href: 'https://ui.shadcn.com', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
];

const SOCIALS = [
  { Icon: GitBranch, href: '#', label: 'GitHub' },
  { Icon: Share2, href: '#', label: 'Twitter' },
  { Icon: Globe, href: '#', label: 'LinkedIn' },
  { Icon: Mail, href: 'mailto:hello@insightrag.ai', label: 'Email' },
];

const TECH_BADGES = [
  'Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS', 'shadcn/ui',
  'Neon Serverless', 'pgvector', 'Gemini API', 'SSE Streaming', 'RRF Fusion',
  'Semantic Chunking', 'Full-text GIN', 'Hybrid Search', 'Query Expansion',
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#1C1C28] bg-[#08080C]">
      {/* Tech ticker */}
      <div className="relative overflow-hidden border-b border-[#1C1C28] py-2.5">
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-12 bg-gradient-to-r from-[#08080C] to-transparent sm:w-16" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-[#08080C] to-transparent sm:w-16" />
        <div className="flex animate-footerTicker gap-2 whitespace-nowrap">
          {[...TECH_BADGES, ...TECH_BADGES].map((badge, i) => (
            <span
              key={i}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#1C1C28] bg-[#0F0F16] px-3 py-1 font-mono text-[10px] tracking-[0.04em] text-[#3C3C54]"
            >
              <span className="inline-block h-[3px] w-[3px] rounded-full bg-[#E6990A]" />
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-5 lg:px-6">
        <div className="footer-grid mb-10 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] lg:gap-10">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="mb-4 inline-flex items-center gap-2.5 no-underline">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2A7FBF] to-[#7A5FC0]">
                <Sparkles className="h-[15px] w-[15px] text-[#EEEEF2]" />
              </div>
              <span className="text-sm font-bold text-[#EEEEF2]" style={{ letterSpacing: '-0.02em' }}>
                PdfParseRag
              </span>
            </Link>
            <p className="mb-5 max-w-[220px] text-xs leading-relaxed text-[#7A7A96]">
              The most advanced open-source RAG platform — hybrid search, citations, and real-time AI streaming.
            </p>
            <div className="flex gap-2">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1C1C28] bg-[#0F0F16] text-[#3C3C54] no-underline transition-colors hover:border-[#E6990A]/40 hover:text-[#E6990A]"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <h4 className="mb-3.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#3C3C54]">
                {col.title}
              </h4>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={'external' in link && link.external ? '_blank' : undefined}
                      rel={'external' in link && link.external ? 'noopener noreferrer' : undefined}
                      className="text-xs text-[#7A7A96] no-underline transition-colors hover:text-[#EEEEF2]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1C1C28] pt-6">
          <p className="font-mono text-[10px] text-[#3C3C54]">
            © {year} PdfParseRag. Built with Next.js, Neon &amp; Gemini API.
          </p>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[#1DB875]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#1DB875]" />
              All systems operational
            </span>
            <span className="font-mono text-[10px] text-[#3C3C54]">v1.0.0-beta</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes footerTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-footerTicker { animation: footerTicker 28s linear infinite; }
      `}</style>
    </footer>
  );
}
