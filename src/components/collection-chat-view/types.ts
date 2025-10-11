import type { ApiService } from "../../types";
import type { Collection } from "../collection-view/types";

// CHAT SESSION
export enum ChatSessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export interface ChatSession {
  id: string;
  collection_id: string;
  name: string;
  description?: string;
  status: ChatSessionStatus;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  message_count?: number;
}

// DOCUMENT VIEW
export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

export interface Document {
  id: string;
  original_filename: string;
  file_size: number;
  document_type: string;
  collection_id: string;
  status: DocumentStatus;
  created_at: string;
  processed_at: string;
  error_message?: string;
  metadata?: object;
  chunk_count: number;
}

export interface DocumentsViewProps {
  apiService?: ApiService;
  collection: Collection;
  selectedSession?: ChatSession | null;
  documents: Document[];
  chatSessions: ChatSession[];
  onDocumentUpload: () => void;
  onDocumentDelete: () => void;
  onChatSessionCreate: () => void;
  onChatSessionSelect: (session: ChatSession) => void;
  onChatSessionDelete: () => void;
  setError: (error: string | null) => void;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_message: string;
  assistant_response: string;
  created_at: string;
  retrieved_chunks: string[];
  isStreaming?: boolean;
  metadata?: {
    sources?: string[];
    confidence?: number;
    processing_time?: number;
  };
}
