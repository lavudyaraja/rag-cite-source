'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, User, Check, ArrowRight, ArrowLeft, Shield, Zap, Brain } from 'lucide-react';
import {
  AuthPageLayout,
  AuthCard,
  AuthFormPanel,
  AuthBrandPanelLeft,
  AuthSuccessState,
  AuthErrorBox,
  AuthFooterLink,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
} from '../AuthShell';

const PLANS = [
  {
    id: 'free',
    label: 'Free',
    price: '$0',
    period: '/mo',
    features: ['3 documents', '50 queries/mo', 'Basic search'],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '$29',
    period: '/mo',
    badge: 'Popular',
    features: ['100 documents', '2K queries/mo', 'RRF Hybrid search', 'Analytics'],
  },
];

const PERKS = [
  { icon: Zap, label: 'Real-time AI streaming', desc: 'Gemini 2.5 Flash answers' },
  { icon: Brain, label: 'Hybrid vector search', desc: 'RRF + pgvector fusion' },
  { icon: Shield, label: 'Secure & private', desc: 'bcrypt + Neon DB' },
];

function getStrengthLevel(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#3b82f6', '#1DB875'];

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [plan, setPlan] = useState(params.get('plan') || 'free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = password ? getStrengthLevel(password) : 0;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, plan }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(() => router.push('/auth/sign-in?registered=1'), 1600);
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return <AuthSuccessState title="Account created!" subtitle="Taking you to sign in..." />;
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                  step >= s
                    ? 'border-transparent bg-[#E6990A] text-[#08080C]'
                    : 'border-[#1C1C28] text-[#3C3C54]'
                }`}
              >
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? 'text-[#EEEEF2]' : 'text-[#3C3C54]'}`}>
                {s === 1 ? 'Your details' : 'Set password'}
              </span>
            </div>
            {s < 2 && (
              <div className={`h-px flex-1 transition-all duration-500 ${step > 1 ? 'bg-[#E6990A]' : 'bg-[#1C1C28]'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {step === 1 ? (
        <form onSubmit={handleNext} className="flex flex-col gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#7A7A96]">Choose plan</p>
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`relative cursor-pointer rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                    plan === p.id
                      ? 'border-[#E6990A]/60 bg-[#E6990A]/5'
                      : 'border-[#1C1C28] bg-[#111120] hover:border-[#3C3C54]'
                  }`}
                >
                  {p.badge && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-[#E6990A] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#08080C]">
                      {p.badge}
                    </span>
                  )}
                  <div className="mb-2 flex items-end gap-0.5">
                    <span className="text-xl font-bold text-[#EEEEF2]">{p.price}</span>
                    <span className="mb-0.5 font-mono text-xs text-[#3C3C54]">{p.period}</span>
                  </div>
                  <p className="mb-1.5 text-xs font-semibold text-[#EEEEF2]">{p.label}</p>
                  <ul className="space-y-0.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[10px] text-[#3C3C54]">
                        <span className="h-1 w-1 shrink-0 rounded-full bg-[#E6990A]/50" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan === p.id && (
                    <div className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border border-[#E6990A]/50 bg-[#E6990A]/20">
                      <Check className="h-2.5 w-2.5 text-[#E6990A]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={AUTH_LABEL_CLASS}>Full name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3C3C54]" />
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className={AUTH_INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={AUTH_LABEL_CLASS}>Email address</label>
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

          <Button
            type="submit"
            disabled={!name.trim() || !email.trim()}
            className="mt-1 h-12 cursor-pointer gap-2 rounded-xl border-0 bg-[#E6990A] font-semibold text-[#08080C] hover:bg-[#D4880A] disabled:opacity-40"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-[#7A7A96] transition-colors hover:text-[#EEEEF2]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to details
          </button>

          <div className="flex items-center gap-3 rounded-xl border border-[#1C1C28] bg-[#111120] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2A7FBF] to-[#7A5FC0] text-xs font-bold text-[#EEEEF2]">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#EEEEF2]">{name}</p>
              <p className="truncate text-[10px] text-[#3C3C54]">{email}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-full border border-[#E6990A]/20 bg-[#E6990A]/10 px-2 py-1 font-mono text-[9px] font-bold uppercase text-[#E6990A]">
              {plan}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className={AUTH_LABEL_CLASS}>Create password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3C3C54]" />
              <Input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
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

            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all duration-400"
                      style={{ backgroundColor: strength >= i ? STRENGTH_COLORS[strength] : '#1C1C28' }}
                    />
                  ))}
                </div>
                <p className="font-mono text-[10px]" style={{ color: STRENGTH_COLORS[strength] || '#3C3C54' }}>
                  {STRENGTH_LABELS[strength] || 'Enter password'}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: '8+ characters', ok: password.length >= 8 },
              { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
              { label: 'Number', ok: /[0-9]/.test(password) },
              { label: 'Special char', ok: /[^A-Za-z0-9]/.test(password) },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full transition-all duration-200 ${
                    ok ? 'border border-[#1DB875]/50 bg-[#1DB875]/20' : 'border border-[#1C1C28]'
                  }`}
                >
                  {ok && <Check className="h-2 w-2 text-[#1DB875]" />}
                </div>
                <span className={`text-[10px] transition-colors ${ok ? 'text-[#1DB875]' : 'text-[#3C3C54]'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {error && <AuthErrorBox message={error} />}

          <Button
            type="submit"
            disabled={loading || password.length < 8}
            className="h-12 cursor-pointer gap-2 rounded-xl border-0 bg-[#E6990A] font-semibold text-[#08080C] hover:bg-[#D4880A] disabled:opacity-40"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#08080C]/30 border-t-[#08080C]" />
                Creating account...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Create account
              </>
            )}
          </Button>
        </form>
      )}

      <div className="mt-5">
        <AuthFooterLink text="Already have an account?" linkText="Sign in" href="/auth/sign-in" />
      </div>
    </div>
  );
}

function SignUpContent() {
  const brandPanel = (
    <AuthBrandPanelLeft
      headline="Unlock the power of"
      highlight="AI search"
      description="Upload your documents, ask questions, and get cited answers in real time — powered by Gemini and Neon pgvector."
    >
      <div className="flex flex-col gap-3">
        {PERKS.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-3.5 rounded-xl border border-[#1C1C28] bg-[#0F0F16] p-3.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[#E6990A]/25 bg-[#E6990A]/10">
              <Icon className="h-4 w-4 text-[#E6990A]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#EEEEF2]">{label}</p>
              <p className="text-[10px] text-[#3C3C54]">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-[#1C1C28] bg-[#0F0F16] p-4">
        <p className="text-xs italic leading-relaxed text-[#7A7A96]">
          &quot;PdfParseRag transformed how our team processes research documents. The citation accuracy is unmatched.&quot;
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#2A7FBF] to-[#7A5FC0] text-[9px] font-bold text-[#EEEEF2]">
            A
          </div>
          <p className="text-[10px] font-semibold text-[#7A7A96]">
            Arjun Sharma <span className="text-[#3C3C54]">— ML Engineer</span>
          </p>
        </div>
      </div>
    </AuthBrandPanelLeft>
  );

  const formPanel = (
    <AuthFormPanel
      title="Create your account"
      subtitle="Join PdfParseRag — it's free to start"
      backPosition="right"
    >
      <Suspense fallback={<div className="animate-pulse text-xs text-[#3C3C54]">Loading...</div>}>
        <SignUpForm />
      </Suspense>
    </AuthFormPanel>
  );

  return (
    <AuthPageLayout>
      <AuthCard formPanel={formPanel} brandPanel={brandPanel} formFirst={false} />
    </AuthPageLayout>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#08080C]" />}>
      <SignUpContent />
    </Suspense>
  );
}
