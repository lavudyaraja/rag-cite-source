'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { RefreshCw, FileText, Eye, Info, Maximize2, PanelRightClose, Table, Image } from 'lucide-react';
import {
  extractTableFromChunkContent,
  parseMarkdownTable,
  segmentTextWithTables,
  tableToMarkdown,
  type TableData,
} from '@/lib/table-extraction';

interface DocumentViewerProps {
  activeDocId: string | null;
  filename: string | null;
  activePageNumber: number | null;
  onClose?: () => void;
}

interface ChunkData {
  chunk_index: number;
  page_number: number;
  content: string;
  metadata?: {
    header?: string | null;
    footer?: string | null;
    isLayoutAware?: boolean;
    contentType?: 'text' | 'table' | 'image_caption';
    tableMarkdown?: string;
    tableJson?: string;
    imageIndex?: number;
  };
}

interface PageContentBlock {
  content: string;
  contentType?: 'text' | 'table' | 'image_caption';
  tableMarkdown?: string;
  tableJson?: string;
  tableRows?: TableData;
}

function normalizeMetadata(raw: unknown): ChunkData['metadata'] | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ChunkData['metadata'];
    } catch {
      return undefined;
    }
  }
  return raw as ChunkData['metadata'];
}

function resolveBlocksFromChunk(chunk: ChunkData): PageContentBlock[] {
  const meta = normalizeMetadata(chunk.metadata);
  let contentType = meta?.contentType;
  let tableMarkdown = meta?.tableMarkdown;
  let tableJson = meta?.tableJson;

  if (contentType === 'image_caption') {
    return [{ content: chunk.content, contentType, tableMarkdown, tableJson }];
  }

  if (!tableMarkdown && /\[(Structured Table|Table)\b/i.test(chunk.content)) {
    const extracted = extractTableFromChunkContent(chunk.content);
    if (extracted) {
      contentType = 'table';
      tableMarkdown = extracted.markdown;
      tableJson = extracted.json ?? tableJson;
    }
  }

  if (contentType === 'table' && tableMarkdown) {
    return [{ content: chunk.content, contentType: 'table', tableMarkdown, tableJson }];
  }

  const segments = segmentTextWithTables(chunk.content);
  if (segments.length === 1 && segments[0].kind === 'text') {
    return [{ content: segments[0].text, contentType: contentType ?? 'text' }];
  }

  return segments.map((segment) => {
    if (segment.kind === 'table') {
      return {
        content: chunk.content,
        contentType: 'table' as const,
        tableMarkdown: tableToMarkdown(segment.table),
        tableRows: segment.table,
      };
    }
    return { content: segment.text, contentType: 'text' as const };
  });
}

function tableRowsFromBlock(markdown: string, tableJson?: string): TableData | null {
  if (tableJson) {
    try {
      const data = JSON.parse(tableJson) as Record<string, string>[];
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        return [
          headers,
          ...data.map((row) => headers.map((h) => String(row[h] ?? ''))),
        ];
      }
    } catch {
      /* fall through to markdown */
    }
  }
  return parseMarkdownTable(markdown);
}

