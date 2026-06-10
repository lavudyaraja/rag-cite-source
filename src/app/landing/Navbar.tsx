'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, Menu, X, ChevronRight } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features',     href: '#features'     },
  { label: 'How It Works', href: '#how-it-works'  },
  { label: 'Pricing',      href: '#pricing'       },
];

export default function Navbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-[#1C1C28] bg-[#0F0F16]/95 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto grid h-[60px] w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-5 lg:px-6">

        {/* ── Brand ── */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 no-underline">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2A7FBF] to-[#7A5FC0]">
            <Sparkles className="h-[15px] w-[15px] text-[#EEEEF2]" />
          </div>
          <span
            className="text-sm font-bold text-[#EEEEF2]"
            style={{ letterSpacing: '-0.02em' }}
          >
            PdfParseRag
          </span>
          <span className="hidden rounded-full border border-[#E6990A]/30 px-2 py-0.5 font-mono text-[9px] tracking-widest text-[#E6990A] sm:inline">
            v1.0 BETA
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden items-center justify-center gap-0.5 md:flex">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-[#7A7A96] no-underline transition-colors duration-200 hover:bg-[#0F0F16] hover:text-[#EEEEF2]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* ── Desktop CTAs ── */}
        <div className="hidden items-center justify-end gap-2 md:flex">
          <Link href="/auth/sign-in">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer border border-[#1C1C28] bg-transparent text-[#7A7A96] hover:border-[#3C3C54] hover:bg-transparent hover:text-[#EEEEF2]"
            >
              Sign in
            </Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button
              size="sm"
              className="cursor-pointer gap-1.5 border-0 bg-[#E6990A] font-semibold text-[#08080C] hover:bg-[#D4880A]"
            >
              Get started
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* ── Mobile toggle ── */}
        <button
          className="col-start-3 flex items-center justify-self-end rounded-lg border border-[#1C1C28] p-2 text-[#7A7A96] transition-colors hover:border-[#3C3C54] hover:text-[#EEEEF2] md:hidden"
          onClick={() => setMobileOpen(v => !v)}
        >
          {mobileOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="border-t border-[#1C1C28] bg-[#0F0F16]/98 px-4 pb-5 pt-3 backdrop-blur-xl sm:px-5 lg:px-6 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-[#7A7A96] no-underline transition-colors hover:bg-[#111120] hover:text-[#EEEEF2]"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex gap-2 border-t border-[#1C1C28] pt-3">
            <Link href="/auth/sign-in" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer border border-[#1C1C28] bg-transparent text-[#7A7A96] hover:bg-[#111120] hover:text-[#EEEEF2]"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/auth/sign-up" className="flex-1">
              <Button
                size="sm"
                className="w-full cursor-pointer border-0 bg-[#E6990A] font-semibold text-[#08080C] hover:bg-[#D4880A]"
              >
                Get started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}