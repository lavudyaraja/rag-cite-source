'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DocumentPanel, { Document } from '../document-panel';
import DocumentViewer from '../document-viewer';
import TraceVisualizer from '../trace-visualizer';
import ChatSessionSidebar from './chat-session-sidebar';
import DocumentTargetSelector from './document-target-selector';
import EnhancedChatWindow from './enhanced-chat-window';
import ChatToolbar, { ChatPanelId } from './chat-toolbar';
import ResizableSlidePanel from './resizable-slide-panel';
import {
  loadSessions,
  saveSessions,
  createSession,
  upsertSession,
  deleteSession,
  searchSessions,
  deriveSessionTitle,
  fetchSessionsFromDb,
  saveSessionToDb,
  deleteSessionFromDb,
} from '@/lib/chat-sessions';
import { saveLastTrace } from '@/lib/trace-store';
import type { ChatSession, RagTrace } from '@/types/rag';

const PANEL_CONFIG: Record<
  ChatPanelId,
  {
    side: 'left' | 'right';
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
    resizable: boolean;
    storageKey: string;
  }
> = {
  history: {
    side: 'left',
    defaultWidth: 220,
    minWidth: 200,
    maxWidth: 300,
    resizable: false,
    storageKey: 'insightrag:panel-width-history',
  },
  targets: {
    side: 'left',
    defaultWidth: 340,
    minWidth: 280,
    maxWidth: 560,
    resizable: true,
    storageKey: 'insightrag:panel-width-targets',
  },
  trace: {
    side: 'right',
    defaultWidth: 420,
    minWidth: 300,
    maxWidth: 720,
    resizable: true,
    storageKey: 'insightrag:panel-width-trace',
  },
  viewer: {
    side: 'right',
    defaultWidth: 480,
    minWidth: 320,
    maxWidth: 800,
    resizable: true,
    storageKey: 'insightrag:panel-width-viewer',
  },
};

