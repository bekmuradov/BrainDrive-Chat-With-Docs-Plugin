import React from 'react';

import './CollectionChatViewShell.css';

import {
  CollectionChatProps,
  CollectionChatState,
  ChatMessage,
  ModelInfo,
  PersonaInfo,
  ConversationWithPersona,
} from './chatViewTypes';
import { DocumentProcessingResult } from '../services';

import { generateId } from '../utils';

// Import constants
import {
  SETTINGS_KEYS,
  UI_CONFIG,
  PROVIDER_SETTINGS_ID_MAP
} from '../constants';

// Import modular components
import {
  ChatHeader,
  ChatHistory,
  ChatInput,
  LoadingStates
} from './components';

// Import services
import { AIService, DocumentService } from '../services';

// Import icons
// Icons previously used in the bottom history panel are no longer needed here

type ScrollToBottomOptions = {
  behavior?: ScrollBehavior;
  manual?: boolean;
  force?: boolean;
};

/**
 * Unified CollectionChatViewShell component that combines AI chat, model selection, and conversation history
 */
export class CollectionChatViewShell extends React.Component<CollectionChatProps, CollectionChatState> {
  private chatHistoryRef = React.createRef<HTMLDivElement>();
  private inputRef = React.createRef<HTMLTextAreaElement>();
  private themeChangeListener: ((theme: string) => void) | null = null;
  private pageContextUnsubscribe: (() => void) | null = null;
  private currentPageContext: any = null;
  private readonly STREAMING_SETTING_KEY = SETTINGS_KEYS.STREAMING;
  private initialGreetingAdded = false;
  private debouncedScrollToBottom: (options?: ScrollToBottomOptions) => void;
  private aiService: AIService | null = null;
  private documentService: DocumentService | null = null;
  private currentStreamingAbortController: AbortController | null = null;
  private menuButtonRef: HTMLButtonElement | null = null;
  // Keep the live edge comfortably in view instead of snapping flush bottom
  private readonly SCROLL_ANCHOR_OFFSET = 420;
  private readonly MIN_VISIBLE_LAST_MESSAGE_HEIGHT = 64;
  private readonly NEAR_BOTTOM_EPSILON = 24;
  private readonly STRICT_BOTTOM_THRESHOLD = 4;
  private readonly USER_SCROLL_INTENT_GRACE_MS = 300;
  private isProgrammaticScroll = false;
  private pendingAutoScrollTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastUserScrollTs = 0;
  private pendingPersonaRequestId: string | null = null;

  constructor(props: CollectionChatProps) {
    super(props);
    
    this.state = {
      // Chat state
      messages: [],
      inputText: '',
      isLoading: false,
      error: '',
      currentTheme: 'light',
      selectedModel: null,
      pendingModelKey: null,
      pendingModelSnapshot: null,
      useStreaming: true, // Always use streaming
      conversation_id: null,
      isLoadingHistory: false,
      currentUserId: null,
      isInitializing: true,
      
      // History state
      conversations: [],
      selectedConversation: null,
      isUpdating: false,
      
      // Model selection state
      models: [],
      isLoadingModels: true,
      
      // UI state
      showModelSelection: true,
      showConversationHistory: true,
      
      // Persona state
      personas: props.availablePersonas || [],
      selectedPersona: null, // Default to no persona
      pendingPersonaId: null,
      isLoadingPersonas: !props.availablePersonas,
      showPersonaSelection: true, // Always show persona selection
      
      // Web search state
      useWebSearch: false,
      isSearching: false,
      
      // User control state
      isStreaming: false,
      editingMessageId: null,
      editingContent: '',
      
      // Document processing state
      documentContext: '',
      isProcessingDocuments: false,
      
      // Scroll state
      isNearBottom: true,
      showScrollToBottom: false,
      isAutoScrollLocked: false,
      
      // History UI state
      showAllHistory: false,
      openConversationMenu: null,
      isHistoryExpanded: true, // History accordion state      
    };
    
    // Bind methods
    this.debouncedScrollToBottom = (options?: ScrollToBottomOptions) => {
      const requestedAt = Date.now();

      if (this.pendingAutoScrollTimeout) {
        clearTimeout(this.pendingAutoScrollTimeout);
      }

      this.pendingAutoScrollTimeout = setTimeout(() => {
        this.pendingAutoScrollTimeout = null;
        if (this.canAutoScroll(requestedAt)) {
          this.scrollToBottom(options);
        } else {
          this.updateScrollState();
        }
      }, UI_CONFIG.SCROLL_DEBOUNCE_DELAY);
    };
    
    // Initialize AI service
    this.aiService = new AIService(props.services.api);
    
    // Initialize Document service with authenticated API service
    this.documentService = new DocumentService(props.services.api);
  }

  componentDidMount() {
    console.log(`🎭 ComponentDidMount - Initial persona state: selectedPersona=${this.state.selectedPersona?.name || 'null'}, showPersonaSelection=${this.state.showPersonaSelection}, availablePersonas=${this.props.availablePersonas?.length || 0}`);
    
    this.initializeThemeService();
    this.initializePageContextService();
    this.loadInitialData();
    this.loadSavedStreamingMode();
    this.loadPersonas();
    
    // Add global key event listener for ESC key
    document.addEventListener('keydown', this.handleGlobalKeyPress);
    
    // Add click outside listener to close conversation menu
    document.addEventListener('mousedown', this.handleClickOutside);
    
    // Initialize scroll state
    this.updateScrollState();

    // Set initialization timeout
    setTimeout(() => {
      if (!this.state.conversation_id) {
        // Only use persona greeting if persona selection is enabled and a persona is selected
        // Ensure persona is null when personas are disabled
        const effectivePersona = this.state.showPersonaSelection ? this.state.selectedPersona : null;
        const personaGreeting = this.state.showPersonaSelection && effectivePersona?.sample_greeting;
        const greetingContent = personaGreeting || this.props.initialGreeting;
        
        console.log(`🎭 Greeting logic: showPersonaSelection=${this.state.showPersonaSelection}, effectivePersona=${effectivePersona?.name || 'none'}, using=${personaGreeting ? 'persona' : 'default'} greeting`);
        
        if (greetingContent && !this.initialGreetingAdded) {
          this.initialGreetingAdded = true;
          
          const greetingMessage: ChatMessage = {
            id: generateId('greeting'),
            sender: 'ai',
            content: greetingContent,
            timestamp: new Date().toISOString()
          };
          
          this.setState(prevState => ({
            messages: [...prevState.messages, greetingMessage],
            isInitializing: false
          }));
        } else {
          this.setState({ isInitializing: false });
        }
      }
    }, UI_CONFIG.INITIAL_GREETING_DELAY);
  }

  componentDidUpdate(prevProps: CollectionChatProps, prevState: CollectionChatState) {
    if (
      prevState.models !== this.state.models ||
      prevState.pendingModelKey !== this.state.pendingModelKey ||
      prevState.pendingModelSnapshot !== this.state.pendingModelSnapshot ||
      prevState.selectedModel !== this.state.selectedModel
    ) {
      this.resolvePendingModelSelection();
    }

    if (
      prevState.personas !== this.state.personas ||
      prevState.pendingPersonaId !== this.state.pendingPersonaId ||
      prevState.selectedPersona !== this.state.selectedPersona ||
      prevState.showPersonaSelection !== this.state.showPersonaSelection
    ) {
      this.resolvePendingPersonaSelection();
    }

    const messagesChanged = prevState.messages !== this.state.messages;
    if (!messagesChanged) {
      return;
    }

    const messageCountIncreased = this.state.messages.length > prevState.messages.length;

    if (!this.state.isAutoScrollLocked && messageCountIncreased) {
      this.debouncedScrollToBottom();
    } else {
      this.updateScrollState();
    }
  }

  componentWillUnmount() {
    // Clean up theme listener
    if (this.themeChangeListener && this.props.services?.theme) {
      this.props.services.theme.removeThemeChangeListener(this.themeChangeListener);
    }
    
    // Clean up page context subscription
    if (this.pageContextUnsubscribe) {
      this.pageContextUnsubscribe();
    }
    
    // Clean up global key event listener
    document.removeEventListener('keydown', this.handleGlobalKeyPress);
    
    // Clean up click outside listener
    document.removeEventListener('mousedown', this.handleClickOutside);
    
    // Clean up any ongoing streaming
    if (this.currentStreamingAbortController) {
      this.currentStreamingAbortController.abort();
    }

    this.cancelPendingAutoScroll();
  }

  /**
   * Load initial data (models and conversations)
   */
  loadInitialData = async () => {
    await Promise.all([
      this.loadProviderSettings(),
      this.fetchConversations()
    ]);
  }

  /**
   * Get page-specific setting key with fallback to global
   */
  private getSettingKey(baseSetting: string): string {
    const pageContext = this.getCurrentPageContext();
    if (pageContext?.pageId) {
      return `page_${pageContext.pageId}_${baseSetting}`;
    }
    return baseSetting; // Fallback to global
  }

