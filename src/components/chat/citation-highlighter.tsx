'use client';

import React from 'react';

interface CitationHighlighterProps {
  text: string;
  onCitationClick: (sourceIndex: number) => void;
  highlightTerms?: string[];
}

export default function CitationHighlighter({
  text,
  onCitationClick,
  highlightTerms = [],
}: CitationHighlighterProps) {
  if (!text) {
    return <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary" />;
  }

  const parts = text.split(/(\[Source \d+\])/g);

  return (
    <>
      {parts.map((part, idx) => {
        const match = part.match(/\[Source (\d+)\]/);
        if (match) {
          const sourceIndex = parseInt(match[1], 10) - 1;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onCitationClick(sourceIndex)}
              className="mx-1 inline-flex cursor-pointer items-center rounded border border-primary/30 bg-primary/15 px-1.5 py-0.5 align-middle font-mono text-[11px] font-semibold text-primary transition-all select-none hover:bg-primary/25 active:scale-95"
              title="View cited source in document viewer"
            >
              {part}
            </button>
          );
        }

        if (highlightTerms.length === 0) {
          return (
            <span key={idx} className="whitespace-pre-wrap leading-relaxed">
              {part}
            </span>
          );
        }

        const termPattern = new RegExp(
          `(${highlightTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
          'gi'
        );
        const subParts = part.split(termPattern);

        return (
          <span key={idx} className="whitespace-pre-wrap leading-relaxed">
            {subParts.map((sub, subIdx) =>
              termPattern.test(sub) ? (
                <mark
                  key={subIdx}
                  className="rounded bg-amber-500/25 px-0.5 text-foreground"
                >
                  {sub}
                </mark>
              ) : (
                <span key={subIdx}>{sub}</span>
              )
            )}
          </span>
        );
      })}
    </>
  );
}
