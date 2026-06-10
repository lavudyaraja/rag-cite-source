'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut, ChevronUp, Shield, Crown, Zap } from 'lucide-react';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  plan: string;
}

const PLAN_STYLES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pro:        { label: 'Pro',        color: '#E6990A', icon: Crown },
  enterprise: { label: 'Enterprise', color: '#7A5FC0', icon: Shield },
  free:       { label: 'Free',       color: '#7A7A96', icon: Zap },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function UserProfile() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('rag_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem('rag_user');
    router.push('/auth/sign-in');
  };

  const planInfo = PLAN_STYLES[user?.plan ?? 'free'] ?? PLAN_STYLES.free;
  const PlanIcon = planInfo.icon;

  if (!user) {
    return (
      <div className="p-3">
        <button
          onClick={() => router.push('/auth/sign-in')}
          className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-border px-3 py-2.5 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary transition-colors group-hover:border-primary/30">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 text-left">
            <p className="truncate text-xs font-semibold">Guest mode</p>
            <p className="truncate font-mono text-[9px] opacity-70">Sign in for full access</p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative p-3" ref={menuRef}>
      {open && (
        <div className="absolute bottom-full left-3 right-3 z-50 mb-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2A7FBF] to-[#7A5FC0] text-sm font-bold text-[#EEEEF2]">
                {getInitials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
                <p className="truncate font-mono text-[10px] text-[#3C3C54]">{user.email}</p>
              </div>
            </div>
            <div
              className="mt-3 flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{ background: `${planInfo.color}14`, border: `1px solid ${planInfo.color}30` }}
            >
              <PlanIcon className="h-3 w-3" style={{ color: planInfo.color }} />
              <span className="font-mono text-[10px] font-bold" style={{ color: planInfo.color }}>
                {planInfo.label} Plan
              </span>
            </div>
          </div>

          <div className="p-1.5">
            <button
              onClick={() => setOpen(false)}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 transition-colors group-hover:bg-primary/15">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold">Profile</p>
                <p className="text-[9px] text-[#3C3C54]">View & edit account</p>
              </div>
            </button>

            <button
              onClick={() => setOpen(false)}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#7A5FC0]/20 bg-[#7A5FC0]/10 transition-colors group-hover:bg-[#7A5FC0]/15">
                <Settings className="h-3.5 w-3.5 text-[#7A5FC0]" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold">Settings</p>
                <p className="text-[9px] text-[#3C3C54]">Preferences & API keys</p>
              </div>
            </button>

            <div className="mx-1 my-1 h-px bg-border" />

            <button
              onClick={handleLogout}
              className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/15 bg-red-500/10 transition-colors group-hover:bg-red-500/15">
                <LogOut className="h-3.5 w-3.5 text-red-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold">Sign out</p>
                <p className="text-[9px] text-[#3C3C54]">End your session</p>
              </div>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
          open
            ? 'border-primary/40 bg-primary/10'
            : 'border-border hover:border-[#3C3C54] hover:bg-secondary'
        }`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2A7FBF] to-[#7A5FC0] text-[11px] font-bold text-[#EEEEF2]">
          {getInitials(user.name)}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-bold leading-tight text-foreground">{user.name}</p>
          <p className="truncate font-mono text-[9px] text-[#3C3C54]">{user.email}</p>
        </div>
        <ChevronUp
          className={`h-3.5 w-3.5 shrink-0 text-[#3C3C54] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
}
