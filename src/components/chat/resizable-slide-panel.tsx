'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { XIcon, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResizableSlidePanelProps {
  open: boolean;
  side: 'left' | 'right';
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  storageKey: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
}

function loadWidth(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  const n = parseInt(stored, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function ResizableSlidePanel({
  open,
  side,
  title,
  onClose,
  children,
  storageKey,
  defaultWidth,
  minWidth = 240,
  maxWidth = 720,
  resizable = true,
}: ResizableSlidePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

  useEffect(() => {
    setWidth(loadWidth(storageKey, defaultWidth));
  }, [storageKey, defaultWidth]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!resizable) return;
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        const next =
          side === 'right'
            ? startWidth.current - delta
            : startWidth.current + delta;
        const clamped = Math.min(maxWidth, Math.max(minWidth, next));
        setWidth(clamped);
      };

      const onUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        setWidth((w) => {
          localStorage.setItem(storageKey, String(w));
          return w;
        });
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [width, side, minWidth, maxWidth, resizable, storageKey]
  );

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 supports-backdrop-filter:backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 z-50 flex flex-col border-border/40 bg-popover shadow-2xl',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l'
        )}
        style={{ width }}
        role="dialog"
        aria-label={title}
      >
        {resizable && (
          <div
            onMouseDown={onResizeStart}
            className={cn(
              'absolute top-0 z-10 flex h-full w-1.5 cursor-col-resize items-center justify-center hover:bg-primary/20',
              side === 'left' ? 'right-0' : 'left-0'
            )}
            title="Drag to resize"
          >
            <GripVertical className="pointer-events-none h-4 w-4 text-muted-foreground/40" />
          </div>
        )}

        <div className="flex shrink-0 items-center justify-between border-b border-border/30 px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </aside>
    </>
  );
}
