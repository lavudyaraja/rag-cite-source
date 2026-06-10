export interface RetrievedChunk {
  id: string;
  content: string;
  pageNumber: number;
  filename: string;
  chunkIndex: number;
  rrfScore: number;
  vectorRank: number | null;
  textRank: number | null;
  sourceQueries: string[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface RagasScores {
  faithfulness: number;
  answerRelevance: number;
  retrievalRecall: number;
}

export interface RagTrace {
  originalQuery: string;
  expandedQueries: string[];
  embeddingTimeMs: number;
  dbRetrievalTimeMs: number;
  llmStreamTimeMs?: number;
  totalChunksFound: number;
  retrievedChunks: RetrievedChunk[];
  totalLatencyMs: number;
  tokenUsage?: TokenUsage;
  ragasScores?: RagasScores;
  promptContext?: string;
  llmProvider?: 'gemini' | 'nvidia';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  selectedDocIds: string[];
  createdAt: string;
  updatedAt: string;
}
