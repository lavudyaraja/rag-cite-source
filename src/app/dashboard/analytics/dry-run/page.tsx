'use client';

import React, { useEffect, useState } from 'react';
import DryRunTester from '@/components/analytics/dry-run-tester';
import { saveLastTrace } from '@/lib/trace-store';
import type { Document } from '@/components/document-panel';
import type { RagTrace } from '@/types/rag';

export default function DryRunPage() {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDocuments(data.documents);
      })
      .catch(console.error);
  }, []);

  const handleTrace = (trace: RagTrace) => {
    saveLastTrace(trace);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">RAG Dry-Run Tester</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Test retrieval queries and view retrieved chunks without generating an LLM response
        </p>
      </div>
      <DryRunTester documents={documents} onTraceReceived={handleTrace} />
    </div>
  );
}
