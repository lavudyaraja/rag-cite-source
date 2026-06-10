'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Send, Bot, User, AlertCircle, FileText, Upload, Target } from 'lucide-react';
import CitationHighlighter from './citation-highlighter';
import StreamingIndicator from './streaming-indicator';
import type { ChatMessage, RagTrace } from '@/types/rag';
import { formatUserFacingError } from '@/lib/gemini-errors';

const WELCOME: ChatMessage = {
  role: 'assistant',
  text: "Hello! I'm PdfParseRag. Open the **Documents** panel to upload files, select your search scope, then ask a question. I'll stream answers with traceable [Source N] citations.",
};

const NO_DOCS_REPLY: ChatMessage = {
  role: 'assistant',
  text: `**No documents indexed yet**

To get started:

1. Click the **Documents** button in the toolbar above
2. Upload a PDF, DOCX, TXT, or other supported file
3. Select the document(s) you want to search
4. Ask your question again`,
};

interface EnhancedChatWindowProps {
  initialMessages?: ChatMessage[];
  selectedDocIds: string[];
  hasDocuments: boolean;
  highlightTerms?: string[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  onTraceReceived: (trace: RagTrace, answer?: string) => void;
  onCitationClick: (sourceIndex: number) => void;
  onOpenDocuments?: () => void;
}

function filterPersisted(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => m !== WELCOME || messages.length === 1);
}

export default function EnhancedChatWindow({
  initialMessages = [],
  selectedDocIds,
  hasDocuments,
  highlightTerms = [],
  onMessagesChange,
  onTraceReceived,
  onCitationClick,
  onOpenDocuments,
}: EnhancedChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.length > 0 ? initialMessages : [WELCOME]
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latestMessagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    const next = initialMessages.length > 0 ? initialMessages : [WELCOME];
    setMessages(next);
    latestMessagesRef.current = next;
  }, [initialMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        setTimeout(() => {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }, 50);
      }
    }
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const persistMessages = (next: ChatMessage[]) => {
    latestMessagesRef.current = next;
    onMessagesChange(filterPersisted(next));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const queryText = input.trim();
    setInput('');
    setError(null);
    setLoading(true);
    setStreaming(false);

    const userMsg: ChatMessage = { role: 'user', text: queryText };
    const withUser = [...messages, userMsg];

    if (!hasDocuments) {
      const withReply = [...withUser, NO_DOCS_REPLY];
      setMessages(withReply);
      persistMessages(withReply);
      setLoading(false);
      return;
    }

    const withPlaceholder = [...withUser, { role: 'assistant' as const, text: '' }];
    setMessages(withPlaceholder);
    latestMessagesRef.current = withPlaceholder;

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, documentIds: selectedDocIds }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const friendly = formatUserFacingError(
          errData.error || `HTTP error ${response.status}`
        );
        const withReply = [...withUser, { role: 'assistant' as const, text: friendly }];
        setMessages(withReply);
        persistMessages(withReply);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream reader available');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullAnswer = '';
      let currentEvent = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);

              if (currentEvent === 'trace' || currentEvent === 'trace_update') {
                onTraceReceived(parsed as RagTrace, fullAnswer);
              } else if (parsed.text !== undefined) {
                setStreaming(true);
                fullAnswer += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') last.text += parsed.text;
                  latestMessagesRef.current = updated;
                  return updated;
                });
              } else if (parsed.error !== undefined) {
                const friendly = formatUserFacingError(parsed.error);
                const withReply = [
                  ...withUser,
                  { role: 'assistant' as const, text: friendly },
                ];
                setMessages(withReply);
                persistMessages(withReply);
                return;
              }
            } catch {
              // partial SSE chunk
            }
          }
        }
      }

      persistMessages(latestMessagesRef.current);
    } catch (err: unknown) {
      const friendly = formatUserFacingError(err);
      const withReply = [...withUser, { role: 'assistant' as const, text: friendly }];
      setMessages(withReply);
      persistMessages(withReply);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background/30">
      <div className="flex items-center justify-between border-b border-border/40 bg-card/40 px-4 py-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Query Scope
        </span>
        <span className={`font-semibold ${hasDocuments ? 'text-primary' : 'text-amber-500'}`}>
          {!hasDocuments
            ? 'No documents — upload first'
            : selectedDocIds.length === 0
              ? 'All Documents'
              : `${selectedDocIds.length} Targeted`}
        </span>
      </div>

      {!hasDocuments && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Upload and select documents to enable RAG search.
          </p>
          {onOpenDocuments && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenDocuments}
              className="h-7 shrink-0 cursor-pointer gap-1.5 text-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              Open Documents
            </Button>
          )}
        </div>
      )}

      {streaming && (
        <div className="border-b border-border/30 px-4 py-2">
          <StreamingIndicator active label="Real-time token streaming" />
        </div>
      )}

      <ScrollArea ref={scrollRef} className="min-h-0 flex-1 p-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-4">
          {messages.map((msg, index) => {
            const isLoadingBubble =
              msg.role === 'assistant' && msg.text === '' && loading;

            return (
              <div
                key={index}
                className={`flex max-w-[85%] gap-3 ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    msg.role === 'user'
                      ? 'border-border/40 bg-secondary'
                      : 'border-primary/20 bg-primary/10 text-primary'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div
                  className={`rounded-2xl p-4 text-sm ${
                    msg.role === 'user'
                      ? 'rounded-tr-none border border-border/30 bg-secondary/60 text-foreground'
                      : 'glass-panel rounded-tl-none text-foreground'
                  }`}
                >
                  {isLoadingBubble ? (
                    <div className="flex items-center gap-2 font-medium text-muted-foreground">
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                      <span className="ml-1 text-xs">Retrieving & streaming…</span>
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <div className="flex flex-col gap-3">
                      <CitationHighlighter
                        text={msg.text}
                        onCitationClick={onCitationClick}
                        highlightTerms={highlightTerms}
                      />
                      {!hasDocuments && msg.text.includes('No documents') && onOpenDocuments && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={onOpenDocuments}
                          className="w-fit cursor-pointer gap-1.5 text-xs"
                        >
                          <Target className="h-3.5 w-3.5" />
                          Select Documents
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap leading-relaxed">{msg.text}</span>
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <div className="mx-auto mt-2 flex max-w-lg gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Search failed</p>
                <p className="mt-1 text-xs leading-normal text-destructive/80">{error}</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/40 bg-card/20 p-4">
        <form onSubmit={handleSubmit} className="relative mx-auto flex max-w-4xl items-end gap-2.5">
          <div className="glass-panel flex flex-1 items-end rounded-xl border-border/60 p-1 transition-all duration-300 focus-within:border-primary/50 focus-within:glow-border hover:border-primary/40">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                hasDocuments
                  ? 'Ask about your documents…'
                  : 'Upload documents first, then ask a question…'
              }
              className="max-h-[120px] min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm ring-0 placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="h-11 w-11 shrink-0 cursor-pointer rounded-xl bg-primary text-primary-foreground shadow-lg transition-all hover:opacity-90 active:scale-95"
          >
            <Send className="h-4.5 w-4.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
