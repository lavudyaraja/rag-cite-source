'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Upload, Trash2, FileText, CheckSquare, Square, RefreshCw, Eye } from 'lucide-react';

export interface Document {
  id: string;
  filename: string;
  file_size: number;
  chunk_count: number;
  uploaded_at: string;
  summary?: string | null;
  tags?: string[] | null;
}

interface DocumentPanelProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  activeId: string | null;
  onActiveChange: (id: string | null, filename: string | null) => void;
}

export default function DocumentPanel({
  selectedIds,
  onSelectionChange,
  activeId,
  onActiveChange,
}: DocumentPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch document list on load
  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
        // Automatically make the first document active if none is active
        if (data.documents.length > 0 && !activeId) {
          onActiveChange(data.documents[0].id, data.documents[0].filename);
        }
      } else {
        setError(data.error || 'Failed to load documents');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle file select & upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
    const filenameLower = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => filenameLower.endsWith(ext));

    if (!isAllowed) {
      alert('Supported formats: PDF, DOCX, TXT, MD, CSV, JSON');
      return;
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds the 20 MB limit.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        await fetchDocuments();
        onActiveChange(data.documentId, data.filename);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document and all its indexed chunks?')) {
      return;
    }

    try {
      const res = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        // Remove from selection if deleted
        if (selectedIds.includes(id)) {
          onSelectionChange(selectedIds.filter((sid) => sid !== id));
        }
        // If active document was deleted, reset it
        if (activeId === id) {
          const remainingDocs = documents.filter((doc) => doc.id !== id);
          if (remainingDocs.length > 0) {
            onActiveChange(remainingDocs[0].id, remainingDocs[0].filename);
          } else {
            onActiveChange(null, null);
          }
        }
        setDocuments(documents.filter((doc) => doc.id !== id));
      } else {
        setError(data.error || 'Deletion failed');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete document');
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onSelectionChange(documents.map((d) => d.id));
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  return (
    <Card className="glass-panel h-full flex flex-col border-none rounded-none md:rounded-l-xl">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold tracking-tight text-foreground">
              Document Center
            </CardTitle>
            <CardDescription className="text-xs">
              Upload and manage your source files
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx,.txt,.md,.csv,.json"
              className="hidden"
              disabled={uploading}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title="Upload new source file"
            >
              <Upload className={`h-4.5 w-4.5 ${uploading ? 'animate-bounce text-primary' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchDocuments}
              disabled={loading}
              className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 p-4 min-h-0">

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Action Toggles */}
        {documents.length > 0 && (
          <div className="flex justify-between items-center text-xs px-1">
            <span className="font-semibold text-muted-foreground">
              {selectedIds.length} of {documents.length} Selected
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={selectAll}
                className="text-primary hover:underline transition-all cursor-pointer"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="text-muted-foreground hover:underline transition-all cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Scrollable File List */}
        <ScrollArea className="min-h-0 flex-1 pr-1">
          {loading && documents.length === 0 ? (
            <div className="text-center text-sm py-8 text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span>Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-10">
              No documents indexed yet. Upload a file above to start RAG retrieval.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => {
                const isSelected = selectedIds.includes(doc.id);
                const isActive = activeId === doc.id;
                
                return (
                  <div
                    key={doc.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                      isActive
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/5'
                        : isSelected
                        ? 'border-primary/20 bg-primary/5'
                        : 'border-border/30 hover:bg-secondary/40'
                    }`}
                  >
                    {/* Checkbox for Chat Selection */}
                    <button
                      onClick={() => toggleSelect(doc.id)}
                      className="text-muted-foreground hover:text-primary transition-colors mt-0.5 cursor-pointer"
                      title="Select for chat search scope"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4.5 w-4.5 text-primary" />
                      ) : (
                        <Square className="h-4.5 w-4.5" />
                      )}
                    </button>

                    {/* Document details (Click to View) */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer" 
                      onClick={() => onActiveChange(doc.id, doc.filename)}
                      title="Click to view file contents on right panel"
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h4 className={`text-sm font-semibold truncate transition-colors ${
                          isActive ? 'text-primary font-bold' : 'hover:text-primary'
                        }`}>
                          {doc.filename}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground/80 mt-1 font-mono">
                        <span>{formatSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{doc.chunk_count} Chunks</span>
                      </div>
                      {doc.summary && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {doc.summary}
                        </p>
                      )}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {doc.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-muted-foreground hover:text-destructive hover:scale-105 transition-all p-1 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