function StructuredTableView({
  markdown,
  tableJson,
  rows: rowsProp,
}: {
  markdown?: string;
  tableJson?: string;
  rows?: TableData;
}) {
  const rows = useMemo(
    () => rowsProp ?? tableRowsFromBlock(markdown ?? '', tableJson),
    [rowsProp, markdown, tableJson]
  );

  if (!rows || rows.length === 0) {
    return (
      <pre className="select-text overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/85">
        {markdown}
      </pre>
    );
  }

  const [header, ...body] = rows;

  return (
    <div className="overflow-x-auto rounded-md border border-border/40 bg-background/60">
      <UITable>
        <TableHeader>
          <TableRow>
            {header.map((cell, i) => (
              <TableHead key={i} className="whitespace-nowrap text-[11px]">
                {cell}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {body.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              {header.map((_, colIdx) => (
                <TableCell key={colIdx} className="text-[11px]">
                  {row[colIdx] ?? ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </UITable>
    </div>
  );
}

function TableBlock({
  label = 'Structured Table',
  markdown,
  tableJson,
  rows,
}: {
  label?: string;
  markdown?: string;
  tableJson?: string;
  rows?: TableData;
}) {
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
        <Table className="h-3 w-3" />
        {label}
      </div>
      <StructuredTableView markdown={markdown} tableJson={tableJson} rows={rows} />
    </div>
  );
}

function TextBlockWithTables({ content }: { content: string }) {
  const segments = useMemo(() => segmentTextWithTables(content), [content]);

  if (segments.length === 1 && segments[0].kind === 'text') {
    return (
      <p className="select-text whitespace-pre-wrap text-[13px] leading-[1.75] text-foreground/90">
        {segments[0].text}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {segments.map((segment, idx) =>
        segment.kind === 'table' ? (
          <TableBlock
            key={idx}
            label="Detected Table"
            markdown={tableToMarkdown(segment.table)}
            rows={segment.table}
          />
        ) : (
          <p
            key={idx}
            className="select-text whitespace-pre-wrap text-[13px] leading-[1.75] text-foreground/90"
          >
            {segment.text}
          </p>
        )
      )}
    </div>
  );
}

interface PageBlock {
  pageNo: number;
  contents: PageContentBlock[];
  metadata?: ChunkData['metadata'];
}

function groupChunksByPage(chunks: ChunkData[]): PageBlock[] {
  const pagesMap = new Map<number, PageBlock>();
  for (const chunk of chunks) {
    const pageNo = chunk.page_number;
    const meta = normalizeMetadata(chunk.metadata);
    if (!pagesMap.has(pageNo)) {
      pagesMap.set(pageNo, { pageNo, contents: [], metadata: meta });
    }
    const page = pagesMap.get(pageNo)!;
    page.contents.push(...resolveBlocksFromChunk({ ...chunk, metadata: meta }));
    if (meta?.header && !page.metadata?.header) {
      page.metadata = { ...page.metadata, ...meta };
    }
    if (meta?.footer) {
      page.metadata = { ...page.metadata, footer: meta.footer };
    }
  }
  return Array.from(pagesMap.values()).sort((a, b) => a.pageNo - b.pageNo);
}

export default function DocumentViewer({
  activeDocId,
  filename,
  activePageNumber,
  onClose,
}: DocumentViewerProps) {
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);

  const isPdf = filename?.toLowerCase().endsWith('.pdf');
  const pages = useMemo(() => groupChunksByPage(chunks), [chunks]);

  useEffect(() => {
    if (!activeDocId) {
      setChunks([]);
      return;
    }

    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/documents/content?id=${activeDocId}`);
        const data = await res.json();
        if (data.success) {
          setChunks(data.chunks);
        } else {
          setError(data.error || 'Failed to load document text');
        }
      } catch (err) {
        console.error(err);
        setError('Connection to server failed');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [activeDocId]);

  /* Scroll to cited page inside the viewer panel */
  useEffect(() => {
    if (activePageNumber === null || pages.length === 0) return;

    const timer = setTimeout(() => {
      const viewport = scrollRootRef.current;
      const target = document.getElementById(`viewer-page-${activePageNumber}`);
      if (!viewport || !target) return;

      const viewportRect = viewport.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - viewportRect.top + viewport.scrollTop - 16;
      viewport.scrollTo({ top: offset, behavior: 'smooth' });
    }, 150);

    return () => clearTimeout(timer);
  }, [activePageNumber, pages]);

  const openExternalPdf = () => {
    if (!activeDocId || !isPdf) return;
    const hash = activePageNumber ? `#page=${activePageNumber}` : '';
    window.open(`/api/documents/file?id=${activeDocId}${hash}`, '_blank');
  };

  if (!activeDocId) {
    return (
      <Card className="glass-panel flex h-full flex-col items-center justify-center rounded-none border-none p-6 text-center md:rounded-r-xl">
        <Eye className="mb-3 h-12 w-12 animate-pulse text-muted-foreground/30" />
        <h3 className="text-sm font-semibold text-muted-foreground">Document Viewer</h3>
        <p className="mt-1.5 max-w-[280px] text-xs leading-normal text-muted-foreground/60">
          Select or upload a source file to view all pages and trace citations.
        </p>
      </Card>
    );
  }

  return (
    <Card className="glass-panel flex h-full min-h-0 flex-col gap-0 rounded-none border-none py-0 md:rounded-r-xl">
      <CardHeader className="shrink-0 border-b border-border/40 pb-3">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-sm font-bold text-foreground" title={filename || ''}>
                {filename}
              </CardTitle>
              <CardDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono">
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  {pages.length > 0 ? `${pages.length} page${pages.length === 1 ? '' : 's'}` : 'Layout view'}
                </span>
                {activePageNumber !== null && (
                  <span className="text-primary">Citation · Page {activePageNumber}</span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isPdf && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openExternalPdf}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                title="Open original PDF in new tab"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                title="Collapse viewer"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative min-h-0 flex-1 overflow-hidden bg-card/10 p-0">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span>Loading document pages...</span>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-4">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
              {error}
            </div>
          </div>
        ) : pages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
            No page content found. Re-upload the document to rebuild the page index.
          </div>
        ) : (
          <div
            ref={scrollRootRef}
            className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain"
          >
              <div className="flex flex-col gap-4 p-4 pb-6">
                {pages.map(({ pageNo, contents, metadata }) => {
                  const isHighlighted = activePageNumber === pageNo;
                  const header = metadata?.header;
                  const footer = metadata?.footer;

                  return (
                    <article
                      key={pageNo}
                      id={`viewer-page-${pageNo}`}
                      className={`relative rounded-xl border transition-all duration-300 ${
                        isHighlighted
                          ? 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-border/40 bg-card hover:border-border/60'
                      }`}
                    >
                      {/* Page chrome */}
                      <div className="flex items-center justify-between border-b border-border/30 px-4 py-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Page {pageNo}
                        </span>
                        {isHighlighted && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[9px] font-semibold text-primary">
                            cited
                          </span>
                        )}
                      </div>

                      <div className="px-5 py-4">
                        {header && (
                          <div
                            className="mb-3 truncate border-b border-border/30 pb-2 font-mono text-[10px] uppercase tracking-wider text-primary/80"
                            title={header}
                          >
                            {header}
                          </div>
                        )}

                        <div className="space-y-4">
                          {contents.map((block, idx) => {
                            const isTable =
                              block.contentType === 'table' ||
                              Boolean(block.tableMarkdown) ||
                              Boolean(block.tableRows) ||
                              /\[Structured Table/i.test(block.content);

                            if (isTable) {
                              const tableMarkdown =
                                block.tableMarkdown ??
                                extractTableFromChunkContent(block.content)?.markdown;
                              const tableJson =
                                block.tableJson ??
                                extractTableFromChunkContent(block.content)?.json;
                              if (tableMarkdown || block.tableRows) {
                                return (
                                  <TableBlock
                                    key={idx}
                                    label={block.tableRows ? 'Detected Table' : 'Structured Table'}
                                    markdown={tableMarkdown}
                                    tableJson={tableJson}
                                    rows={block.tableRows}
                                  />
                                );
                              }
                            }

                            if (block.contentType === 'image_caption') {
                              return (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3"
                                >
                                  <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-600">
                                    <Image className="h-3 w-3" />
                                    Image Caption
                                  </div>
                                  <p className="select-text text-[13px] leading-[1.75] text-foreground/90">
                                    {block.content.replace(/^\[Image Caption[^\]]*\]\s*/i, '')}
                                  </p>
                                </div>
                              );
                            }

                            return <TextBlockWithTables key={idx} content={block.content} />;
                          })}
                        </div>

                        {footer && (
                          <div
                            className="mt-4 truncate border-t border-border/30 pt-2 text-right font-mono text-[10px] italic text-muted-foreground"
                            title={footer}
                          >
                            {footer}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
