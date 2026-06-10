'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';

export const AUTH_INPUT_CLASS =
  'h-12 rounded-xl border-[#1C1C28] bg-[#111120] pl-10 text-sm text-[#EEEEF2] placeholder:text-[#3C3C54] focus:border-[#E6990A]/50 focus:ring-0';

export const AUTH_LABEL_CLASS = 'text-xs font-semibold text-[#7A7A96]';

export function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08080C] p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-[10%] top-[-10%] h-[480px] w-[480px] rounded-full bg-[#E6990A] opacity-[0.05] blur-3xl" />
        <div className="absolute -left-[5%] bottom-[-10%] h-[400px] w-[400px] rounded-full bg-[#7A5FC0] opacity-[0.04] blur-3xl" />
      </div>
      <div className="relative w-full max-w-4xl">{children}</div>
    </div>
  );
}

export function AuthCard({
  formPanel,
  brandPanel,
  formFirst = true,
}: {
  formPanel: React.ReactNode;
  brandPanel: React.ReactNode;
  formFirst?: boolean;
}) {
  return (
    <div className="relative flex overflow-hidden rounded-2xl border border-[#1C1C28] bg-[#0F0F16]">
      {formFirst ? (
        <>
          {formPanel}
          {brandPanel}
        </>
      ) : (
        <>
          {brandPanel}
          {formPanel}
        </>
      )}
    </div>
  );
}

export function AuthFormPanel({
  children,
  backHref = '/landing',
  backPosition = 'left',
  title,
  subtitle,
}: {
  children: React.ReactNode;
  backHref?: string;
  backPosition?: 'left' | 'right';
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative flex flex-1 flex-col justify-center p-8 lg:p-10">
      <Link
        href={backHref}
        className={`absolute top-6 flex items-center gap-1.5 text-[10px] text-[#3C3C54] transition-colors hover:text-[#EEEEF2] ${
          backPosition === 'left' ? 'left-6' : 'right-6'
        }`}
      >
        <ArrowLeft className="h-3 w-3" />
        Back
      </Link>

      <div className="mb-6 flex items-center gap-2 lg:hidden">
        <AuthLogo size="sm" />
        <span className="text-sm font-bold text-[#EEEEF2]">PdfParseRag</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#EEEEF2]" style={{ letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        <p className="mt-1 text-sm text-[#7A7A96]">{subtitle}</p>
      </div>

      {children}
    </div>
  );
}

export function AuthBrandPanel({
  headline,
  highlight,
  description,
  children,
}: {
  headline: string;
  highlight: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative hidden w-[45%] flex-col overflow-hidden border-[#1C1C28] bg-[#111120] p-10 lg:flex lg:border-l">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, #1C1C28 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6990A]/30 to-transparent" />

      <Link href="/landing" className="relative z-10 flex items-center gap-3">
        <AuthLogo size="md" />
        <div>
          <span className="block text-base font-bold text-[#EEEEF2]">PdfParseRag</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#E6990A]/80">
            Document Intelligence
          </span>
        </div>
      </Link>

      <div className="relative z-10 my-10">
        <h2 className="mb-3 text-3xl font-bold leading-tight text-[#EEEEF2]" style={{ letterSpacing: '-0.03em' }}>
          {headline}{' '}
          <span className="text-[#E6990A]">{highlight}</span>
        </h2>
        <p className="text-sm leading-relaxed text-[#7A7A96]">{description}</p>
      </div>

      <div className="relative z-10 flex-1">{children}</div>
    </div>
  );
}

export function AuthBrandPanelLeft({
  headline,
  highlight,
  description,
  children,
}: {
  headline: string;
  highlight: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative hidden w-[45%] flex-col overflow-hidden border-[#1C1C28] bg-[#111120] p-10 lg:flex lg:border-r">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, #1C1C28 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6990A]/30 to-transparent" />

      <Link href="/landing" className="relative z-10 mb-auto flex items-center gap-3">
        <AuthLogo size="md" />
        <div>
          <span className="block text-base font-bold text-[#EEEEF2]">PdfParseRag</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#E6990A]/80">
            Document Intelligence
          </span>
        </div>
      </Link>

      <div className="relative z-10 my-10">
        <h2 className="mb-3 text-3xl font-bold leading-tight text-[#EEEEF2]" style={{ letterSpacing: '-0.03em' }}>
          {headline}{' '}
          <span className="text-[#E6990A]">{highlight}</span>
        </h2>
        <p className="text-sm leading-relaxed text-[#7A7A96]">{description}</p>
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

function AuthLogo({ size }: { size: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2A7FBF] to-[#7A5FC0]`}>
      <Sparkles className={`${icon} text-[#EEEEF2]`} />
    </div>
  );
}

export function AuthSuccessState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#1DB875]/40 bg-[#1DB875]/10">
          <span className="text-3xl text-[#1DB875]">✓</span>
        </div>
        <div className="absolute inset-0 animate-ping rounded-full bg-[#1DB875]/10" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-bold text-[#EEEEF2]">{title}</h3>
        <p className="mt-1 text-sm text-[#7A7A96]">{subtitle}</p>
      </div>
    </div>
  );
}

export function AuthErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[8px]">
        !
      </span>
      {message}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-[#1C1C28]" />
      <span className="font-mono text-[10px] text-[#3C3C54]">OR</span>
      <div className="h-px flex-1 bg-[#1C1C28]" />
    </div>
  );
}

export function AuthFooterLink({ text, linkText, href }: { text: string; linkText: string; href: string }) {
  return (
    <p className="text-center text-xs text-[#3C3C54]">
      {text}{' '}
      <Link href={href} className="font-semibold text-[#E6990A] transition-colors hover:text-[#D4880A]">
        {linkText}
      </Link>
    </p>
  );
}
