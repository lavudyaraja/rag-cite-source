'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  PanelLeftOpen,
  PanelLeftClose,
  MessageSquare,
  Activity,
  Clock,
  Grid3X3,
  Shield,
  Coins,
  FlaskConical,
  BarChart3,
} from 'lucide-react';
import UserProfile from '../../components/user-profile';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  featureId?: number;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navSections: NavSection[] = [
    {
      label: 'Navigation',
      items: [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Documents', href: '/dashboard/documents', icon: FileText },
      ],
    },
    {
      label: 'Chat & Citations',
      items: [
        { name: 'Chat Engine', href: '/dashboard/chat', icon: MessageSquare },
      ],
    },
    {
      label: 'Analytics & Dev Tools',
      items: [
        { name: 'Analytics Hub', href: '/dashboard/analytics', icon: BarChart3 },
        { name: 'Pipeline Trace', href: '/dashboard/analytics/pipeline', icon: Activity, featureId: 25 },
        { name: 'Latency Breakdown', href: '/dashboard/analytics/latency', icon: Clock, featureId: 26 },
        { name: 'RRF Heatmap', href: '/dashboard/analytics/rrf', icon: Grid3X3, featureId: 27 },
        { name: 'RAGAS Evaluation', href: '/dashboard/analytics/ragas', icon: Shield, featureId: 28 },
        { name: 'Token & Cost', href: '/dashboard/analytics/tokens', icon: Coins, featureId: 29 },
        { name: 'Dry-Run Tester', href: '/dashboard/analytics/dry-run', icon: FlaskConical, featureId: 30 },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/analytics') return pathname === '/dashboard/analytics';
    if (href === '/dashboard/chat') return pathname === '/dashboard/chat';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <aside
        className={`glass-panel flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border transition-all duration-300 ${
          isSidebarCollapsed ? 'w-0 border-r-0' : 'w-64'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-border p-6">
          <Link href="/landing" className="flex min-w-0 items-center gap-2.5 no-underline">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2A7FBF] to-[#7A5FC0]">
              <Sparkles className="h-4 w-4 text-[#EEEEF2]" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-foreground">PdfParseRag</h1>
              <span className="block font-mono text-[9px] text-muted-foreground">Workspace</span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(true)}
            className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-primary"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="flex flex-col gap-4 p-4 pb-6">
            {navSections.map((section) => (
              <div key={section.label}>
                <span className="mb-2 block px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-[#3C3C54]">
                  {section.label}
                </span>
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={`${section.label}-${item.name}`}
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 no-underline ${
                          active
                            ? 'border-primary/25 bg-primary/10 font-semibold text-primary'
                            : 'border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                            active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        {item.featureId && (
                          <span className="shrink-0 font-mono text-[9px] text-muted-foreground/50">
                            #{item.featureId}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="shrink-0 border-t border-border">
          <UserProfile />
          <div className="px-6 pb-3">
            <span className="font-mono text-[9px] text-[#3C3C54]">PdfParseRag v1.0 · Serverless</span>
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        {isSidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute left-4 top-4 z-50 cursor-pointer rounded-lg border border-border bg-card text-muted-foreground shadow-md transition-all hover:text-primary"
            title="Open sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}
        {children}
      </main>
    </div>
  );
}
