# PdfParseRag

**PdfParseRag** is a production-style Retrieval-Augmented Generation (RAG) platform built with **Next.js**, **Neon PostgreSQL (pgvector)**, and **hybrid search**. Upload PDFs and other documents, parse them with layout-aware extraction, index chunks with vector + full-text search, and chat with **traceable citations** and a full **analytics developer dashboard**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lavudyaraja/Rag-citation-source)

---

## Features

### Document processing
- Multi-format ingestion: **PDF, DOCX, TXT, Markdown, CSV, JSON**
- Layout-aware PDF parsing (pages, headers, footers)
- Structured table extraction → Markdown
- Multimodal image captioning (Gemini Vision)
- Semantic + parent-child chunking
- Incremental re-indexing on file updates
- Auto cataloging (summary + tags)

### Retrieval
- **Gemini** embeddings (768d) + **Postgres GIN** full-text search
- **Reciprocal Rank Fusion (RRF)** in application layer
- Metadata filtering, synonym matching, stopword control
- Multi-document target search scope

### Chat & citations
- Real-time **SSE token streaming**
- Clickable `[Source N]` citations
- Interactive **page viewer** for cited chunks
- Multi-session chat history (Neon DB + local fallback)
- Resizable slide-over panels (History, Trace, Viewer, Documents)

### Analytics dashboard
- Visual pipeline trace
- Latency breakdown charts
- RRF rank fusion heatmap
- RAGAS-Lite quality scores
- Token & cost calculator
- RAG dry-run tester (retrieval only)

### LLM providers
- **Primary:** Google Gemini 2.5 Flash
- **Fallback:** NVIDIA Qwen (`qwen/qwen3.5-397b-a17b`) when Gemini fails or quota is exceeded

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Recharts |
| Database | Neon Serverless PostgreSQL + pgvector |
| Embeddings | Gemini Embedding 2 |
| Chat | Gemini 2.5 Flash → NVIDIA Qwen fallback |
| PDF parsing | pdf-parse, mammoth |

---

## Prerequisites

- **Node.js** 20+
- **Neon** PostgreSQL database with `pgvector` extension
- **Gemini API key** ([Google AI Studio](https://aistudio.google.com/))
- *(Optional)* **NVIDIA API key** for Qwen fallback ([NVIDIA Build](https://build.nvidia.com/))

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `GEMINI_API_KEY` | Yes* | Google Gemini API key |
| `NVIDIA_API_KEY` | No | NVIDIA API key (chat fallback) |
| `NVIDIA_CHAT_MODEL` | No | Default: `qwen/qwen3.5-397b-a17b` |
| `NVIDIA_API_URL` | No | Default: `https://integrate.api.nvidia.com/v1/chat/completions` |
| `ENABLE_QUERY_EXPANSION` | No | Set `true` to enable LLM query expansion (uses extra API calls) |

\* Embeddings require Gemini. Chat can fall back to NVIDIA if Gemini quota is exceeded.

**Never commit `.env.local` or API keys to Git.**

---

## Local development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm start
```

---

## Database setup

PdfParseRag creates tables automatically on first use (`documents`, `document_chunks`, `chat_sessions`, `query_logs`, etc.).

Ensure your Neon project has the **pgvector** extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Project structure

```
pdf-parse-rag/
├── src/
│   ├── app/
│   │   ├── api/          # REST + SSE routes (query, upload, documents, chat)
│   │   ├── auth/         # Sign in / sign up
│   │   ├── dashboard/    # Chat, documents, analytics
│   │   └── landing/      # Marketing pages
│   ├── components/       # UI + chat + analytics components
│   ├── lib/              # Parser, retrieval, Gemini, LLM provider, DB
│   └── types/
├── public/
├── .env.example
└── README.md
```

---

## Deploy on Vercel

### Option A — GitHub integration (recommended)

1. Push this repo to GitHub (see below).
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import **lavudyaraja/Rag-citation-source**.
4. Add environment variables from `.env.example`.
5. Deploy.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Set the same environment variables in the Vercel project **Settings → Environment Variables**.

### Vercel notes

- `DATABASE_URL` must be reachable from Vercel serverless functions.
- File uploads are stored under `public/uploads/` locally; for production consider **Vercel Blob** or **S3** (current setup works for demos on Vercel with ephemeral filesystem limitations).
- Increase function timeout in `vercel.json` if large PDF parsing times out (Pro plan).

---

## API overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload & index document |
| `/api/documents` | GET/DELETE | List / delete documents |
| `/api/query` | POST | RAG query (SSE stream) |
| `/api/retrieval/dry-run` | POST | Retrieval without LLM |
| `/api/chat/sessions` | GET/POST/DELETE | Chat history in Neon |
| `/api/analytics` | GET | Query latency KPIs |

---

## GitHub

```bash
git remote add origin https://github.com/lavudyaraja/Rag-citation-source.git
git branch -M main
git push -u origin main
```

---

## License

MIT — see repository for details.

---

## Author

Built by [lavudyaraja](https://github.com/lavudyaraja)
