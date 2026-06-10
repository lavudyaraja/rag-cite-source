'use client';

import React from 'react';
import { CheckSquare, Square, FileText, Target } from 'lucide-react';
import type { Document } from '../document-panel';

interface DocumentTargetSelectorProps {
  documents: Document[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  compact?: boolean;
}

export default function DocumentTargetSelector({
  documents,
  selectedIds,
  onSelectionChange,
  compact = false,
}: DocumentTargetSelectorProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (documents.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Upload documents to enable targeted search.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Target className="h-3.5 w-3.5" />
          Multi-Document Target Search
        </span>
        <div className="flex gap-2 text-[10px]">
          <button
            type="button"
            onClick={() => onSelectionChange(documents.map((d) => d.id))}
            className="cursor-pointer text-primary hover:underline"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onSelectionChange([])}
            className="cursor-pointer text-muted-foreground hover:underline"
          >
            None
          </button>
        </div>
      </div>

      <div className={`flex flex-col gap-1.5 ${compact ? 'max-h-32' : 'max-h-48'} overflow-y-auto pr-1`}>
        {documents.map((doc) => {
          const isSelected = selectedIds.includes(doc.id);
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => toggle(doc.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all ${
                isSelected
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border/30 bg-card/20 text-muted-foreground hover:bg-secondary/40'
              }`}
            >
              {isSelected ? (
                <CheckSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <Square className="h-3.5 w-3.5 shrink-0" />
              )}
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">{doc.filename}</span>
              <span className="shrink-0 font-mono text-[10px] opacity-70">{doc.chunk_count}ch</span>
            </button>
          );
        })}
      </div>

      <p className="font-mono text-[10px] text-muted-foreground/70">
        {selectedIds.length === 0
          ? 'No filter — searches all indexed documents'
          : `${selectedIds.length} document(s) targeted for retrieval`}
      </p>
    </div>
  );
}
