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
  get: <T>(url: string, options?: any) => Promise<T>;
  post: <T>(url: string, data: any, options?: any) => Promise<T>;
  put: <T>(url: string, data: any, options?: any) => Promise<T>;
  delete: <T>(url: string, options?: any) => Promise<T>;
  postStreaming?: <T>(url: string, data: any, onChunk: (chunk: string) => void, options?: any) => Promise<T>;
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
  setSetting?: (name: string, value: any, context?: { userId?: string; pageId?: string }) => Promise<void>;
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
