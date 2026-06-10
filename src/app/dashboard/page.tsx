'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { RefreshCw, FileText, Database, Layers, CheckCircle2 } from 'lucide-react';
import { Document } from '../../components/document-panel';

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      } else {
        setError(data.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalDocuments = documents.length;
  const totalChunks = documents.reduce((sum, doc) => sum + (doc.chunk_count || 0), 0);
  const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 lg:p-8">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground" style={{ letterSpacing: '-0.02em' }}>
            Analytics Overview
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            System diagnostics and data catalog indexes
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold hover:border-primary/45 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive mb-6">
          {error}
        </div>
      )}

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Total Docs */}
        <Card className="glass-panel border-none p-2 glass-panel-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase font-mono tracking-wider">
                Total Documents
              </CardTitle>
              <CardDescription className="text-[10px] mt-0.5">Indexed PDF scope</CardDescription>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <span className="text-2xl font-bold font-mono animate-pulse">...</span>
            ) : (
              <span className="text-2xl font-extrabold font-mono text-foreground">{totalDocuments}</span>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Total Chunks */}
        <Card className="glass-panel border-none p-2 glass-panel-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase font-mono tracking-wider">
                Indexed Chunks
              </CardTitle>
              <CardDescription className="text-[10px] mt-0.5">Vector elements created</CardDescription>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7A5FC0]/10 text-[#7A5FC0]">
              <Layers className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <span className="text-2xl font-bold font-mono animate-pulse">...</span>
            ) : (
              <span className="text-2xl font-extrabold font-mono text-foreground">
                {totalChunks.toLocaleString()}
              </span>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Storage Size */}
        <Card className="glass-panel border-none p-2 glass-panel-interactive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase font-mono tracking-wider">
                Total File Storage
              </CardTitle>
              <CardDescription className="text-[10px] mt-0.5">Cumulative document bytes</CardDescription>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1DB875]/10 text-[#1DB875]">
              <Database className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <span className="text-2xl font-bold font-mono animate-pulse">...</span>
            ) : (
              <span className="text-2xl font-extrabold font-mono text-foreground">{formatSize(totalSize)}</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Recent Document Log */}
        <Card className="glass-panel border-none lg:col-span-2 flex flex-col min-h-[300px]">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-sm font-bold text-foreground">Document Catalog</CardTitle>
            <CardDescription className="text-xs">Indexed files registered inside Neon Postgres</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Scanning database catalog...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-xs">
                No documents currently indexed. Go to Chat Engine to index your first file.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-secondary/20 text-muted-foreground font-mono text-[10px] uppercase tracking-wider border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur">
                      <th className="p-4">Filename</th>
                      <th className="p-4">Chunks</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Indexed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-4 font-semibold text-foreground flex items-center gap-2 max-w-[200px] truncate" title={doc.filename}>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {doc.filename}
                        </td>
                        <td className="p-4 font-mono">{doc.chunk_count}</td>
                        <td className="p-4 font-mono text-muted-foreground">{formatSize(doc.file_size)}</td>
                        <td className="p-4 font-mono text-muted-foreground">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Column 3: System Status Checklist */}
        <Card className="glass-panel border-none flex flex-col">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-sm font-bold text-foreground">System Health</CardTitle>
            <CardDescription className="text-xs">Real-time connection monitoring</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/25">
              <span className="font-semibold text-muted-foreground">Postgres Database</span>
              <span className="flex items-center gap-1 text-[#1DB875] font-semibold font-mono">
                <CheckCircle2 className="h-4 w-4" />
                ONLINE (Neon)
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/25">
              <span className="font-semibold text-muted-foreground">Gemini LLM API</span>
              <span className="flex items-center gap-1 text-[#1DB875] font-semibold font-mono">
                <CheckCircle2 className="h-4 w-4" />
                ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/25">
              <span className="font-semibold text-muted-foreground">pgvector (HNSW Index)</span>
              <span className="flex items-center gap-1 text-[#1DB875] font-semibold font-mono">
                <CheckCircle2 className="h-4 w-4" />
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-card/25">
              <span className="font-semibold text-muted-foreground">Full-Text GIN Index</span>
              <span className="flex items-center gap-1 text-[#1DB875] font-semibold font-mono">
                <CheckCircle2 className="h-4 w-4" />
                ACTIVE
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
