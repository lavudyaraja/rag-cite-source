'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Send, Bot, User, AlertCircle, FileText } from 'lucide-react';

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatWindowProps {
  selectedDocIds: string[];
  onTraceReceived: (trace: any) => void;
  onCitationClick: (sourceIndex: number) => void;
}

export default function ChatWindow({
  selectedDocIds,
  onTraceReceived,
  onCitationClick,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hello! I am PdfParseRag, your advanced analyst assistant. Upload some PDF documents on the left panel, select them, and ask me any questions. I'll search using hybrid SQL fusion and stream my reasoning to you!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom (scrolling only the message viewport without moving/scrolling the outer browser window)
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Wait for rendering to complete so scrollHeight is updated with new messages
        setTimeout(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }, 50);
      }
    }
  }, [messages, loading]);

  // Handle auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const queryText = input.trim();
    setInput('');
    setError(null);
    setLoading(true);

    // Add User Message
    const userMsg: Message = { role: 'user', text: queryText };
    setMessages((prev) => [...prev, userMsg]);

    // Setup streaming placeholder
    const assistantMsgPlaceholder: Message = { role: 'assistant', text: '' };
    setMessages((prev) => [...prev, assistantMsgPlaceholder]);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          documentIds: selectedDocIds,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Parse SSE format: "event: name" and "data: payload"
          if (line.startsWith('event: ')) {
            // Wait for data line
            continue;
          }

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();

            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);

              // 1. Check if it's the RAG search trace metadata
              if (parsed.originalQuery !== undefined) {
                onTraceReceived(parsed);
              }
              // 2. Check if it is a text stream chunk
              else if (parsed.text !== undefined) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant') {
                    last.text += parsed.text;
                  }
                  return updated;
                });
              }
              // 3. Check if it's an error event
              else if (parsed.error !== undefined) {
                setError(parsed.error);
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === 'assistant' && last.text === '') {
                    updated.pop();
                  }
                  return updated;
                });
                return;
              }
            } catch (pErr) {
              console.error('Error parsing SSE chunk:', pErr, 'Raw data:', dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while streaming response.');
      // Remove placeholder message if empty
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant' && last.text === '') {
          updated.pop();
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Render text and parse citations into buttons
  const renderMessageContent = (text: string) => {
    if (!text) return <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5" />;

    // Regex to split on [Source X] patterns
    const parts = text.split(/(\[Source \d+\])/g);

    return parts.map((part, idx) => {
      const match = part.match(/\[Source (\d+)\]/);
      if (match) {
        const sourceIndex = parseInt(match[1], 10) - 1; // Convert to 0-indexed
        return (
          <button
            key={idx}
            onClick={() => onCitationClick(sourceIndex)}
            className="mx-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/20 text-primary hover:bg-primary/30 transition-all font-mono align-middle select-none active:scale-95"
            title="Click to view details in Trace Panel"
          >
            {part}
          </button>
        );
      }
      return <span key={idx} className="whitespace-pre-wrap leading-relaxed">{part}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background/30 border-r border-border/40">
      {/* Scope Indicator */}
      <div className="px-4 py-2 border-b border-border/40 flex items-center justify-between text-xs bg-card/40">
        <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
          <FileText className="h-3.5 w-3.5" />
          Query Scope:
        </span>
        <span className="font-semibold text-primary">
          {selectedDocIds.length === 0
            ? 'Searching All Uploaded Files'
            : `Searching ${selectedDocIds.length} Selected File(s)`}
        </span>
      </div>

      {/* Messages Window */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4 min-h-0">
        <div className="flex flex-col gap-4 max-w-4xl mx-auto pb-4">
          {messages.map((msg, index) => {
            const isMessageEmptyAndLoading = msg.role === 'assistant' && msg.text === '' && loading;

            return (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Icon */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                    msg.role === 'user'
                      ? 'bg-secondary border-border/40'
                      : 'bg-primary/10 border-primary/20 text-primary'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`rounded-2xl p-4 text-sm ${
                    msg.role === 'user'
                      ? 'bg-secondary/60 text-foreground border border-border/30 rounded-tr-none'
                      : 'glass-panel text-foreground rounded-tl-none'
                  }`}
                >
                  {isMessageEmptyAndLoading ? (
                    <div className="flex items-center gap-2 font-medium text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
                      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
                      <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce delay-300" />
                      <span className="ml-1 text-xs">Searching documents...</span>
                    </div>
                  ) : (
                    renderMessageContent(msg.text)
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <div className="flex gap-3 max-w-lg mx-auto bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive mt-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Search failed</p>
                <p className="text-xs mt-1 text-destructive/80 leading-normal">{error}</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input box */}
      <div className="p-4 border-t border-border/40 bg-card/20 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-end gap-2.5">
          <div className="flex-1 glass-panel rounded-xl border-border/60 hover:border-primary/40 focus-within:border-primary/50 focus-within:glow-border transition-all duration-300 p-1 flex items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about the document data... (e.g. key growth metrics, comparisons, summaries)"
              className="flex-1 bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[44px] max-h-[120px] resize-none text-sm placeholder:text-muted-foreground/60 py-2.5 px-3"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
          >
            <Send className="h-4.5 w-4.5" />
          </Button>
        </form>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
          PdfParseRag utilizes serverless pgvector & keyword Reciprocal Rank Fusion (RRF) for highly precise search retrieval.
        </p>
      </div>
    </div>
  );
}