export default function ChatEngine() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [trace, setTrace] = useState<RagTrace | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [highlightedChunkIndex, setHighlightedChunkIndex] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<ChatPanelId | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  useEffect(() => {
    (async () => {
      const fromDb = await fetchSessionsFromDb();
      let stored = fromDb ?? loadSessions();
      if (stored.length === 0) {
        const fresh = createSession();
        stored = [fresh];
        saveSessions(stored);
        await saveSessionToDb(fresh);
      }
      setSessions(stored);
      setFilteredSessions(stored);
      setActiveSessionId(stored[0].id);
      setSelectedDocIds(stored[0].selectedDocIds);
    })();
  }, []);

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAllDocs(data.documents);
          if (data.documents.length > 0 && !activeDocId) {
            setActiveDocId(data.documents[0].id);
            setActiveFilename(data.documents[0].filename);
          }
        }
      })
      .catch(console.error);
  }, []);

  const persistSession = useCallback((updated: ChatSession) => {
    setSessions((prev) => {
      const next = upsertSession(prev, updated);
      setFilteredSessions(searchSessions(next, ''));
      saveSessions(next);
      void saveSessionToDb(updated);
      return next;
    });
  }, []);

  const togglePanel = (panel: ChatPanelId) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const openPanel = (panel: ChatPanelId) => {
    setActivePanel(panel);
  };

  const handleNewSession = () => {
    const fresh = createSession();
    setSessions((prev) => {
      const next = [fresh, ...prev];
      saveSessions(next);
      void saveSessionToDb(fresh);
      return next;
    });
    setFilteredSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
    setSelectedDocIds([]);
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    setActiveSessionId(id);
    setSelectedDocIds(session.selectedDocIds);
    setActivePanel(null);
  };

  const handleRenameSession = (id: string, title: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    persistSession({ ...session, title });
  };

  const handleDeleteSession = (id: string) => {
    void deleteSessionFromDb(id);
    setSessions((prev) => {
      const next = deleteSession(prev, id);
      if (next.length === 0) {
        const fresh = createSession();
        const created = [fresh];
        saveSessions(created);
        void saveSessionToDb(fresh);
        setActiveSessionId(fresh.id);
        setFilteredSessions(created);
        return created;
      }
      saveSessions(next);
      setFilteredSessions(next);
      if (activeSessionId === id) {
        setActiveSessionId(next[0].id);
        setSelectedDocIds(next[0].selectedDocIds);
      }
      return next;
    });
  };

  const handleSessionSearch = (query: string) => {
    setFilteredSessions(searchSessions(sessions, query));
  };

  const handleMessagesChange = useCallback(
    (messages: ChatSession['messages']) => {
      setSessions((prevSessions) => {
        const session = prevSessions.find((s) => s.id === activeSessionId);
        if (!session) return prevSessions;
        const title =
          session.title === 'New conversation'
            ? deriveSessionTitle(messages)
            : session.title;
        const next = upsertSession(prevSessions, {
          ...session,
          messages,
          title,
          selectedDocIds,
        });
        saveSessions(next);
        void saveSessionToDb({
          ...session,
          messages,
          title,
          selectedDocIds,
        });
        return next;
      });
    },
    [activeSessionId, selectedDocIds]
  );

  const handleTraceReceived = useCallback((newTrace: RagTrace, answer?: string) => {
    setTrace((prev) => {
      const merged = { ...prev, ...newTrace } as RagTrace;
      saveLastTrace(merged, answer || undefined);
      return merged;
    });
  }, []);

  const handleCitationClick = (index: number) => {
    if (!trace?.retrievedChunks) return;
    const chunk = trace.retrievedChunks[index];
    if (!chunk) return;
    setHighlightedChunkIndex(index);
    const matchingDoc = allDocs.find((d) => d.filename === chunk.filename);
    if (matchingDoc) {
      setActiveDocId(matchingDoc.id);
      setActiveFilename(matchingDoc.filename);
      setActivePageNumber(chunk.pageNumber);
      openPanel('viewer');
    }
  };

  const panelTitle: Record<ChatPanelId, string> = {
    history: 'Chat History',
    trace: 'RAG Pipeline Trace',
    viewer: 'Document Page Viewer',
    targets: 'Multi-Document Search',
  };

  const renderPanelContent = (panel: ChatPanelId) => {
    switch (panel) {
      case 'history':
        return (
          <ChatSessionSidebar
            sessions={filteredSessions}
            activeSessionId={activeSessionId}
            onSelect={handleSelectSession}
            onNew={handleNewSession}
            onRename={handleRenameSession}
            onDelete={handleDeleteSession}
            onSearch={handleSessionSearch}
            embedded
          />
        );
      case 'trace':
        return (
          <TraceVisualizer
            trace={trace}
            highlightedChunkIndex={highlightedChunkIndex}
            onClearHighlight={() => setHighlightedChunkIndex(null)}
          />
        );
      case 'viewer':
        return (
          <DocumentViewer
            activeDocId={activeDocId}
            filename={activeFilename}
            activePageNumber={activePageNumber}
            onClose={() => setActivePanel(null)}
          />
        );
      case 'targets':
        return (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border/30 p-4">
              <DocumentTargetSelector
                documents={allDocs}
                selectedIds={selectedDocIds}
                onSelectionChange={(ids) => {
                  setSelectedDocIds(ids);
                  if (activeSession) {
                    persistSession({ ...activeSession, selectedDocIds: ids });
                  }
                }}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <DocumentPanel
                selectedIds={selectedDocIds}
                onSelectionChange={setSelectedDocIds}
                activeId={activeDocId}
                onActiveChange={(id, filename) => {
                  setActiveDocId(id);
                  setActiveFilename(filename);
                  setActivePageNumber(null);
                }}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/30 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-foreground">Chat Engine</h2>
          <p className="truncate text-[10px] text-muted-foreground">
            {allDocs.length === 0
              ? 'No documents — open Documents to upload'
              : selectedDocIds.length === 0
                ? `Searching all ${allDocs.length} document(s)`
                : `${selectedDocIds.length} of ${allDocs.length} document(s) targeted`}
          </p>
        </div>
        <ChatToolbar activePanel={activePanel} onTogglePanel={togglePanel} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/30 glass-panel">
          <EnhancedChatWindow
            key={activeSessionId}
            initialMessages={activeSession?.messages || []}
            selectedDocIds={selectedDocIds}
            hasDocuments={allDocs.length > 0}
            highlightTerms={
              trace?.retrievedChunks?.[0]?.content
                ? trace.retrievedChunks[0].content.split(/\s+/).slice(0, 8)
                : []
            }
            onMessagesChange={handleMessagesChange}
            onTraceReceived={handleTraceReceived}
            onCitationClick={handleCitationClick}
            onOpenDocuments={() => openPanel('targets')}
          />
        </div>
      </div>

      {(['history', 'trace', 'viewer', 'targets'] as ChatPanelId[]).map((panel) => {
        const cfg = PANEL_CONFIG[panel];
        return (
          <ResizableSlidePanel
            key={panel}
            open={activePanel === panel}
            side={cfg.side}
            title={panelTitle[panel]}
            onClose={() => setActivePanel(null)}
            storageKey={cfg.storageKey}
            defaultWidth={cfg.defaultWidth}
            minWidth={cfg.minWidth}
            maxWidth={cfg.maxWidth}
            resizable={cfg.resizable}
          >
            {renderPanelContent(panel)}
          </ResizableSlidePanel>
        );
      })}
    </div>
  );
}
