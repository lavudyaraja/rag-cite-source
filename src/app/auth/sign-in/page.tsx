'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, Check, ShieldCheck, FileText, Zap, BarChart2, Brain } from 'lucide-react';
import {
  AuthPageLayout,
  AuthCard,
  AuthFormPanel,
  AuthBrandPanel,
  AuthSuccessState,
  AuthErrorBox,
  AuthDivider,
  AuthFooterLink,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
} from '../AuthShell';

const FEATURES = [
  { icon: FileText, title: 'Multi-format parsing', desc: 'PDF, DOCX, CSV, MD, JSON, TXT' },
  { icon: Brain, title: 'Hybrid RAG search', desc: 'Vector + full-text with RRF fusion' },
  { icon: Zap, title: 'Gemini 2.5 Flash', desc: 'Real-time streaming citations' },
  { icon: BarChart2, title: 'Analytics dashboard', desc: 'Latency, rank, cost tracking' },
];

const TRUSTED_BY = ['Researchers', 'Developers', 'Analysts', 'Engineers'];

function SignInContent() {
  const router = useRouter();
  const params = useSearchParams();
  const justRegistered = params.get('registered') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('rag_user', JSON.stringify(data.user));
        setDone(true);
        setTimeout(() => router.push('/dashboard/documents'), 1400);
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formPanel = (
    <AuthFormPanel title="Welcome back" subtitle="Sign in to your PdfParseRag workspace">
      {done ? (
        <AuthSuccessState title="Welcome back!" subtitle="Redirecting to your workspace..." />
      ) : (
        <>
          {justRegistered && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#1DB875]/25 bg-[#1DB875]/10 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1DB875]/30 bg-[#1DB875]/15">
                <Check className="h-3.5 w-3.5 text-[#1DB875]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#1DB875]">Account created successfully!</p>
                <p className="text-[10px] text-[#3C3C54]">Sign in with your new credentials below.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className={AUTH_LABEL_CLASS}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3C3C54]" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={AUTH_INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={AUTH_LABEL_CLASS}>Password</label>
                <Link href="#" className="text-[10px] font-medium text-[#E6990A] transition-colors hover:text-[#D4880A]">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3C3C54]" />
                <Input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${AUTH_INPUT_CLASS} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-[#3C3C54] transition-colors hover:text-[#EEEEF2]"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <AuthErrorBox message={error} />}

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="mt-1 h-12 cursor-pointer gap-2 rounded-xl border-0 bg-[#E6990A] font-semibold text-[#08080C] hover:bg-[#D4880A] disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#08080C]/30 border-t-[#08080C]" />
                  Signing in...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Sign in to dashboard
                </>
              )}
            </Button>

            <AuthDivider />

            <Link href="/dashboard/documents">
              <Button
                variant="ghost"
                className="h-11 w-full cursor-pointer rounded-xl border border-[#1C1C28] bg-transparent text-sm font-medium text-[#7A7A96] hover:border-[#3C3C54] hover:bg-transparent hover:text-[#EEEEF2]"
              >
                Continue as guest
              </Button>
            </Link>

            <AuthFooterLink text="Don't have an account?" linkText="Sign up free" href="/auth/sign-up" />
          </form>
        </>
      )}
    </AuthFormPanel>
  );

  const brandPanel = (
    <AuthBrandPanel
      headline="Your AI research"
      highlight="co-pilot awaits"
      description="Ask complex questions about your documents and get precise, cited answers in real time."
    >
      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col gap-2.5 rounded-xl border border-[#1C1C28] bg-[#0F0F16] p-4 transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[#E6990A]/25 bg-[#E6990A]/10">
              <Icon className="h-4 w-4 text-[#E6990A]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#EEEEF2]">{title}</p>
              <p className="mt-0.5 text-[10px] text-[#3C3C54]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-[#1C1C28] pt-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-[#3C3C54]">Trusted by</p>
        <div className="flex flex-wrap gap-2">
          {TRUSTED_BY.map((role) => (
            <span
              key={role}
              className="rounded-full border border-[#1C1C28] bg-[#0F0F16] px-2.5 py-1 text-[10px] font-semibold text-[#7A7A96]"
            >
              {role}
            </span>
          ))}
        </div>
      </div>
    </AuthBrandPanel>
  );

  return (
    <AuthPageLayout>
      <AuthCard formPanel={formPanel} brandPanel={brandPanel} formFirst />
    </AuthPageLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#08080C]" />}>
      <SignInContent />
    </Suspense>
  );
}
