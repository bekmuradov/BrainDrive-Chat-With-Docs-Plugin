import React from 'react';

// --- Stubbed Global Types (Assume they are imported from braindrive-plugin/pluginTypes.ts) ---

export type ApiService = {
  get: <T = any>(url: string, config?: any) => Promise<T>;
  post: <T = any>(url: string, data?: any, config?: any) => Promise<T>;
  put: <T = any>(url: string, data?: any, config?: any) => Promise<T>;
  delete: <T = any>(url: string, config?: any) => Promise<T>;
};

export type Services = {
  api: ApiService;
  event?: {
    sendMessage: (topic: string, message: any) => void;
  };
  settings?: {
    getSetting: (key: string) => Promise<any>;
    setSetting: (key: string, value: any) => Promise<void>;
  };
  theme?: {
    getCurrentTheme: () => string;
    addThemeChangeListener: (listener: (theme: string) => void) => void;
    removeThemeChangeListener: (listener: (theme: string) => void) => void;
  };
  pageContext?: {
    getCurrentPageContext: () => any;
    onPageContextChange: (listener: (context: any) => void) => () => void;
  };
  // Removed SearchService and DocumentService
};

// --- Feature-Specific Core Types ---

export interface ModelInfo {
  name: string;
  provider: string;
  providerId: string;
  serverName: string;
  serverId: string;
  isTemporary?: boolean; // For temporary models not yet added to settings
}

export interface PersonaInfo {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  sample_greeting?: string;
}

export interface ConversationInfo {
  id: string;
  title: string;
  user_id: string;
  updated_at: string;
  created_at: string;
  persona_id: string | null;
  page_id: string | null;
  // Other fields...
}

export interface ConversationWithPersona extends ConversationInfo {
  // Messages are part of the conversation when loaded
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  // Removed source documents/web search sources
}

export interface ScrollToBottomOptions {
  behavior?: ScrollBehavior;
  manual?: boolean;
}

// --- Component Props and Service State ---

/**
 * Props passed from the main PluginShell (Controller/Presenter) to the Chat Shell
 */
export interface CollectionChatViewProps {
  services: Services;
  conversationType?: string; // e.g., "chat", "document-chat"
  initialGreeting?: string;
  availablePersonas?: PersonaInfo[];
  // Other props for orchestration
}

/**
 * Internal State of the CollectionChatService
 */
export interface ChatServiceState {
  // Chat state
  messages: ChatMessage[];
  inputText: string;
  isLoading: boolean;
  error: string;
  currentTheme: string;
  selectedModel: ModelInfo | null;
  useStreaming: boolean;
  conversation_id: string | null;
  isLoadingHistory: boolean;
  isInitializing: boolean;
  
  // History state
  conversations: ConversationInfo[];
  selectedConversation: ConversationInfo | null;
  
  // Model selection state
  models: ModelInfo[];
  isLoadingModels: boolean;

  // Persona state
  personas: PersonaInfo[];
  selectedPersona: PersonaInfo | null;
  isLoadingPersonas: boolean;
  showPersonaSelection: boolean;
  
  // User control state
  isStreaming: boolean;
  
  // Scroll state (UI-related, but state managed by Service)
  isNearBottom: boolean;
  showScrollToBottom: boolean;
  isAutoScrollLocked: boolean;
  
  // History UI state
  isHistoryExpanded: boolean;
  openConversationMenu: string | null;
}