  /**
   * Get saved streaming mode from settings (page-specific with global fallback)
   */
  getSavedStreamingMode = async (): Promise<boolean | null> => {
    try {
      if (this.props.services?.settings?.getSetting) {
        // Try page-specific setting first
        const pageSpecificKey = this.getSettingKey(this.STREAMING_SETTING_KEY);
        let savedValue = await this.props.services.settings.getSetting(pageSpecificKey);
        
        // Fallback to global setting if page-specific doesn't exist
        if (savedValue === null || savedValue === undefined) {
          savedValue = await this.props.services.settings.getSetting(this.STREAMING_SETTING_KEY);
        }
        
        if (typeof savedValue === 'boolean') {
          return savedValue;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Load saved streaming mode from settings
   */
  loadSavedStreamingMode = async (): Promise<void> => {
    try {
      const savedStreamingMode = await this.getSavedStreamingMode();
      if (savedStreamingMode !== null) {
        this.setState({ useStreaming: savedStreamingMode });
      }
    } catch (error) {
      // Error loading streaming mode, use default
    }
  }

  /**
   * Save streaming mode to settings (page-specific)
   */
  saveStreamingMode = async (enabled: boolean): Promise<void> => {
    try {
      if (this.props.services?.settings?.setSetting) {
        // Save to page-specific setting key
        const pageSpecificKey = this.getSettingKey(this.STREAMING_SETTING_KEY);
        await this.props.services.settings.setSetting(pageSpecificKey, enabled);
      }
    } catch (error) {
      // Error saving streaming mode
    }
  }

  /**
   * Initialize the theme service to listen for theme changes
   */
  initializeThemeService = () => {
    if (this.props.services?.theme) {
      try {
        // Get the current theme
        const currentTheme = this.props.services.theme.getCurrentTheme();
        this.setState({ currentTheme });
        
        // Set up theme change listener
        this.themeChangeListener = (newTheme: string) => {
          this.setState({ currentTheme: newTheme });
        };
        
        // Add the listener to the theme service
        this.props.services.theme.addThemeChangeListener(this.themeChangeListener);
      } catch (error) {
        // Error initializing theme service
      }
    }
  }

  /**
   * Initialize the page context service to listen for page changes
   */
  initializePageContextService = () => {
    if (this.props.services?.pageContext) {
      try {
        // Get initial page context
        this.currentPageContext = this.props.services.pageContext.getCurrentPageContext();
        
        // Subscribe to page context changes
        this.pageContextUnsubscribe = this.props.services.pageContext.onPageContextChange(
          (context) => {
            this.currentPageContext = context;
            // Reload conversations when page changes to show page-specific conversations
            this.fetchConversations();
          }
        );
      } catch (error) {
        // Error initializing page context service
        console.warn('Failed to initialize page context service:', error);
      }
    }
  }

  /**
   * Helper method to get current page context
   */
  private getCurrentPageContext() {
    if (this.props.services?.pageContext) {
      return this.props.services.pageContext.getCurrentPageContext();
    }
    return this.currentPageContext;
  }

  /**
   * Load personas from API or use provided personas
   */
  loadPersonas = async () => {
    console.log(`🎭 Loading personas - availablePersonas: ${this.props.availablePersonas?.length || 0}, showPersonaSelection: ${this.state.showPersonaSelection}`);
    
          if (this.props.availablePersonas) {
        // Use provided personas
        console.log(`🎭 Using provided personas: ${this.props.availablePersonas.map((p: any) => p.name).join(', ')}`);
        this.resolvePendingPersonaSelection();
        return;
      }

    this.setState({ isLoadingPersonas: true });
    
    try {
      if (this.props.services?.api) {
        const response: any = await this.props.services.api.get('/api/v1/personas');
        const personas = response.personas || [];
        console.log(`🎭 Loaded personas from API: ${personas.map((p: any) => p.name).join(', ')}`);
        this.setState({
          personas: personas,
          isLoadingPersonas: false
        }, () => {
          this.resolvePendingPersonaSelection();
        });
      } else {
        this.setState({ isLoadingPersonas: false }, () => {
          this.resolvePendingPersonaSelection();
        });
      }
    } catch (error) {
      console.error('Error loading personas:', error);
      this.setState({
        personas: [],
        isLoadingPersonas: false
      }, () => {
        this.resolvePendingPersonaSelection();
      });
    }
  };

  /**
   * Load provider settings and models
   */
  loadProviderSettings = async () => {
    this.setState({ isLoadingModels: true, error: '' });

    if (!this.props.services?.api) {
      this.setState({
        isLoadingModels: false,
        error: 'API service not available'
      });
      return;
    }

    try {
      const resp = await this.props.services.api.get('/api/v1/ai/providers/all-models');
      const raw = (resp && (resp as any).models)
        || (resp && (resp as any).data && (resp as any).data.models)
        || (Array.isArray(resp) ? resp : []);

      const models: ModelInfo[] = Array.isArray(raw)
        ? raw.map((m: any) => {
            const provider = m.provider || 'ollama';
            const providerId = PROVIDER_SETTINGS_ID_MAP[provider] || provider;
            const serverId = m.server_id || m.serverId || 'unknown';
            const serverName = m.server_name || m.serverName || 'Unknown Server';
            const name = m.name || m.id || '';
            return {
              name,
              provider,
              providerId,
              serverName,
              serverId,
            } as ModelInfo;
          })
        : [];

      if (models.length > 0) {
        const shouldBroadcastDefault = !this.state.pendingModelKey && !this.state.selectedModel;

        this.setState(prevState => {
          if (!prevState.pendingModelKey && !prevState.selectedModel && models.length > 0) {
            return {
              models,
              isLoadingModels: false,
              selectedModel: models[0],
            };
          }

          return {
            models,
            isLoadingModels: false,
            selectedModel: prevState.selectedModel,
          };
        }, () => {
          if (this.state.pendingModelKey) {
            this.resolvePendingModelSelection();
          } else if (shouldBroadcastDefault && this.state.selectedModel) {
            this.broadcastModelSelection(this.state.selectedModel);
          }
        });

        return;
      }

      // Fallback: Try Ollama-only via settings + /api/v1/ollama/models
      try {
        const settingsResp = await this.props.services.api.get('/api/v1/settings/instances', {
          params: {
            definition_id: 'ollama_servers_settings',
            scope: 'user',
            user_id: 'current',
          },
        });

        let settingsData: any = null;
        if (Array.isArray(settingsResp) && settingsResp.length > 0) settingsData = settingsResp[0];
        else if (settingsResp && typeof settingsResp === 'object') {
          const obj = settingsResp as any;
          if (obj.data) settingsData = Array.isArray(obj.data) ? obj.data[0] : obj.data;
          else settingsData = settingsResp;
        }

        const fallbackModels: ModelInfo[] = [];
        if (settingsData && settingsData.value) {
          const parsedValue = typeof settingsData.value === 'string'
            ? JSON.parse(settingsData.value)
            : settingsData.value;
          const servers = Array.isArray(parsedValue?.servers) ? parsedValue.servers : [];
          for (const server of servers) {
            try {
              const params: Record<string, string> = {
                server_url: encodeURIComponent(server.serverAddress),
                settings_id: 'ollama_servers_settings',
                server_id: server.id,
              };
              if (server.apiKey) params.api_key = server.apiKey;
              const modelResponse = await this.props.services.api.get('/api/v1/ollama/models', { params });
              const serverModels = Array.isArray(modelResponse) ? modelResponse : [];
              for (const m of serverModels) {
                fallbackModels.push({
                  name: m.name,
                  provider: 'ollama',
                  providerId: 'ollama_servers_settings',
                  serverName: server.serverName,
                  serverId: server.id,
                });
              }
            } catch (innerErr) {
              console.error('Fallback: error loading Ollama models for server', server?.serverName, innerErr);
            }
          }
        }

        if (fallbackModels.length > 0) {
          const shouldBroadcastDefault = !this.state.pendingModelKey && !this.state.selectedModel;

          this.setState(prevState => {
            if (!prevState.pendingModelKey && !prevState.selectedModel && fallbackModels.length > 0) {
              return {
                models: fallbackModels,
                isLoadingModels: false,
                selectedModel: fallbackModels[0],
              };
            }

            return {
              models: fallbackModels,
              isLoadingModels: false,
              selectedModel: prevState.selectedModel,
            };
          }, () => {
            if (this.state.pendingModelKey) {
              this.resolvePendingModelSelection();
            } else if (shouldBroadcastDefault && this.state.selectedModel) {
              this.broadcastModelSelection(this.state.selectedModel);
            }
          });

          return;
        }

        this.setState({
          models: fallbackModels,
          isLoadingModels: false,
        }, () => {
          if (this.state.pendingModelKey) {
            this.resolvePendingModelSelection();
          }
        });
        return;
      } catch (fallbackErr) {
        console.error('Fallback: error loading Ollama settings/models:', fallbackErr);
        this.setState({ models: [], selectedModel: null, isLoadingModels: false });
      }
    } catch (error: any) {
      console.error('Error loading models from all providers:', error);
      this.setState({
        models: [],
        selectedModel: null,
        isLoadingModels: false,
        error: `Error loading models: ${error.message || 'Unknown error'}`,
      });
    }
  };

  /**
   * Refresh conversations list without interfering with current conversation
   */
  refreshConversationsList = async () => {
    if (!this.props.services?.api) {
      return;
    }
    
    try {
      // First, get the current user's information to get their ID
      const userResponse: any = await this.props.services.api.get('/api/v1/auth/me');
      
      // Extract the user ID from the response
      let userId = userResponse.id;
      
      if (!userId) {
        return;
      }
      
      // Get current page context for page-specific conversations
      const pageContext = this.getCurrentPageContext();
      const params: any = {
        skip: 0,
        limit: 50,
        conversation_type: this.props.conversationType || "chat"
      };
      
      // Add page_id if available for page-specific conversations
      if (pageContext?.pageId) {
        params.page_id = pageContext.pageId;
      }
      
      const response: any = await this.props.services.api.get(
        `/api/v1/users/${userId}/conversations`,
        { params }
      );
      
      let conversations = [];
      
      if (Array.isArray(response)) {
        conversations = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        conversations = response.data;
      } else if (response) {
        try {
          if (typeof response === 'object') {
            if (response.id && response.user_id) {
              conversations = [response];
            }
          }
        } catch (parseError) {
          // Error parsing response
        }
      }
      
      if (conversations.length === 0) {
        this.setState({
          conversations: [],
          isLoadingHistory: false
        });
        return;
      }
      
      // Validate conversation objects
      const validConversations = conversations.filter((conv: any) => {
        return conv && typeof conv === 'object' && conv.id && conv.user_id;
      });
      
      const sortedConversations = this.sortConversationsByRecency(validConversations);
      
      // Update conversations list and select current conversation if it exists
      const currentConversation = this.state.conversation_id 
        ? sortedConversations.find(conv => conv.id === this.state.conversation_id)
        : null;
      
      this.setState({
        conversations: sortedConversations,
        selectedConversation: currentConversation || this.state.selectedConversation
      });
      
    } catch (error: any) {
      console.error('Error refreshing conversations list:', error);
    }
  };

  /**
   * Fetch conversations from the API
   */
  fetchConversations = async () => {
    if (!this.props.services?.api) {
      this.setState({
        isLoadingHistory: false,
        error: 'API service not available'
      });
      return;
    }
    
    try {
      this.setState({ isLoadingHistory: true, error: '' });
      
      // First, get the current user's information to get their ID
      const userResponse: any = await this.props.services.api.get('/api/v1/auth/me');
      
      // Extract the user ID from the response
      let userId = userResponse.id;
      
      if (!userId) {
        throw new Error('Could not get current user ID');
      }
      
      // Get current page context for page-specific conversations
      const pageContext = this.getCurrentPageContext();
      const params: any = {
        skip: 0,
        limit: 50, // Fetch up to 50 conversations
        conversation_type: this.props.conversationType || "chat" // Filter by conversation type
      };
      
      // Add page_id if available for page-specific conversations
      if (pageContext?.pageId) {
        params.page_id = pageContext.pageId;
      }
      
      // Use the user ID as is - backend now handles IDs with or without dashes
      const response: any = await this.props.services.api.get(
        `/api/v1/users/${userId}/conversations`,
        { params }
      );
      
      let conversations = [];
      
      if (Array.isArray(response)) {
        conversations = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        conversations = response.data;
      } else if (response) {
        // Try to extract conversations from the response in a different way
        try {
          if (typeof response === 'object') {
            // Check if the response itself might be the conversations array
            if (response.id && response.user_id) {
              conversations = [response];
            }
          }
        } catch (parseError) {
          // Error parsing response
        }
      }
      
      if (conversations.length === 0) {
        // No conversations yet, but this is not an error
        this.setState({
          conversations: [],
          isLoadingHistory: false
        });
        
        return;
      }
      
      // Validate conversation objects
      const validConversations = conversations.filter((conv: any) => {
        return conv && typeof conv === 'object' && conv.id && conv.user_id;
      });
      
      const sortedConversations = this.sortConversationsByRecency(validConversations);

      // Auto-select the most recent conversation if available
      const mostRecentConversation = sortedConversations.length > 0 ? sortedConversations[0] : null;
      
      this.setState({
        conversations: sortedConversations,
        selectedConversation: mostRecentConversation,
        isLoadingHistory: false
      }, () => {
        // Only auto-load the most recent conversation if we don't have an active conversation
        // This prevents interference with ongoing message exchanges
        if (mostRecentConversation && !this.state.conversation_id) {
          this.loadConversationWithPersona(mostRecentConversation.id);
        }
      });
    } catch (error: any) {
      // Check if it's a 403 Forbidden error
      if (error.status === 403 || (error.response && error.response.status === 403)) {
        // Show empty state for better user experience
        this.setState({
          isLoadingHistory: false,
          conversations: [],
          error: '' // Don't show an error message to the user
        });
      } else if (error.status === 404 || (error.response && error.response.status === 404)) {
        // Handle 404 errors (no conversations found)
        this.setState({
          isLoadingHistory: false,
          conversations: [],
          error: '' // Don't show an error message to the user
        });
      } else {
        // Handle other errors
        this.setState({
          isLoadingHistory: false,
          error: `Error loading conversations: ${error.message || 'Unknown error'}`
        });
      }
    }
  }

  /**
   * Handle model selection change
   */
  handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = event.target.value;
    const selectedModel = this.state.models.find(model => 
      `${model.provider}_${model.serverId}_${model.name}` === modelId
    );
    
    if (selectedModel) {
      this.setState({
        selectedModel,
        pendingModelKey: null,
        pendingModelSnapshot: null
      }, () => {
        this.broadcastModelSelection(selectedModel);
      });
    }
  };

  /**
   * Broadcast model selection event
   */
  broadcastModelSelection = (model: ModelInfo) => {
    if (!this.props.services?.event) {
      return;
    }

    // Create model selection message
    const modelInfo = {
      type: 'model.selection',
      content: {
        model: {
          name: model.name,
          provider: model.provider,
          providerId: model.providerId,
          serverName: model.serverName,
          serverId: model.serverId
        },
        timestamp: new Date().toISOString()
      }
    };
    
    // Send to event system
    this.props.services.event.sendMessage('ai-prompt-chat', modelInfo.content);
  };

  private getModelKey(modelName?: string | null, serverName?: string | null) {
    const safeModel = (modelName || '').trim();
    const safeServer = (serverName || '').trim();
    return `${safeServer}:::${safeModel}`;
  }

  private getModelKeyFromInfo(model: ModelInfo | null) {
    if (!model) {
      return '';
    }
    return this.getModelKey(model.name, model.serverName);
  }

  private resolvePendingModelSelection = () => {
    const { pendingModelKey, models, selectedModel, pendingModelSnapshot } = this.state;

    if (!pendingModelKey) {
      if (pendingModelSnapshot) {
        this.setState({ pendingModelSnapshot: null });
      }
      return;
    }

    const matchingModel = models.find(model => this.getModelKeyFromInfo(model) === pendingModelKey);

    if (matchingModel) {
      const selectedKey = this.getModelKeyFromInfo(selectedModel);
      const isSameKey = selectedKey === pendingModelKey;
      const selectedIsTemporary = Boolean(selectedModel?.isTemporary);
      const matchingIsTemporary = Boolean(matchingModel.isTemporary);

      if (!selectedModel || !isSameKey || (selectedIsTemporary && !matchingIsTemporary)) {
        this.setState({
          selectedModel: matchingModel,
          pendingModelKey: matchingIsTemporary ? pendingModelKey : null,
          pendingModelSnapshot: matchingIsTemporary ? pendingModelSnapshot : null
        }, () => {
          if (!matchingIsTemporary) {
            this.broadcastModelSelection(matchingModel);
          }
        });
        return;
      }

      if (!matchingIsTemporary) {
        this.setState({ pendingModelKey: null, pendingModelSnapshot: null });
      }

      return;
    }

    if (pendingModelSnapshot && !models.some(model => this.getModelKeyFromInfo(model) === pendingModelKey)) {
      this.setState(prevState => ({
        models: [...prevState.models, pendingModelSnapshot]
      }));
    }
  };

  private resolvePendingPersonaSelection = () => {
    const { pendingPersonaId, showPersonaSelection, personas, selectedPersona } = this.state;

    if (!showPersonaSelection) {
      if (pendingPersonaId) {
        this.setState({ pendingPersonaId: null });
      }
      return;
    }

    if (!pendingPersonaId) {
      return;
    }

    const normalizedPendingId = `${pendingPersonaId}`;

    if (selectedPersona && `${selectedPersona.id}` === normalizedPendingId) {
      this.setState({ pendingPersonaId: null });
      return;
    }

    const existingPersona = personas.find(persona => `${persona.id}` === normalizedPendingId);
    if (existingPersona) {
      this.setState({
        selectedPersona: existingPersona,
        pendingPersonaId: null
      });
      return;
    }

    if (!this.props.services?.api) {
      return;
    }

    if (this.pendingPersonaRequestId === normalizedPendingId) {
      return;
    }

    this.pendingPersonaRequestId = normalizedPendingId;

    this.fetchPersonaById(normalizedPendingId)
      .then(persona => {
        if (!persona) {
          return;
        }

        const personaId = `${persona.id}`;

        if (!this.state.pendingPersonaId || `${this.state.pendingPersonaId}` !== personaId) {
          return;
        }

        this.setState(prevState => {
          const alreadyExists = prevState.personas.some(p => `${p.id}` === personaId);
          const personasList = alreadyExists
            ? prevState.personas
            : [...prevState.personas, { ...persona, id: personaId }];

          return {
            personas: personasList,
            selectedPersona: personasList.find(p => `${p.id}` === personaId) || null,
            pendingPersonaId: null
          };
        });
      })
      .catch(error => {
        console.error('Error resolving pending persona:', error);
      })
      .finally(() => {
        this.pendingPersonaRequestId = null;
      });
  };

  private fetchPersonaById = async (personaId: string): Promise<PersonaInfo | null> => {
    if (!this.props.services?.api) {
      return null;
    }

    try {
      const response: any = await this.props.services.api.get(`/api/v1/personas/${personaId}`);
      const personaCandidate: any = response?.persona || response?.data || response;
      if (personaCandidate && personaCandidate.id) {
        return {
          ...personaCandidate,
          id: `${personaCandidate.id}`
        } as PersonaInfo;
      }
    } catch (error) {
      console.error('Error fetching persona by id:', error);
    }

    return null;
  };

  /**
   * Handle conversation selection
   */
  handleConversationSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const conversationId = event.target.value;
    
    console.log(`📋 Conversation selected: ${conversationId || 'new chat'}`);
    
    if (!conversationId) {
      // New chat selected
      this.handleNewChatClick();
      return;
    }
    
    const selectedConversation = this.state.conversations.find(
      conv => conv.id === conversationId
    );
    
    if (selectedConversation) {
      console.log(`📂 Loading conversation: ${conversationId}`);
      this.setState({ selectedConversation }, () => {
        // Use the new persona-aware conversation loading method
        this.loadConversationWithPersona(conversationId);
      });
    }
  };

  /**
   * Handle persona selection
   */
  handlePersonaChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const personaId = event.target.value;
    const selectedPersona = personaId
      ? this.state.personas.find(p => p.id === personaId) || null
      : null;
    
    console.log(`🎭 Persona changed: ${selectedPersona?.name || 'none'} (ID: ${personaId || 'none'})`);
    
    this.setState({ selectedPersona, pendingPersonaId: null }, () => {
      console.log(`🎭 Persona state after change: selectedPersona=${this.state.selectedPersona?.name || 'null'}, showPersonaSelection=${this.state.showPersonaSelection}`);
    });

    // If we have an active conversation, update its persona
    if (this.state.conversation_id) {
      try {
        await this.updateConversationPersona(this.state.conversation_id, personaId || null);
      } catch (error) {
        console.error('Failed to update conversation persona:', error);
        // Could show a user-friendly error message here
      }
    }
  };

  /**
   * Handle persona toggle (when turning personas on/off)
   */
  handlePersonaToggle = () => {
    // Reset to no persona when toggling off
    console.log('🎭 Persona toggled off - resetting to no persona');
    this.setState({ selectedPersona: null, pendingPersonaId: null }, () => {
      console.log(`🎭 Persona state after toggle: selectedPersona=${this.state.selectedPersona?.name || 'null'}, showPersonaSelection=${this.state.showPersonaSelection}`);
    });
  };

  /**
   * Handle new chat button click
   */
  handleNewChatClick = () => {
    console.log(`🆕 Starting new chat - clearing conversation_id`);
    this.setState({
      selectedConversation: null,
      conversation_id: null,
      messages: [],
      // Reset persona to null when starting new chat (respects persona toggle state)
      selectedPersona: this.state.showPersonaSelection ? this.state.selectedPersona : null,
      pendingModelKey: null,
      pendingModelSnapshot: null,
      pendingPersonaId: null
    }, () => {
      console.log(`✅ New chat started - conversation_id: ${this.state.conversation_id}`);
      // Only use persona greeting if persona selection is enabled and a persona is selected
      const personaGreeting = this.state.showPersonaSelection && this.state.selectedPersona?.sample_greeting;
      const greetingContent = personaGreeting || this.props.initialGreeting;
      
      console.log(`🎭 New chat greeting: showPersonaSelection=${this.state.showPersonaSelection}, selectedPersona=${this.state.selectedPersona?.name || 'none'}, using=${personaGreeting ? 'persona' : 'default'} greeting`);
      
      if (greetingContent) {
        this.initialGreetingAdded = true;
        this.addMessageToChat({
          id: generateId('greeting'),
          sender: 'ai',
          content: greetingContent,
          timestamp: new Date().toISOString()
        });
      }
    });
  };

  /**
   * Handle renaming a conversation
   */
  handleRenameConversation = async (conversationId: string, newTitle?: string) => {
    // Close menu first
    this.setState({ openConversationMenu: null });
    
    if (!newTitle) {
      const conversation = this.state.conversations.find(c => c.id === conversationId);
      const promptResult = prompt('Enter new name:', conversation?.title || 'Untitled');
      if (!promptResult) return; // User cancelled
      newTitle = promptResult;
    }
    
    if (!this.props.services?.api) {
      throw new Error('API service not available');
    }

    try {
      await this.props.services.api.put(
        `/api/v1/conversations/${conversationId}`,
        { title: newTitle }
      );

      // Update the conversation in state
      this.setState(prevState => {
        const updatedConversations = prevState.conversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, title: newTitle }
            : conv
        );

        const updatedSelectedConversation = prevState.selectedConversation?.id === conversationId
          ? { ...prevState.selectedConversation, title: newTitle }
          : prevState.selectedConversation;

        return {
          conversations: updatedConversations,
          selectedConversation: updatedSelectedConversation
        };
      });

    } catch (error: any) {
      throw new Error(`Error renaming conversation: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Toggle conversation menu
   */
  toggleConversationMenu = (conversationId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    console.log('🔍 toggleConversationMenu called:', { conversationId, hasEvent: !!event });
    
    const isOpening = this.state.openConversationMenu !== conversationId;
    console.log('🔍 isOpening:', isOpening);
    
    if (isOpening) {
      // Simple toggle - CSS handles all positioning
      this.setState({
        openConversationMenu: conversationId
      }, () => {
        console.log('🔍 Menu opened for conversation:', conversationId);
      });
    } else {
      console.log('🔍 Closing menu');
      this.setState({
        openConversationMenu: null
      });
    }
  };

  /**
   * Handle sharing a conversation
   */
  handleShareConversation = async (conversationId: string) => {
    // Close menu
    this.setState({ openConversationMenu: null });
    
    // For now, just copy the conversation URL to clipboard
    try {
      const url = `${window.location.origin}${window.location.pathname}?conversation=${conversationId}`;
      await navigator.clipboard.writeText(url);
      
      // Show a temporary success message
      this.addMessageToChat({
        id: generateId('share-success'),
        sender: 'ai',
        content: '📋 Conversation link copied to clipboard!',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.addMessageToChat({
        id: generateId('share-error'),
        sender: 'ai',
        content: '❌ Failed to copy conversation link',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Handle deleting a conversation
   */
  handleDeleteConversation = async (conversationId: string) => {
    // Close menu first
    this.setState({ openConversationMenu: null });
    
    if (!this.props.services?.api) {
      throw new Error('API service not available');
    }

    try {
      await this.props.services.api.delete(`/api/v1/conversations/${conversationId}`);

      // Update state to remove the conversation
      this.setState(prevState => {
        const updatedConversations = prevState.conversations.filter(
          conv => conv.id !== conversationId
        );

        // If the deleted conversation was selected, clear selection and start new chat
        const wasSelected = prevState.selectedConversation?.id === conversationId;

        return {
          conversations: updatedConversations,
          selectedConversation: wasSelected ? null : prevState.selectedConversation,
          conversation_id: wasSelected ? null : prevState.conversation_id,
          messages: wasSelected ? [] : prevState.messages,
          // Reset persona to null when starting new chat (respects persona toggle state)
          selectedPersona: wasSelected ? (prevState.showPersonaSelection ? prevState.selectedPersona : null) : prevState.selectedPersona
        };
      }, () => {
        // If we deleted the selected conversation, add greeting if available
        if (this.state.selectedConversation === null) {
          // Only use persona greeting if persona selection is enabled and a persona is selected
          // Ensure persona is null when personas are disabled
          const effectivePersona = this.state.showPersonaSelection ? this.state.selectedPersona : null;
          const greetingContent = (this.state.showPersonaSelection && effectivePersona?.sample_greeting) 
            || this.props.initialGreeting;
          
          if (greetingContent) {
            this.initialGreetingAdded = true;
            this.addMessageToChat({
              id: generateId('greeting'),
              sender: 'ai',
              content: greetingContent,
              timestamp: new Date().toISOString()
            });
          }
        }
      });

    } catch (error: any) {
      throw new Error(`Error deleting conversation: ${error.message || 'Unknown error'}`);
    }
  };

  /**
   * Load conversation history from the API
   */
  loadConversationHistory = async (conversationId: string) => {
    console.log(`📚 Loading conversation history: ${conversationId}`);
    
    if (!this.props.services?.api) {
      this.setState({ error: 'API service not available', isInitializing: false });
      return;
    }
    
    try {
      // Clear current conversation without showing initial greeting
      console.log(`🧹 Clearing messages for conversation load: ${conversationId}`);
      this.setState({
        messages: [],
        conversation_id: null,
        isLoadingHistory: true,
        error: ''
      });
      
      // Fetch conversation with messages
      const response: any = await this.props.services.api.get(
        `/api/v1/conversations/${conversationId}/with-messages`
      );
      
      // Mark that we've loaded a conversation, so don't show initial greeting
      this.initialGreetingAdded = true;
      
      // Process messages
      const messages: ChatMessage[] = [];
      
      if (response && response.messages && Array.isArray(response.messages)) {
        // Convert API message format to ChatMessage format
        messages.push(...response.messages.map((msg: any) => ({
          id: msg.id || generateId('history'),
          sender: msg.sender === 'llm' ? 'ai' : 'user' as 'ai' | 'user',
          content: this.cleanMessageContent(msg.message),
          timestamp: msg.created_at
        })));
      }
      
      // Update state
      this.setState({
        messages,
        conversation_id: conversationId,
        isLoadingHistory: false,
        isInitializing: false
      });
      
      console.log(`✅ Conversation history loaded: ${conversationId}, ${messages.length} messages`);
      
      // Scroll to bottom after loading history so the latest reply is visible
      setTimeout(() => {
        this.scrollToBottom({ force: true });
      }, 100);
      
    } catch (error) {
      // Error loading conversation history
      this.setState({
        isLoadingHistory: false,
        error: 'Error loading conversation history',
        isInitializing: false
      });
    }
  }

  /**
   * Load conversation history with persona and model auto-selection
   */
  loadConversationWithPersona = async (conversationId: string) => {
    console.log(`🔄 Loading conversation with persona: ${conversationId}`);
    
    if (!this.props.services?.api || !this.aiService) {
      this.setState({ error: 'API service not available', isInitializing: false });
      return;
    }
    
    try {
      // Clear current conversation without showing initial greeting
      this.setState({
        messages: [],
        conversation_id: null,
        isLoadingHistory: true,
        error: ''
      });
      
      // Get the selected conversation from state to access model/server info
      const selectedConversation = this.state.selectedConversation;
      
      // Try to fetch conversation with persona details first
      let conversationWithPersona: ConversationWithPersona | null = null;
      try {
         // @ts-ignore
        conversationWithPersona = await this.aiService.loadConversationWithPersona(conversationId);
      } catch (error) {
        // If the new endpoint doesn't exist yet, fall back to regular conversation loading
        console.warn('Persona-aware conversation loading not available, falling back to regular loading');
        // Use the selected conversation data we already have
        conversationWithPersona = selectedConversation;
      }
      
      const showPersonaSelection = this.state.showPersonaSelection;
      const personaFromConversation = showPersonaSelection && conversationWithPersona?.persona
        ? { ...conversationWithPersona.persona, id: `${conversationWithPersona.persona.id}` }
        : null;
      const personaIdFromConversation = showPersonaSelection
        ? (personaFromConversation?.id
          || (conversationWithPersona?.persona_id ? `${conversationWithPersona.persona_id}` : null))
        : null;
      const pendingPersonaId = personaIdFromConversation && personaIdFromConversation.trim() !== ''
        ? personaIdFromConversation
        : null;

      const modelName = conversationWithPersona?.model?.trim();
      const serverName = conversationWithPersona?.server?.trim();
      const hasModelMetadata = Boolean(modelName && serverName);

      const pendingModelKey = hasModelMetadata
        ? this.getModelKey(modelName, serverName)
        : null;
      const matchingModel = pendingModelKey
        ? this.state.models.find(model => this.getModelKeyFromInfo(model) === pendingModelKey)
        : null;
      const pendingModelSnapshot = pendingModelKey && !matchingModel && hasModelMetadata
        ? {
            name: modelName!,
            provider: 'ollama',
            providerId: 'ollama_servers_settings',
            serverName: serverName!,
            serverId: 'unknown',
            isTemporary: true
          } as ModelInfo
        : null;

      const previousSelectedModelKey = this.getModelKeyFromInfo(this.state.selectedModel);

      this.setState(prevState => {
        const nextState: Partial<CollectionChatState> = {
          pendingModelKey,
          pendingModelSnapshot,
          pendingPersonaId,
        };

        if (matchingModel) {
          nextState.selectedModel = matchingModel;
        } else if (pendingModelSnapshot) {
          nextState.selectedModel = pendingModelSnapshot;
        } else if (!pendingModelKey) {
          nextState.pendingModelKey = null;
          nextState.pendingModelSnapshot = null;
        }

        if (showPersonaSelection) {
          if (personaFromConversation) {
            const existingPersona = prevState.personas.find(p => `${p.id}` === personaFromConversation.id);
            if (existingPersona) {
              nextState.selectedPersona = existingPersona;
            } else {
              nextState.personas = [...prevState.personas, personaFromConversation];
              nextState.selectedPersona = personaFromConversation;
            }
          } else if (pendingPersonaId) {
            nextState.pendingPersonaId = pendingPersonaId;
            const existingPersona = prevState.personas.find(p => `${p.id}` === pendingPersonaId);
            nextState.selectedPersona = existingPersona || null;
          } else {
            nextState.selectedPersona = null;
            nextState.pendingPersonaId = null;
          }
        } else {
          nextState.selectedPersona = null;
          nextState.pendingPersonaId = null;
        }

        return nextState as Pick<CollectionChatState, keyof CollectionChatState>;
      }, () => {
        const newSelectedModelKey = this.getModelKeyFromInfo(this.state.selectedModel);
        if (
          (matchingModel || pendingModelSnapshot) &&
          newSelectedModelKey &&
          newSelectedModelKey !== previousSelectedModelKey
        ) {
          const currentModel = this.state.selectedModel;
          if (currentModel) {
            this.broadcastModelSelection(currentModel);
          }
        }

        if (pendingModelKey) {
          this.resolvePendingModelSelection();
        }
        if (this.state.pendingPersonaId) {
          this.resolvePendingPersonaSelection();
        }
      });
      
      // Now load the conversation messages using the regular method
      await this.loadConversationHistory(conversationId);
      
      console.log(`✅ Conversation loaded successfully: ${conversationId}`);
      
    } catch (error) {
      console.error('Error loading conversation with persona:', error);
      // Fall back to regular conversation loading
      await this.loadConversationHistory(conversationId);
    }
  };

  /**
   * Update conversation's persona
   */
  updateConversationPersona = async (conversationId: string, personaId: string | null) => {
    if (!this.aiService) {
      throw new Error('AI service not available');
    }

    try {
      await this.aiService.updateConversationPersona(conversationId, personaId);
    } catch (error) {
      console.error('Error updating conversation persona:', error);
      throw error;
    }
  };

  /**
   * Stop ongoing generation
   */
  stopGeneration = async () => {
    console.log('🛑 stopGeneration called');
    
    // Abort the frontend request immediately
    if (this.currentStreamingAbortController) {
      this.currentStreamingAbortController.abort();
      this.currentStreamingAbortController = null;
    }
    
    // Try to cancel backend generation (best effort)
    if (this.aiService && this.state.conversation_id) {
      try {
        await this.aiService.cancelGeneration(this.state.conversation_id);
      } catch (error) {
        console.error('Error canceling backend generation:', error);
        // Continue anyway - the AbortController should handle the cancellation
      }
    }
    
    // Immediately update UI state - keep the partial response but mark it as stopped
    this.setState(prevState => {
      console.log('🛑 Updating message states, current messages:', prevState.messages.length);
      
      const updatedMessages = prevState.messages.map(message => {
        const shouldUpdate = message.isStreaming;
        if (shouldUpdate) {
          console.log(`🛑 Updating streaming message ${message.id} with canContinue: true, isCutOff: true`);
        }
        
        return {
          ...message,
          isStreaming: false,
          canRegenerate: true,
          // Only set canContinue and isCutOff for messages that are currently streaming
          canContinue: shouldUpdate ? true : message.canContinue,
          isCutOff: shouldUpdate ? true : message.isCutOff
        };
      });
      
      return {
        isStreaming: false,
        isLoading: false,
        messages: updatedMessages
      };
    }, () => {
      console.log('🛑 Message states updated, focusing input');
      // Focus the input after stopping
      this.focusInput();
    });
  };

  /**
   * Continue generation from where it left off by replacing the stopped message
   */
  continueGeneration = async () => {
    const lastAiMessage = this.state.messages
      .filter(msg => msg.sender === 'ai')
      .pop();
    
    if (lastAiMessage && lastAiMessage.canContinue) {
      // Find the last user message to get the original prompt
      const lastUserMessage = [...this.state.messages]
        .reverse()
        .find(msg => msg.sender === 'user');
      
      if (!lastUserMessage) return;
      
      // Remove the cut-off message
      this.setState(prevState => ({
        messages: prevState.messages.filter(msg => msg.id !== lastAiMessage.id)
      }), async () => {
        // Send the original prompt to continue generation
        await this.sendPromptToAI(lastUserMessage.content);
      });
    }
  };

  /**
   * Regenerate the last AI response
   */
  regenerateResponse = async () => {
    const lastUserMessage = this.state.messages
      .filter(msg => msg.sender === 'user')
      .pop();
    
    if (lastUserMessage) {
      // Remove the last AI response (all messages after the last user message)
      this.setState(prevState => {
        const lastUserIndex = prevState.messages.findIndex(msg => msg.id === lastUserMessage.id);
        return {
          messages: prevState.messages.slice(0, lastUserIndex + 1)
        };
      }, () => {
        // Regenerate the response
        this.sendPromptToAI(lastUserMessage.content);
      });
    }
  };

  /**
   * Start editing a user message
   */
  startEditingMessage = (messageId: string, content: string) => {
    this.setState({
      editingMessageId: messageId,
      editingContent: content
    });
  };

  /**
   * Cancel editing a message
   */
  cancelEditingMessage = () => {
    this.setState({
      editingMessageId: null,
      editingContent: ''
    });
  };

  /**
   * Toggle markdown view for a message
   */
  toggleMarkdownView = (messageId: string) => {
    this.setState(prevState => ({
      messages: prevState.messages.map(message => {
        if (message.id === messageId) {
          return {
            ...message,
            showRawMarkdown: !message.showRawMarkdown
          };
        }
        return message;
      })
    }));
  };

  /**
   * Save edited message and regenerate response
   */
  saveEditedMessage = async () => {
    const { editingMessageId, editingContent } = this.state;
    
    if (!editingMessageId || !editingContent.trim()) {
      return;
    }

    // Update the message content
    this.setState(prevState => ({
      messages: prevState.messages.map(message => {
        if (message.id === editingMessageId) {
          return {
            ...message,
            content: editingContent.trim(),
            isEdited: true,
            originalContent: message.originalContent || message.content
          };
        }
        return message;
      }),
      editingMessageId: null,
      editingContent: ''
    }), async () => {
      // Find the edited message and regenerate the response
      const editedMessage = this.state.messages.find(msg => msg.id === editingMessageId);
      if (editedMessage) {
        // Remove all messages after the edited message
        this.setState(prevState => ({
          messages: prevState.messages.slice(0, prevState.messages.findIndex(msg => msg.id === editingMessageId) + 1)
        }), () => {
          // Regenerate the response
          this.sendPromptToAI(editedMessage.content);
        });
      }
    });
  };

  /**
   * Handle file upload button click
   */
  handleFileUploadClick = () => {
    // Create a hidden file input and trigger it
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.pdf,.txt,.csv,.json,.xlsx,.xls,.md,.xml,.html';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      if (!this.documentService) {
        this.setState({ error: 'Document service not available' });
        return;
      }

      this.setState({ isProcessingDocuments: true });

      try {
        const fileArray = Array.from(files);
        const results: DocumentProcessingResult[] = [];

        // Process each file
        for (const file of fileArray) {
          try {
            // Validate file
            const validation = await this.documentService.validateFile(file);
            if (!validation.valid) {
              this.setState({ error: `File ${file.name}: ${validation.error}` });
              continue;
            }

            // Process file
            const result = await this.documentService.processDocument(file);
            if (result.processing_success) {
              results.push(result);
            } else {
              this.setState({ error: `Failed to process ${file.name}: ${result.error}` });
            }
          } catch (error) {
            this.setState({ error: `Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}` });
          }
        }

        if (results.length > 0) {
          this.handleDocumentsProcessed(results);
        }
      } catch (error) {
        this.setState({ error: `Error processing documents: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        this.setState({ isProcessingDocuments: false });
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  /**
   * Handle document processing
   */
  handleDocumentsProcessed = (results: DocumentProcessingResult[]) => {
    if (results.length === 0) return;

    // Format document context for chat
    let documentContext = '';
    if (results.length === 1) {
      documentContext = this.documentService!.formatTextForChatContext(results[0]);
    } else {
      documentContext = this.documentService!.formatMultipleTextsForChatContext(results);
    }

    // Add document context to state
    this.setState({ documentContext }, () => {
      // Add a message to show the documents were processed
      const documentMessage: ChatMessage = {
        id: generateId('documents'),
        sender: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        isDocumentContext: true,
        documentData: {
          results,
          context: documentContext
        }
      };

      this.addMessageToChat(documentMessage);
    });
  };

  /**
   * Handle document processing errors
   */
  handleDocumentError = (error: string) => {
    this.setState({ error });
  };

  /**
   * Handle key press events for global shortcuts
   */
  handleGlobalKeyPress = (e: KeyboardEvent) => {
    // ESC key to stop generation
    if (e.key === 'Escape' && this.state.isStreaming) {
      e.preventDefault();
      this.stopGeneration();
    }
    
    // ESC key to close conversation menu
    if (e.key === 'Escape' && this.state.openConversationMenu) {
      e.preventDefault();
      this.setState({ openConversationMenu: null });
    }
  };

  /**
   * Handle click outside to close conversation menu
   */
  handleClickOutside = (e: MouseEvent) => {
    if (!this.state.openConversationMenu) return;
    
    const target = e.target as Element;
    
    // Don't close if clicking on the menu button or menu itself
    if (target.closest('.history-action-button') || target.closest('.conversation-menu')) {
      return;
    }
    
    // Close the menu
    this.setState({ openConversationMenu: null });
  };

  /**
   * Toggle history accordion
   */
  toggleHistoryAccordion = () => {
    this.setState(prevState => ({
      isHistoryExpanded: !prevState.isHistoryExpanded
    }));
  };

  /**
   * Auto-close accordions on first message
   */
  autoCloseAccordionsOnFirstMessage = () => {
    // Only close if this is the first user message in a new conversation
    const userMessages = this.state.messages.filter(msg => msg.sender === 'user');
    if (userMessages.length === 1 && !this.state.conversation_id) {
      this.setState({
        isHistoryExpanded: false
      });
    }
  };



  /**
   * Build comprehensive search context to inject into user prompt
   */
  buildSearchContextForPrompt = (searchResponse: any, scrapedContent: any): string => {
    let context = `Search Results for "${searchResponse.query}":\n\n`;
    
    // Add basic search results
    if (searchResponse.results && searchResponse.results.length > 0) {
      searchResponse.results.slice(0, 5).forEach((result: any, index: number) => {
        context += `${index + 1}. ${result.title}\n`;
        context += `   URL: ${result.url}\n`;
        if (result.content) {
          const cleanContent = result.content.replace(/\s+/g, ' ').trim().substring(0, 200);
          context += `   Summary: ${cleanContent}${result.content.length > 200 ? '...' : ''}\n`;
        }
        context += '\n';
      });
    }

    // Add detailed scraped content
    if (scrapedContent && scrapedContent.results && scrapedContent.results.length > 0) {
      context += '\nDetailed Content from Web Pages:\n\n';
      
      scrapedContent.results.forEach((result: any, index: number) => {
        if (result.success && result.content) {
          // Find the corresponding search result for title
          const searchResult = searchResponse.results.find((sr: any) => sr.url === result.url);
          const title = searchResult?.title || `Content from ${result.url}`;
          
          context += `Page ${index + 1}: ${title}\n`;
          context += `Source: ${result.url}\n`;
          context += `Full Content: ${result.content}\n\n`;
        }
      });
      
      context += `(Successfully scraped ${scrapedContent.summary.successful_scrapes} out of ${scrapedContent.summary.total_urls} pages)\n`;
    }

    context += '\nPlease use this web search and scraped content information to provide an accurate, up-to-date answer to the user\'s question.';
    
    return context;
  };

  /**
   * Clean up message content by removing excessive newlines and search/document context
   */
  cleanMessageContent = (content: string): string => {
    if (!content) return content;
    
    let cleanedContent = content
      .replace(/\r\n/g, '\n')      // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2 (paragraph break)
      .trim();                     // Remove leading/trailing whitespace
    
    // Remove web search context that might have been stored in old messages
    cleanedContent = cleanedContent.replace(/\n\n\[WEB SEARCH CONTEXT[^]*$/, '');
    
    // Remove document context that might have been stored in old messages
    cleanedContent = cleanedContent.replace(/^Document Context:[^]*?\n\nUser Question: /, '');
    cleanedContent = cleanedContent.replace(/^[^]*?\n\nUser Question: /, '');
    
    return cleanedContent.trim();
  };

  /**
   * Add a new message to the chat history
   */
  addMessageToChat = (message: ChatMessage) => {
    // Clean up the message content
    const cleanedMessage = {
      ...message,
      content: this.cleanMessageContent(message.content)
    };
    
    console.log(`💬 Adding message to chat: ${cleanedMessage.sender} - ${cleanedMessage.content.substring(0, 50)}...`);
    this.setState(prevState => ({
      messages: [...prevState.messages, cleanedMessage]
    }), () => {
      console.log(`✅ Message added. Total messages: ${this.state.messages.length}`);
    });
  }

  /**
   * Determine how far above the live edge we should keep the viewport.
   * Ensures we never hide the entire final message when it's short.
   */
  private getEffectiveAnchorOffset = (container: HTMLDivElement): number => {
    const lastMessage = this.state.messages[this.state.messages.length - 1];
    if (lastMessage?.isStreaming) {
      return 0;
    }

    const baseOffset = Math.max(this.SCROLL_ANCHOR_OFFSET, 0);
    if (baseOffset === 0) {
      return 0;
    }

    const lastMessageElement = container.querySelector('.message:last-of-type') as HTMLElement | null;
    if (!lastMessageElement) {
      return baseOffset;
    }

    const lastMessageHeight = lastMessageElement.offsetHeight;
    const maxAllowableOffset = Math.max(lastMessageHeight - this.MIN_VISIBLE_LAST_MESSAGE_HEIGHT, 0);
    return Math.min(baseOffset, maxAllowableOffset);
  };

  private getScrollMetrics = () => {
    const container = this.chatHistoryRef.current;
    if (!container) {
      return {
        distanceFromBottom: 0,
        dynamicOffset: 0
      };
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const dynamicOffset = this.getEffectiveAnchorOffset(container);

    return { distanceFromBottom, dynamicOffset };
  };

  private getConversationSortTimestamp = (conversation: any): number => {
    if (!conversation || typeof conversation !== 'object') {
      return 0;
    }

    const candidateFields = [
      conversation.last_message_at,
      conversation.lastMessageAt,
      conversation.latest_message_at,
      conversation.latestMessageAt,
      conversation.started_at,
      conversation.startedAt,
      conversation.updated_at,
      conversation.updatedAt,
      conversation.created_at,
      conversation.createdAt
    ];

    for (const maybeDate of candidateFields) {
      if (!maybeDate) continue;
      const timestamp = new Date(maybeDate).getTime();
      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
    }

    return 0;
  };

  private sortConversationsByRecency = (conversations: any[]): any[] => {
    return [...conversations].sort((a, b) => {
      const timeA = this.getConversationSortTimestamp(a);
      const timeB = this.getConversationSortTimestamp(b);

      return timeB - timeA;
    });
  };

  /**
   * Check if user is near the bottom of the chat
   */
  isUserNearBottom = (thresholdOverride?: number) => {
    if (!this.chatHistoryRef.current) return true;

    const { distanceFromBottom, dynamicOffset } = this.getScrollMetrics();
    const threshold = thresholdOverride ?? Math.max(dynamicOffset, this.NEAR_BOTTOM_EPSILON);

    return distanceFromBottom <= threshold;
  };

  private hasRecentUserIntent = () => {
    if (!this.lastUserScrollTs) {
      return false;
    }

    return Date.now() - this.lastUserScrollTs <= this.USER_SCROLL_INTENT_GRACE_MS;
  };

  private canAutoScroll = (requestedAt: number = Date.now()) => {
    if (this.state.isAutoScrollLocked) {
      return false;
    }

    if (this.lastUserScrollTs && this.lastUserScrollTs > requestedAt) {
      return false;
    }

    return this.isUserNearBottom();
  };

  private cancelPendingAutoScroll = () => {
    if (this.pendingAutoScrollTimeout) {
      clearTimeout(this.pendingAutoScrollTimeout);
      this.pendingAutoScrollTimeout = null;
    }
  };

  private registerUserScrollIntent = () => {
    this.lastUserScrollTs = Date.now();
    this.cancelPendingAutoScroll();

    this.setState(prevState => {
      if (prevState.isAutoScrollLocked && prevState.showScrollToBottom) {
        return null;
      }

      return {
        isAutoScrollLocked: true,
        showScrollToBottom: true
      };
    });
  };

  /**
   * Update scroll state based on current position
   */
  updateScrollState = (options: { fromUser?: boolean; manualUnlock?: boolean } = {}) => {
    if (!this.chatHistoryRef.current) return;

    const { fromUser = false, manualUnlock = false } = options;
    const { distanceFromBottom, dynamicOffset } = this.getScrollMetrics();
    const nearBottomThreshold = Math.max(dynamicOffset, this.NEAR_BOTTOM_EPSILON);
    const isNearBottom = distanceFromBottom <= nearBottomThreshold;
    const isAtStrictBottom = distanceFromBottom <= this.STRICT_BOTTOM_THRESHOLD;

    let shouldClearUserIntent = false;
    let shouldSuppressManualIntent = false;

    this.setState(prevState => {
      let isAutoScrollLocked = prevState.isAutoScrollLocked;

      if (manualUnlock) {
        if (isAutoScrollLocked) {
          shouldClearUserIntent = true;
        }
        isAutoScrollLocked = false;
      } else if (fromUser) {
        if (isAtStrictBottom) {
          if (isAutoScrollLocked) {
            shouldClearUserIntent = true;
          }
          isAutoScrollLocked = false;
          shouldSuppressManualIntent = true;
        } else {
          isAutoScrollLocked = true;
        }
      } else if (isAtStrictBottom && prevState.isAutoScrollLocked && !this.hasRecentUserIntent()) {
        isAutoScrollLocked = false;
        shouldClearUserIntent = true;
      }

      const nextShowScrollToBottom = isAutoScrollLocked ? true : !isAtStrictBottom;

      if (
        prevState.isNearBottom === isNearBottom &&
        prevState.showScrollToBottom === nextShowScrollToBottom &&
        prevState.isAutoScrollLocked === isAutoScrollLocked
      ) {
        return null;
      }

      return {
        isNearBottom,
        showScrollToBottom: nextShowScrollToBottom,
        isAutoScrollLocked
      };
    }, () => {
      if (shouldClearUserIntent && !this.state.isAutoScrollLocked) {
        this.lastUserScrollTs = 0;
      }

      if (shouldSuppressManualIntent) {
        this.lastUserScrollTs = 0;
      }
    });
  };

  /**
   * Handle scroll events to track user scroll position
   */
  handleScroll = () => {
    if (this.isProgrammaticScroll) {
      this.updateScrollState();
      return;
    }

    this.registerUserScrollIntent();
    this.updateScrollState({ fromUser: true });
  };

  handleUserScrollIntent = (_source: 'pointer' | 'wheel' | 'touch' | 'key') => {
    this.registerUserScrollIntent();
  };

  handleScrollToBottomClick = () => {
    this.scrollToBottom({ behavior: 'smooth', manual: true });
  };

  private followStreamIfAllowed = () => {
    if (this.canAutoScroll()) {
      this.scrollToBottom();
    } else {
      this.updateScrollState();
    }
  };

  /**
   * Scroll the chat history to the bottom while respecting the anchor offset
   */
  scrollToBottom = (options: ScrollToBottomOptions = {}) => {
    if (!this.chatHistoryRef.current) return;

    this.cancelPendingAutoScroll();
    const { behavior = 'auto', manual = false, force = false } = options;
    const container = this.chatHistoryRef.current;

    const useAnchorOffset = !(manual || force);
    const dynamicOffset = useAnchorOffset ? this.getEffectiveAnchorOffset(container) : 0;
    const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
    const targetTop = Math.max(maxScrollTop - dynamicOffset, 0);

    this.isProgrammaticScroll = true;

    if (typeof container.scrollTo === 'function') {
      try {
        container.scrollTo({ top: targetTop, behavior });
      } catch (_err) {
        container.scrollTop = targetTop;
      }
    } else {
      container.scrollTop = targetTop;
    }

    const finalize = () => {
      this.isProgrammaticScroll = false;
      if (manual || force) {
        this.lastUserScrollTs = 0;
        this.updateScrollState({ manualUnlock: true });
      } else {
        this.updateScrollState();
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(finalize);
    } else {
      setTimeout(finalize, 0);
    }
  }

  /**
   * Focus the input field
   */
  focusInput = () => {
    if (this.inputRef.current) {
      // Small delay to ensure the UI has updated
      setTimeout(() => {
        if (this.inputRef.current) {
          this.inputRef.current.focus();
        }
      }, 100);
    }
  };

  /**
   * Handle input change
   */
  handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ inputText: e.target.value });
    
    // Auto-resize the textarea: 1 → 4 lines, then scroll
    if (this.inputRef.current) {
      const ta = this.inputRef.current;
      ta.style.height = 'auto';
      const computed = window.getComputedStyle(ta);
      const lineHeight = parseFloat(computed.lineHeight || '0') || 24; // fallback if not computable
      const maxHeight = lineHeight * 4; // 4 lines max
      ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
    }
  };

  /**
   * Handle key press in the input field
   */
  handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  };

