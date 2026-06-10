'use client';

import React from 'react';
import { Radio } from 'lucide-react';

interface StreamingIndicatorProps {
  active: boolean;
  label?: string;
}

export default function StreamingIndicator({
  active,
  label = 'Streaming tokens…',
}: StreamingIndicatorProps) {
  if (!active) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
      <Radio className="h-3.5 w-3.5 animate-pulse" />
      <span>{label}</span>
      <span className="inline-flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
      </span>
    </div>
  );
}
