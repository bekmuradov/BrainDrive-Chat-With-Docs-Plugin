import type { TemplateTheme, Services } from "../types";
import type { DocumentProcessingResult } from "../services";
import type { IPluginService } from "./IPluginService";

export interface ServiceRuntimeStatus {
  name: string;
  status: 'checking' | 'ready' | 'not-ready' | 'error';
  lastChecked?: Date;
  error?: string;
}

export enum ViewType {
  COLLECTIONS = 'collections',
  DOCUMENTS = 'documents',
  CHAT = 'chat',
  SETTINGS = 'settings'
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  chat_session_count?: number;
}

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

export interface DocumentChunk {
    id: string;
    document_id: string;
    collection_id: string;
    content: string;
    chunk_index: number;
    chunk_type: string;
    parent_chunk_id?: string;
    metadata: object;
    embedding_vector?: number[];
}

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

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  // User control features
  isEditable?: boolean;
  isEdited?: boolean;
  originalContent?: string;
  canContinue?: boolean;
  canRegenerate?: boolean;
  isCutOff?: boolean;
  
  // Document context
  isDocumentContext?: boolean;
  documentData?: {
    results: DocumentProcessingResult[];
    context: string;
  };
  // Markdown toggle
  showRawMarkdown?: boolean;
}

// Plugin types
export interface ChatCollectionsConfig {
  apiBaseUrl?: string;
  refreshInterval?: number;
  showAdvancedOptions?: boolean;
  maxDocuments?: number;
  chatSettings?: {
    maxMessages?: number;
    autoSave?: boolean;
  };
}

export interface ChatCollectionsPluginState {
  currentView: ViewType;
  selectedCollection: Collection | null;
  selectedChatSession: ChatSession | null;
  collections: Collection[];
  documents: Document[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
  loading: boolean;
  error: string | null;
  currentTheme: TemplateTheme;
  isInitializing: boolean;
  serviceStatuses: ServiceRuntimeStatus[];
  showServiceDetails: boolean;
}

export interface ChatCollectionsPluginProps {
  title?: string;
  description?: string;
  pluginId?: string;
  moduleId?: string;
  instanceId?: string;
  config?: ChatCollectionsConfig;
  services: Services;
  initialGreeting?: string;
  defaultStreamingMode?: boolean;
  promptQuestion?: string;
  conversationType?: string;
  // Persona-related props
  showPersonaSelection?: boolean;
}

// Plugin Service
// Type for the setState function passed from the React component
export type PluginStateUpdater = (newState: Partial<ChatCollectionsPluginState>) => void;

export interface PluginHeaderProps {
    pluginService: IPluginService;
    currentView: ViewType;
    serviceStatuses: ServiceRuntimeStatus[];
    showServiceDetails: boolean;
    areServicesReady: boolean;
    collectionName?: string;
}