  /**
   * Handle sending a message
   */
  handleSendMessage = () => {
    const { inputText } = this.state;
    
    // Don't send empty messages
    if (!inputText.trim() || this.state.isLoading) return;
    
    // Add user message to chat (will be updated with search context if web search is enabled)
    const userMessageId = generateId('user');
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      isEditable: true
    };
    
    this.addMessageToChat(userMessage);

    if (typeof window !== 'undefined') {
      const schedule = window.requestAnimationFrame || ((cb: FrameRequestCallback) => window.setTimeout(cb, 0));
      schedule(() => this.scrollToBottom({ behavior: 'smooth', manual: true }));
    } else {
      this.scrollToBottom({ manual: true });
    }
    
    // Clear input
    this.setState({ inputText: '' });
    
    // Reset textarea height
    if (this.inputRef.current) {
      this.inputRef.current.style.height = 'auto';
    }
    
    // Send to AI and get response
    this.sendPromptToAI(userMessage.content, userMessageId);
    
    // Auto-close accordions on first message
    this.autoCloseAccordionsOnFirstMessage();
  };

  /**
   * Send prompt to AI provider and handle response
   */
  sendPromptToAI = async (prompt: string, userMessageId?: string) => {
    if (!this.aiService || !this.props.services?.api) {
      this.setState({ error: 'API service not available' });
      return;
    }

    if (!this.state.selectedModel) {
      this.setState({ error: 'Please select a model first' });
      return;
    }
    
    console.log(`🚀 Sending prompt to AI with conversation_id: ${this.state.conversation_id || 'null (will create new)'}`);
    
    try {
      // Set loading and streaming state
      this.setState({ isLoading: true, isStreaming: true, error: '' });
      
      // Create abort controller for streaming
      this.currentStreamingAbortController = new AbortController();
      
      // Perform web search if enabled
      let enhancedPrompt = prompt;
      
      // Add document context if available (only for AI, not for chat history)
      if (this.state.documentContext) {
        enhancedPrompt = `${this.state.documentContext}\n\nUser Question: ${prompt}`;
      }

      // ground to collection - relevance context search
      const relevantResults = await this.props.dataRepository.getRelevantContent(
        prompt,
        this.props.selectedCollection.id
      );

      let relevantContext = '';
      if (relevantResults) {
        relevantContext = relevantResults.map((result) => result.content).join(", ");
        enhancedPrompt += `Relevant context: ${relevantContext}\n\nUser question: ${prompt}`
      }
      
      // Create placeholder for AI response
      const placeholderId = generateId('ai');
      
      this.addMessageToChat({
        id: placeholderId,
        sender: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      });
      
      // Track the current response content for proper abort handling
      let currentResponseContent = '';
      
      // Handle streaming chunks
      const onChunk = (chunk: string) => {
        currentResponseContent += chunk;
        this.setState(prevState => {
          const updatedMessages = prevState.messages.map(message => {
            if (message.id === placeholderId) {
              return {
                ...message,
                content: this.cleanMessageContent(currentResponseContent)
              };
            }
            return message;
          });

          return { ...prevState, messages: updatedMessages };
        }, this.followStreamIfAllowed);
      };
      
      // Handle conversation ID updates
      const onConversationId = (id: string) => {
        console.log(`🔄 Conversation ID received: ${id}`);
        this.setState({ conversation_id: id }, () => {
          console.log(`✅ Conversation ID updated in state: ${this.state.conversation_id}`);
          // Refresh conversations list after a small delay to ensure backend has processed the conversation
          setTimeout(() => {
            this.refreshConversationsList();
          }, 1000);
        });
      };
      
      // Get current page context to pass to AI service
      const pageContext = this.getCurrentPageContext();
      
      // Send prompt to AI
      await this.aiService.sendPrompt(
        enhancedPrompt,
        this.state.selectedModel,
        this.state.useStreaming,
        this.state.conversation_id,
        this.props.conversationType || "chat",
        onChunk,
        onConversationId,
        pageContext,
        this.state.selectedPersona || undefined,
        this.currentStreamingAbortController
      );
      
      // Finalize the message
      this.setState(prevState => {
        console.log('✅ Finalizing message with ID:', placeholderId);
        
        const updatedMessages = prevState.messages.map(message => {
          if (message.id === placeholderId) {
            const shouldPreserveContinue = message.isCutOff;
            console.log(`✅ Finalizing message ${message.id}, isCutOff: ${message.isCutOff}, preserving canContinue: ${shouldPreserveContinue}`);
            
            return {
              ...message,
              isStreaming: false,
              canRegenerate: true,
              // Preserve canContinue state if message was cut off, otherwise set to false
              canContinue: shouldPreserveContinue ? true : false
            };
          }
          return message;
        });
        
        return {
          messages: updatedMessages,
          isLoading: false,
          isStreaming: false
        };
      }, () => {
        console.log(`✅ Message finalized. Total messages: ${this.state.messages.length}`);
        this.followStreamIfAllowed();
        // Focus the input box after response is completed
        this.focusInput();
        
        // Refresh conversations list after the message is complete to include the new conversation
        if (this.state.conversation_id) {
          this.refreshConversationsList();
        }
      });
      
      // Clear abort controller
      this.currentStreamingAbortController = null;
      
    } catch (error) {
      // Check if this was an abort error
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, keep the partial response and mark it as stopped
        this.setState(prevState => ({
          isLoading: false,
          isStreaming: false,
          messages: prevState.messages.map(message => ({
            ...message,
            isStreaming: false,
            canRegenerate: true,
            // Only set canContinue and isCutOff for messages that are currently streaming
            canContinue: message.isStreaming ? true : message.canContinue,
            isCutOff: message.isStreaming ? true : message.isCutOff
          }))
        }), () => {
          this.focusInput();
        });
      } else {
        // Real error occurred
        this.setState({
          isLoading: false,
          isStreaming: false,
          error: `Error sending prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, () => {
          // Focus input even on error so user can try again
          this.focusInput();
        });
      }
      
      // Clear abort controller
      this.currentStreamingAbortController = null;
    }
  };

  render() {
    const {
      inputText,
      messages,
      isLoading,
      isLoadingHistory,
      useStreaming,
      error,
      isInitializing,
      models,
      isLoadingModels,
      selectedModel,
      conversations,
      selectedConversation,
      showModelSelection,
      showConversationHistory,
      personas,
      selectedPersona,
      isLoadingPersonas,
      showPersonaSelection,
      useWebSearch,
      isSearching
    } = this.state;
    
    const { promptQuestion, selectedCollection, services } = this.props;
    const themeClass = this.state.currentTheme === 'dark' ? 'dark-theme' : '';
    
    return (
      <div className={`braindrive-chat-container ${themeClass}`}>
        <div>
          <h1>Chat with {selectedCollection.name}</h1>
        </div>
        <div className="chat-paper">
          {/* Chat header with controls and history dropdown */}
          <ChatHeader
            apiService={services.api}
            dataRepository={this.props.dataRepository}
            models={models}
            selectedModel={selectedModel}
            isLoadingModels={isLoadingModels}
            onModelChange={this.handleModelChange}
            showModelSelection={showModelSelection}
            selectedCollection={selectedCollection}
            personas={personas}
            selectedPersona={selectedPersona}
            onPersonaChange={this.handlePersonaChange}
            showPersonaSelection={showPersonaSelection}
            conversations={conversations}
            selectedConversation={selectedConversation}
            onConversationSelect={this.handleConversationSelect}
            onNewChatClick={this.handleNewChatClick}
            showConversationHistory={true}
            onRenameSelectedConversation={(id) => this.handleRenameConversation(id)}
            onDeleteSelectedConversation={(id) => this.handleDeleteConversation(id)}
            isLoading={isLoading}
            isLoadingHistory={isLoadingHistory}
          />
          
          {/* Show initializing state or chat content */}
          {isInitializing ? (
            <LoadingStates isInitializing={isInitializing} />
          ) : (
            <>
              {/* Chat history area */}
              <div className="chat-history-container">
                <ChatHistory
                  messages={messages}
                  isLoading={isLoading}
                  isLoadingHistory={isLoadingHistory}
                  error={error}
                  chatHistoryRef={this.chatHistoryRef}
                  editingMessageId={this.state.editingMessageId}
                  editingContent={this.state.editingContent}
                  onStartEditing={this.startEditingMessage}
                  onCancelEditing={this.cancelEditingMessage}
                  onSaveEditing={this.saveEditedMessage}
                  onEditingContentChange={(content) => this.setState({ editingContent: content })}
                  onRegenerateResponse={this.regenerateResponse}
                  onContinueGeneration={this.continueGeneration}
                  showScrollToBottom={this.state.showScrollToBottom}
                  onScrollToBottom={this.handleScrollToBottomClick}
                  onToggleMarkdown={this.toggleMarkdownView}
                  onScroll={this.handleScroll}
                  onUserScrollIntent={this.handleUserScrollIntent}
                />
              </div>
              
              
              {/* Chat input area */}
                <ChatInput
                  inputText={inputText}
                  isLoading={isLoading}
                  isLoadingHistory={isLoadingHistory}
                  isStreaming={this.state.isStreaming}
                  selectedModel={selectedModel}
                  promptQuestion={promptQuestion}
                  onInputChange={this.handleInputChange}
                  onKeyPress={this.handleKeyPress}
                  onSendMessage={this.handleSendMessage}
                  onStopGeneration={this.stopGeneration}
                  onFileUpload={this.handleFileUploadClick}
                  inputRef={this.inputRef}
                  personas={personas}
                  selectedPersona={selectedPersona}
                  onPersonaChange={this.handlePersonaChange}
                  onPersonaToggle={this.handlePersonaToggle}
                  showPersonaSelection={false} // Moved to header
                />
            </>
          )}
          
          {/* Bottom history panel removed; history is now in header */}
        </div>
      </div>
    );
  }
}
