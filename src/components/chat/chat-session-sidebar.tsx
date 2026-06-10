'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import {
  MessageSquarePlus,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  History,
} from 'lucide-react';
import type { ChatSession } from '@/types/rag';

interface ChatSessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onSearch: (query: string) => void;
  embedded?: boolean;
}

export default function ChatSessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onSearch,
  embedded = false,
}: ChatSessionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const startRename = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const commitRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden ${
        embedded ? 'w-full bg-transparent' : 'w-56 shrink-0 border-r border-border/40 bg-card/20'
      }`}
    >
      <div className={`shrink-0 p-3 ${embedded ? '' : 'border-b border-border/40'}`}>
        {!embedded && (
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Chat History
          </div>
        )}
        <Button
          onClick={onNew}
          size="sm"
          className="mb-2 w-full cursor-pointer gap-1.5 text-xs"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          New Session
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search sessions…"
            className="h-8 border-border/40 bg-background/50 pl-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 p-2 pb-4">
          {sessions.length === 0 ? (
            <p className="px-2 py-4 text-center text-[10px] text-muted-foreground">
              No saved sessions yet
            </p>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingId === session.id;

              return (
                <div
                  key={session.id}
                  className={`group rounded-lg border transition-all ${
                    isActive
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-transparent hover:border-border/40 hover:bg-secondary/30'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 p-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-7 flex-1 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 cursor-pointer" onClick={commitRename}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 cursor-pointer" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1 px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => onSelect(session.id)}
                        className="min-w-0 flex-1 cursor-pointer text-left"
                      >
                        <p className="line-clamp-2 text-xs font-semibold text-foreground">
                          {session.title}
                        </p>
                        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                          {session.messages.length} msgs ·{' '}
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startRename(session)}
                          className="cursor-pointer rounded p-0.5 text-muted-foreground hover:text-primary"
                          title="Rename session"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Delete this conversation?')) onDelete(session.id);
                          }}
                          className="cursor-pointer rounded p-0.5 text-muted-foreground hover:text-destructive"
                          title="Delete session"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
