# Implementation Plan: InsightRAG (Visual Next.js RAG Engine)

InsightRAG is an advanced enterprise-grade Retrieval-Augmented Generation (RAG) platform. It is designed to showcase production-grade document processing, hybrid database search engineering, and advanced retrieval pipeline analytics. The frontend is built using Next.js App Router, Tailwind CSS, and shadcn/ui. The backend is powered by Python FastAPI and Neon PostgreSQL.

---

## 🌟 30 Unique & Advanced Features

### Document Processing & Parsing
1. **Multi-Format File Ingestion**: Upload and parse PDF, DOCX, TXT, Markdown, CSV, and JSON files.
2. **Layout-Aware PDF Extraction**: High-fidelity parsing that tracks page boundaries, headers, and footers.
3. **Structured Table Extraction**: Automatically identifies tabular data in documents and converts tables into clean Markdown/JSON.
4. **Multimodal Image Captioning**: Extracts diagrams, charts, and images, and runs a Vision LLM to generate descriptive text overlays.
5. **Intelligent Semantic Chunking**: Splits text dynamically at natural thematic transitions (using paragraph shifts) rather than fixed token limits.
6. **Parent-Child Chunking**: Pairs small, precise chunks (for vector search) with larger parent chunks (for rich generation context).
7. **Incremental Document Indexing**: Re-indexes only new or modified sections when a file is updated, saving API and processing costs.
8. **Document Cataloging & Tagging**: Automatically generates tags and summaries for files to enable structured filtering.

### DB & Retrieval Architecture
9. **Dense Vector Embeddings**: Uses Gemini API to convert text into high-dimensional vector representations.
10. **Postgres Full-Text Indexing**: Tokenizes document text into database-optimized GIN indexed search vectors.
11. **Reciprocal Rank Fusion (RRF)**: Merges dense vector scores and sparse keyword ranks inside a single database query.
12. **Metadata Filtering**: Enables users to filter retrieval results by file type, upload date, page number, and custom tags.
13. **Synonym Matching**: Integrates custom vocabulary and domain-specific abbreviations in the search engine.
14. **Custom Stopword Control**: Excludes noise words based on document context to improve keyword search relevance.

### Query Engineering & Optimization
15. **LLM Query Expansion (Multi-Query)**: Generates 3 alternative phrasing options for the user prompt to overcome vocabulary mismatch.
16. **Query Decomposition (Sub-Questions)**: Breaks complex query inputs into separate sub-queries, searches each individually, and aggregates findings.
17. **Hypothetical Document Embeddings (HyDE)**: Generates a target mock answer, then searches for chunks matching the hypothetical text.
18. **Cross-Encoder Re-ranking**: Evaluates retrieved chunks using an LLM-based re-ranker to sort items by semantic relevance before prompt packaging.
19. **Prompt Context Ingestion Visualizer**: Shows the exact prompt context injected, showing what text was selected and what was truncated.

### Chat & Citation System
20. **Real-time Token Streaming**: Streams responses to Next.js in real time for a smooth user interface experience.
21. **Traceable Citations**: Highlights specific words or sentences that were retrieved to answer the question.
22. **Interactive Page Viewer**: Opens a preview of the document page corresponding to a specific cited chunk.
23. **Multi-Session Chat History**: Save, rename, search, and delete past conversation threads.
24. **Multi-Document Target Search**: Let users select exactly which uploaded documents should be queried.

### Analytics & Developer Dashboard
25. **Visual Pipeline Trace**: Step-by-step flowchart tracking query rewriting, retrieval rank changes, and prompt construction.
26. **Latency Performance Breakdown**: Chart displaying API latency (embedding time, db query time, LLM stream time) using graphs.
27. **RRF Rank Fusion Heatmap**: Heatmap showing vector-only rank vs FTS-only rank vs final fused rank for retrieved items.
28. **RAG Quality Evaluation (RAGAS-Lite)**: Real-time scoring of response Faithfulness, Answer Relevance, and Retrieval Recall.
29. **Token & Cost Calculator**: Tracks tokens consumed per request and calculates estimated API costs.
30. **RAG Dry-Run Tester**: Test retrieval queries and view retrieved chunks without generating an LLM response.

---

## Technical Stack & Architecture

- **Frontend**: Next.js 14+ (App Router, React, Tailwind CSS, shadcn/ui components, Lucide icons, Recharts)
- **Backend (API Engine)**: Python FastAPI
- **Database**: Serverless PostgreSQL (Neon) with pgvector
- **LLM/Embeddings**: Google Gemini API

---

## Project Structure (`d:\LLM`)

- `backend/`: FastAPI Python engine containing APIs, parsers, and DB management.
- `frontend/`: Next.js frontend with Tailwind CSS and shadcn/ui for clean components.

---

## Verification Plan

### Automated Tests
- Unit testing for semantic chunking logic.
- Performance tests for PostgreSQL RRF execution times.

### Manual Verification
- Test PDF uploading, hybrid search queries, page highlights, and the visual trace panel.
