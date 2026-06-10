'use client';

import React, { useState, useEffect } from 'react';
import DocumentPanel, { Document } from '../../../components/document-panel';
import ChatWindow from '../../../components/chat-window';
import DocumentViewer from '../../../components/document-viewer';
import { Button } from '../../../components/ui/button';
import { Upload, Sparkles, FileText, CheckCircle2, ArrowRight, RefreshCw, PanelRightOpen } from 'lucide-react';

export default function DocumentsPage() {
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [trace, setTrace] = useState<any>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isViewerCollapsed, setIsViewerCollapsed] = useState(false);

  // Fetch documents list for initial selection screen
  const fetchDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setAllDocs(data.documents);
        
        // If there are files and we don't have an active document, select the first one
        if (data.documents.length > 0 && !activeDocId) {
          setActiveDocId(data.documents[0].id);
          setActiveFilename(data.documents[0].filename);
        }
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [selectedDocIds]);

  // Handle citation clicks inside the Chat window
  const handleCitationClick = (index: number) => {
    if (!trace || !trace.retrievedChunks) return;
    
    const chunk = trace.retrievedChunks[index];
    if (!chunk) return;

    // 1. Identify which document this chunk came from
    const matchingDoc = allDocs.find((doc) => doc.filename === chunk.filename);
    if (matchingDoc) {
      // 2. Set that document as active
      setActiveDocId(matchingDoc.id);
      setActiveFilename(matchingDoc.filename);
      // 3. Set the active page number so the viewer highlights/scrolls to it
      setActivePageNumber(chunk.pageNumber);
    }
  };

  // Callback when a query returns RAG trace data
  const handleTraceReceived = (newTrace: any) => {
    setTrace(newTrace);
  };

  const handleActiveDocumentChange = (id: string | null, filename: string | null) => {
    setActiveDocId(id);
    setActiveFilename(filename);
    setActivePageNumber(null); // Reset page highlights when switching documents
  };

  const handleInitialUploadSuccess = (docId: string, filename: string) => {
    // Auto-select and make active the uploaded document to transition into chat workspace
    setSelectedDocIds([docId]);
    setActiveDocId(docId);
    setActiveFilename(filename);
    setActivePageNumber(null);
  };

  const triggerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const extras: string[] = [];
        if (data.tablesExtracted > 0) extras.push(`${data.tablesExtracted} table(s)`);
        if (data.imagesCaptioned > 0) extras.push(`${data.imagesCaptioned} image caption(s)`);
        if (extras.length > 0) {
          console.info(`Indexed ${data.chunksIndexed} chunks — extracted ${extras.join(', ')}`);
        }
        handleInitialUploadSuccess(data.documentId, data.filename);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const toggleDocSelection = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((sid) => sid !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedDocIds(allDocs.map((d) => d.id));
  };

  // Render Starting State: Large centered upload & select
  if (selectedDocIds.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto p-6 lg:p-8 bg-background/20">
        <div className="max-w-3xl w-full flex flex-col gap-8">
          <div className="text-center">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#2A7FBF] to-[#7A5FC0]">
              <Sparkles className="h-5 w-5 text-[#EEEEF2]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground" style={{ letterSpacing: '-0.02em' }}>
              Welcome to PdfParseRag Workspace
            </h2>
            <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto leading-normal">
              To begin, upload a file or select from your document library below to activate the RAG Chat & Document Viewer.
            </p>
          </div>

          {/* Large Upload Dropzone */}
          <div
            onClick={() => document.getElementById('init-upload-input')?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 glass-panel glass-panel-interactive ${
              uploading ? 'border-primary/40 bg-accent/20 cursor-wait' : 'border-border/60 hover:border-primary/50'
            }`}
          >
            <input
              type="file"
              id="init-upload-input"
              onChange={triggerFileUpload}
              accept=".pdf,.docx,.txt,.md,.csv,.json"
              className="hidden"
              disabled={uploading}
            />
            <Upload className={`h-12 w-12 text-muted-foreground mb-3 ${uploading ? 'animate-bounce text-primary' : ''}`} />
            <h3 className="text-sm font-bold text-foreground">
              {uploading ? 'Extracting tables, captioning images & indexing...' : 'Upload Source File'}
            </h3>
            <p className="text-xs text-muted-foreground/85 text-center mt-1.5 max-w-xs leading-normal">
              Drag & drop or click to upload. Supported formats: <span className="font-semibold text-foreground">PDF, DOCX, TXT, MD, CSV, JSON</span>.
            </p>
          </div>

          {/* Document Catalog Selection Grid */}
          {allDocs.length > 0 && (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                <span>Select from Indexed Files ({allDocs.length})</span>
                <button onClick={fetchDocs} className="hover:text-primary flex items-center gap-1 cursor-pointer">
                  <RefreshCw className={`h-3 w-3 ${loadingDocs ? 'animate-spin' : ''}`} />
                  Sync Library
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[240px] overflow-y-auto pr-1">
                {allDocs.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocSelection(doc.id)}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-primary/45 bg-primary/5 shadow-md shadow-primary/5'
                          : 'border-border/30 bg-card/20 hover:bg-secondary/40'
                      }`}
                    >
                      <div className="h-7 w-7 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground mt-0.5 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold truncate text-foreground">{doc.filename}</h4>
                        <div className="flex gap-2 text-[10px] text-muted-foreground/80 mt-1 font-mono">
                          <span>{doc.chunk_count} Chunks</span>
                          <span>•</span>
                          <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-1" />}
                    </div>
                  );
                })}
              </div>

              {/* Action Button to Open Chat */}
              {selectedDocIds.length > 0 && (
                <Button
                  onClick={() => selectAll()} // Locks workspace state
                  className="w-full mt-2 py-5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10 cursor-pointer"
                >
                  Enter Chat Workspace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Active Workspace State: Split screen 3-panels
  return (
    <div className="flex-1 min-h-0 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-y-auto lg:overflow-hidden bg-background/10 relative">
      {/* Col 1: Document Panel */}
      <div className="lg:col-span-3 min-h-[300px] lg:h-full flex flex-col border border-border/30 rounded-xl overflow-hidden glass-panel">
        <DocumentPanel
          selectedIds={selectedDocIds}
          onSelectionChange={setSelectedDocIds}
          activeId={activeDocId}
          onActiveChange={handleActiveDocumentChange}
        />
      </div>

      {/* Col 2: Chat Workspace */}
      <div className={`${isViewerCollapsed ? 'lg:col-span-9' : 'lg:col-span-5'} min-h-[400px] lg:h-full flex flex-col border border-border/30 rounded-xl overflow-hidden glass-panel transition-all duration-300`}>
        <ChatWindow
          selectedDocIds={selectedDocIds}
          onTraceReceived={handleTraceReceived}
          onCitationClick={handleCitationClick}
        />
      </div>

      {/* Col 3: Document Viewer (PDF iframe or dynamic text layout inspector) */}
      {!isViewerCollapsed && (
        <div className="lg:col-span-4 min-h-[400px] lg:h-full flex flex-col border border-border/30 rounded-xl overflow-hidden glass-panel">
          <DocumentViewer
            activeDocId={activeDocId}
            filename={activeFilename}
            activePageNumber={activePageNumber}
            onClose={() => setIsViewerCollapsed(true)}
          />
        </div>
      )}

      {/* Floating Reopen Button */}
      {isViewerCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsViewerCollapsed(false)}
          className="absolute top-6 right-6 z-50 rounded-lg bg-card/60 backdrop-blur border border-border/40 text-muted-foreground hover:text-primary transition-all cursor-pointer shadow-md"
          title="Open document viewer"
        >
          <PanelRightOpen className="h-4.5 w-4.5" />
        </Button>
      )}
    </div>
  );
}
