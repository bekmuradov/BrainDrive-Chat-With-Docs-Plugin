// ============================================
// SHARED TYPES FOR CHAT VIEW FEATURE
// ============================================

// Re-export types that come from parent feature
export type { Collection, ChatSession, ChatMessage } from '../braindrive-plugin/pluginTypes';
import type { ChatMessage, Collection } from '../braindrive-plugin/pluginTypes';
import type { Services } from '../types';

// Component props
export interface CollectionChatProps {
  moduleId?: string;
  selectedCollection: Collection;
  services: Services;
  initialGreeting?: string;
  defaultStreamingMode?: boolean;
  promptQuestion?: string;
  conversationType?: string; // Allow plugins to specify their type
  // Persona-related props
  availablePersonas?: PersonaInfo[];  // Developer-defined personas
  showPersonaSelection?: boolean;     // Control visibility
  defaultPersona?: PersonaInfo;       // Default persona to use
}

// Component state
export interface CollectionChatState {
  messages: ChatMessage[];
  inputText: string;
  isLoading: boolean;
  error: string;
  currentTheme: string;
  selectedModel: ModelInfo | null;
  pendingModelKey: string | null;
  pendingModelSnapshot: ModelInfo | null;
  useStreaming: boolean;
  conversation_id: string | null;
  isLoadingHistory: boolean;
  currentUserId: string | null;
  isInitializing: boolean;
  conversations: ConversationInfo[];
  selectedConversation: ConversationInfo | null;
  isUpdating: boolean;
  models: ModelInfo[];
  isLoadingModels: boolean;
  showModelSelection: boolean;
  showConversationHistory: boolean;
  // Persona-related state
  personas: PersonaInfo[];
  selectedPersona: PersonaInfo | null;
  pendingPersonaId: string | null;
  isLoadingPersonas: boolean;
  showPersonaSelection: boolean;
  // Web search state
  useWebSearch: boolean;
  isSearching: boolean;
  // User control state
  isStreaming: boolean;
  editingMessageId: string | null;
  editingContent: string;
  
  // Document processing state
  documentContext: string;
  isProcessingDocuments: boolean;
  
  // Scroll state
  isNearBottom: boolean;
  showScrollToBottom: boolean;
  isAutoScrollLocked: boolean;
  
  // History UI state
  showAllHistory: boolean;
  openConversationMenu: string | null;
  isHistoryExpanded: boolean;
}

// ============================================
// MODEL TYPES
// ============================================

export interface ModelInfo {
  name: string;
  provider: string;
  providerId: string;
  serverName: string;
  serverId: string;
  isTemporary?: boolean;
}

// ============================================
// PERSONA TYPES
// ============================================

// Persona information
export interface PersonaInfo {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
  model_settings?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    // Additional model settings can be added here
  };
  avatar?: string;
  tags?: string[];
  sample_greeting?: string;
}

// ============================================
// CONVERSATION TYPES
// ============================================

// Model information
export interface ModelInfo {
  name: string;
  provider: string;
  providerId: string;
  serverName: string;
  serverId: string;
  isTemporary?: boolean;
}

// Conversation information
export interface ConversationInfo {
  id: string;
  title?: string;
  user_id: string;
  model?: string;
  server?: string;
  persona_id?: string;
  conversation_type: string;
  created_at: string;
  updated_at?: string;
}

// Conversation with full persona details
export interface ConversationWithPersona extends ConversationInfo {
  persona?: PersonaInfo;
}

// ============================================
// FEATURE STATE
// ============================================

export interface ChatFeatureState {
  // Chat state
  messages: ChatMessage[];
  inputText: string;
  isLoading: boolean;
  error: string;
  conversationId: string | null;
  isLoadingHistory: boolean;
  isInitializing: boolean;
  
  // History state
  conversations: ConversationInfo[];
  selectedConversation: ConversationInfo | null;
  
  // Model state
  models: ModelInfo[];
  isLoadingModels: boolean;
  selectedModel: ModelInfo | null;
  pendingModelKey: string | null;
  pendingModelSnapshot: ModelInfo | null;
  
  // Persona state
  personas: PersonaInfo[];
  selectedPersona: PersonaInfo | null;
  pendingPersonaId: string | null;
  isLoadingPersonas: boolean;
  
  // User control state
  isStreaming: boolean;
  editingMessageId: string | null;
  editingContent: string;
  
  // Scroll state
  isNearBottom: boolean;
  showScrollToBottom: boolean;
  isAutoScrollLocked: boolean;
  
  // UI state
  showModelSelection: boolean;
  showConversationHistory: boolean;
  showPersonaSelection: boolean;
  openConversationMenu: string | null;
}

// ============================================
// SERVICE DEPENDENCIES
// ============================================

export interface ChatServiceDependencies {
  apiService: any; // Replace with proper API service type
  dataRepository: any; // Replace with proper DataRepository type
  setError: (error: string | null) => void;
  getCurrentPageContext: () => any;
}

// ============================================
// STATE UPDATER TYPE
// ============================================

export type ChatViewStateUpdater = (newState: Partial<ChatFeatureState>) => void;

// ============================================
// HANDLER TYPES
// ============================================

export type MessageSendHandler = (message: string) => Promise<void>;
export type ConversationSelectHandler = (conversationId: string) => void;
export type ModelChangeHandler = (modelId: string) => void;
export type PersonaChangeHandler = (personaId: string | null) => void;
