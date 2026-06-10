'use client';

import React from 'react';
import { Button } from '../ui/button';
import { History, Activity, FileText, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChatPanelId = 'history' | 'trace' | 'viewer' | 'targets';

interface ChatToolbarProps {
  activePanel: ChatPanelId | null;
  onTogglePanel: (panel: ChatPanelId) => void;
}

const TOOLBAR_ITEMS: { id: ChatPanelId; icon: React.ElementType; label: string; title: string }[] = [
  { id: 'history', icon: History, label: 'History', title: 'Chat history' },
  { id: 'trace', icon: Activity, label: 'Trace', title: 'RAG pipeline trace' },
  { id: 'viewer', icon: FileText, label: 'Viewer', title: 'Document page viewer' },
  { id: 'targets', icon: Target, label: 'Documents', title: 'Multi-document target search' },
];

export default function ChatToolbar({ activePanel, onTogglePanel }: ChatToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      {TOOLBAR_ITEMS.map(({ id, icon: Icon, label, title }) => {
        const isActive = activePanel === id;
        return (
          <Button
            key={id}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onTogglePanel(id)}
            title={title}
            className={cn(
              'cursor-pointer gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all',
              isActive
                ? 'bg-primary/15 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
