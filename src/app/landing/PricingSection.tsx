'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, Zap, Star, Building2, ArrowRight, Minus } from 'lucide-react';

/* ─── Data ──────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    badge: null,
    price: { monthly: 0, yearly: 0 },
    desc: 'Perfect for exploring PdfParseRag and personal projects.',
    Icon: Zap,
    href: '/auth/sign-up?plan=free',
    cta: 'Get started free',
    accent: false,
    features: [
      '3 documents / month',
      '50 AI queries / month',
      'Basic PDF & TXT parsing',
      'Vector search (768D)',
      'Gemini 2.5 Flash answers',
      'Community support',
    ],
    missing: [
      'Query expansion',
      'RRF rank fusion',
      'Analytics dashboard',
      'Priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Most popular',
    price: { monthly: 29, yearly: 19 },
    desc: 'For developers, researchers, and growing teams.',
    Icon: Star,
    href: '/auth/sign-up?plan=pro',
    cta: 'Start Pro trial',
    accent: true,
    features: [
      '100 documents / month',
      '2,000 AI queries / month',
      'All 6 file formats supported',
      'Hybrid vector + full-text search',
      'LLM query expansion × 3',
      'Reciprocal rank fusion (RRF)',
      'Visual pipeline trace',
      'Latency analytics dashboard',
      'Citation & page viewer',
      'Priority email support',
    ],
    missing: [
      'Custom embedding model',
      'Dedicated DB instance',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Custom pricing',
    price: { monthly: null, yearly: null },
    desc: 'For large teams, enterprises, and custom deployments.',
    Icon: Building2,
    href: 'mailto:enterprise@insightrag.ai',
    cta: 'Contact sales',
    accent: false,
    features: [
      'Unlimited documents',
      'Unlimited AI queries',
      'All Pro features included',
      'Custom embedding models',
      'Dedicated Neon DB instance',
      'Cross-encoder re-ranking',
      'RAGAS quality evaluation',
      'Token & cost tracking',
      'SSO & team management',
      'SLA guarantee',
      'Dedicated onboarding',
      '24 / 7 priority support',
    ],
    missing: [],
  },
];

/* ─── Component ─────────────────────────────────────────────────── */
export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-[#08080C] px-4 py-20 sm:px-5 lg:px-6"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-72 w-[560px] -translate-x-1/2 rounded-full bg-[#E6990A] opacity-[0.04] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">

        {/* ── Header ── */}
        <div className="mb-12 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E6990A]/20 bg-[#E6990A]/[0.07] px-4 py-1.5">
            <Star className="h-3 w-3 text-[#E6990A]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#E6990A]">
              Simple pricing
            </span>
          </div>

          <h2 className="mb-4 text-4xl font-bold tracking-tight text-[#EEEEF2] sm:text-5xl" style={{ letterSpacing: '-0.035em' }}>
            Choose your{' '}
            <span className="text-[#E6990A]">plan</span>
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-[#7A7A96]">
            Start free. Scale as you grow. No hidden fees.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-[#1C1C28] bg-[#0F0F16] p-1">
            <button
              onClick={() => setYearly(false)}
              className={`cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200 ${!yearly
                  ? 'bg-[#E6990A] text-[#08080C]'
                  : 'text-[#7A7A96] hover:text-[#EEEEF2]'
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`cursor-pointer inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200 ${yearly
                  ? 'bg-[#E6990A] text-[#08080C]'
                  : 'text-[#7A7A96] hover:text-[#EEEEF2]'
                }`}
            >
              Yearly
              <span className="rounded-full bg-[#1DB875]/15 px-1.5 py-0.5 font-mono text-[9px] text-[#1DB875]">
                Save 35%
              </span>
            </button>
          </div>
        </div>

        {/* ── Pricing cards ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const { Icon } = plan;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${plan.accent
                    ? 'border border-[#E6990A]/40 bg-[#0F0F16] shadow-[0_0_60px_#E6990A08]'
                    : 'border border-[#1C1C28] bg-[#0F0F16] hover:border-[#2A2A3A]'
                  }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${plan.accent
                      ? 'bg-[#E6990A] text-[#08080C]'
                      : 'border border-[#1C1C28] bg-[#111120] text-[#7A7A96]'
                    }`}>
                    {plan.badge}
                  </div>
                )}

                {/* Plan icon */}
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${plan.accent
                    ? 'bg-[#E6990A]/15 border border-[#E6990A]/30'
                    : 'bg-[#111120] border border-[#1C1C28]'
                  }`}>
                  <Icon
                    className="h-5 w-5"
                    style={{ color: plan.accent ? '#E6990A' : '#7A7A96' }}
                  />
                </div>

                {/* Name + desc */}
                <h3 className="mb-1 text-base font-bold text-[#EEEEF2]">{plan.name}</h3>
                <p className="mb-5 text-xs leading-relaxed text-[#3C3C54]">{plan.desc}</p>

                {/* Price */}
                <div className="mb-6">
                  {plan.price.monthly === null ? (
                    <span className="text-3xl font-bold text-[#EEEEF2]">Custom</span>
                  ) : plan.price.monthly === 0 ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#EEEEF2]">Free</span>
                      <span className="font-mono text-xs text-[#3C3C54]">forever</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-[#EEEEF2]">
                          ${yearly ? plan.price.yearly : plan.price.monthly}
                        </span>
                        <span className="font-mono text-xs text-[#3C3C54]">/mo</span>
                      </div>
                      {yearly && (
                        <p className="mt-0.5 font-mono text-[10px] text-[#3C3C54]">billed annually</p>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Link href={plan.href} className="mb-6 block">
                  <Button
                    className={`w-full cursor-pointer rounded-xl py-5 text-sm font-semibold transition-all duration-200 ${plan.accent
                        ? 'bg-[#E6990A] text-[#08080C] hover:bg-[#D4880A] border-0'
                        : 'border border-[#1C1C28] bg-transparent text-[#7A7A96] hover:text-[#EEEEF2] hover:border-[#2A2A3A]'
                      }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {plan.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Button>
                </Link>

                {/* Divider */}
                <div className="mb-4 h-px w-full bg-[#1C1C28]" />

                {/* Features */}
                <ul className="flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-[#7A7A96]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1DB875]" />
                      {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-[#2A2A3A] line-through">
                      <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1C1C28]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}