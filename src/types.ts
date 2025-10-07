// Chat message types
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  // Search results
  isSearchResults?: boolean;
  searchData?: {
    query: string;
    results: SearchResult[];
    scrapedContent?: any;
    totalResults: number;
    successfulScrapes?: number;
  };
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
  
  // Web search context (for user messages)
  hasSearchContext?: boolean;
  searchContextData?: {
    originalPrompt: string;
    searchQuery: string;
    searchResults: SearchResult[];
    scrapedContent?: any;
    totalResults: number;
    successfulScrapes?: number;
  };
}

// Interface for web search
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  engine?: string;
  score?: number;
}

// Model information
export interface ModelInfo {
  name: string;
  provider: string;
  providerId: string;
  serverName: string;
  serverId: string;
  isTemporary?: boolean;
}

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

// Dropdown option for conversations
export interface ConversationDropdownOption {
  id: string;
  primaryText: string;
  secondaryText: string;
  metadata?: {
    model?: string;
    server?: string;
    created_at: string;
    updated_at?: string;
  };
}

// API Response interface
export interface ApiResponse {
  data?: any;
  status?: number;
  id?: string;
  [key: string]: any;
}

// Document processing interfaces
export interface DocumentProcessingResult {
  filename: string;
  file_type: string;
  content_type: string;
  file_size: number;
  extracted_text: string;
  text_length: number;
  processing_success: boolean;
  error?: string;
}

export interface MultipleDocumentProcessingResult {
  results: DocumentProcessingResult[];
  total_files: number;
  successful_files: number;
  failed_files: number;
}

export interface SupportedFileTypes {
  supported_types: Record<string, string>;
  max_file_size_mb: number;
  max_files_per_request: number;
}

// Service interfaces
export interface ApiService {
  get: (url: string, options?: any) => Promise<ApiResponse>;
  post: (url: string, data: any, options?: any) => Promise<ApiResponse>;
  put: (url: string, data: any, options?: any) => Promise<ApiResponse>;
  delete: (url: string, options?: any) => Promise<ApiResponse>;
  postStreaming?: (url: string, data: any, onChunk: (chunk: string) => void, options?: any) => Promise<ApiResponse>;
}

export interface EventService {
  sendMessage: (target: string, message: any, options?: any) => void;
  subscribeToMessages: (target: string, callback: (message: any) => void) => void;
  unsubscribeFromMessages: (target: string, callback: (message: any) => void) => void;
}

export type TemplateTheme = 'dark' | 'light';

export interface ThemeService {
  getCurrentTheme: () => TemplateTheme;
  addThemeChangeListener: (callback: (theme: TemplateTheme) => void) => void;
  removeThemeChangeListener: (callback: (theme: TemplateTheme) => void) => void;
}

export interface SettingsService {
  // get: (key: string) => any;
  // set: (key: string, value: any) => Promise<void>;
  getSetting?: (id: string) => Promise<any>;
  setSetting?: (id: string, value: any) => Promise<any>;
  // getSettingDefinitions?: () => Promise<any>;
  getSettingDefinitions?: (filter?: { id?: string; category?: string; tags?: string[] }) => Promise<any[]>;
}

// Page context service interface
export interface PageContextService {
  getCurrentPageContext(): {
    pageId: string;
    pageName: string;
    pageRoute: string;
    isStudioPage: boolean;
  } | null;
  onPageContextChange(callback: (context: any) => void): () => void;
}

export interface Services {
  api?: ApiService;
  event?: EventService;
  theme?: ThemeService;
  settings?: SettingsService;
  pageContext?: PageContextService;
}

// Component props
export interface BrainDriveChatProps {
  moduleId?: string;
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
export interface BrainDriveChatState {
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

// Provider settings
export interface ServerInfo {
  id: string;
  serverName: string;
  serverAddress: string;
  apiKey?: string;
}

export interface ProviderSettings {
  id: string;
  name: string;
  servers: ServerInfo[];
}
