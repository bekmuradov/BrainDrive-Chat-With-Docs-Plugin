// import {
//   ChatServiceState,
//   CollectionChatViewProps,
//   ModelInfo,
//   PersonaInfo,
//   ConversationWithPersona,
//   ConversationInfo,
//   ChatMessage,
//   ApiService,
//   ScrollToBottomOptions,
//   Services
// } from './collectionChatTypes';

// import { generateId, debounce } from '../utils';
// import { UI_CONFIG, SETTINGS_KEYS, PROVIDER_SETTINGS_ID_MAP } from '../constants';


// /**
//  * CollectionChatService: Manages all state, business logic, and API calls for the chat feature.
//  */
// export class CollectionChatService {
//   public state: ChatServiceState;

//   private apiService: ApiService;
//   private services: Services;
//   private setState: (update: Partial<ChatServiceState>) => void;
//   private currentUserId: string | null = null;
//   private currentStreamingAbortController: AbortController | null = null;
//   private themeChangeListener: ((theme: string) => void) | null = null;
//   private pageContextUnsubscribe: (() => void) | null = null;
//   private currentPageContext: any = null;
//   private initialGreetingAdded = false;
//   private debouncedScrollToBottom: (options?: ScrollToBottomOptions) => void;
//   private pendingPersonaRequestId: string | null = null;
//   private readonly STREAMING_SETTING_KEY = SETTINGS_KEYS.STREAMING;

//   // Constants related to scroll behavior (to be implemented/injected by the Presenter)
//   private readonly SCROLL_ANCHOR_OFFSET = 420;
//   private readonly NEAR_BOTTOM_EPSILON = 24;

//   constructor(
//     props: CollectionChatViewProps,
//     setStateCallback: (update: Partial<ChatServiceState>) => void,
//     // Presenter-injected method for actual DOM scrolling
//     private performScrollToBottom: (options?: ScrollToBottomOptions) => void,
//     // Presenter-injected method to get scroll metrics
//     private getScrollMetrics: () => { 
//         isNearBottom: boolean; 
//         shouldShowScrollToBottom: boolean; 
//     }
//   ) {
//     this.services = props.services;
//     this.apiService = props.services.api;
//     this.setState = setStateCallback;

//     this.state = {
//       // Initialize state with defaults and props
//       messages: [],
//       inputText: '',
//       isLoading: false,
//       error: '',
//       currentTheme: 'light',
//       selectedModel: null,
//       useStreaming: true,
//       conversation_id: null,
//       isLoadingHistory: false,
//       isInitializing: true,
//       conversations: [],
//       selectedConversation: null,
//       models: [],
//       isLoadingModels: true,
//       personas: props.availablePersonas || [],
//       selectedPersona: null,
//       isLoadingPersonas: !props.availablePersonas,
//       showPersonaSelection: true,
//       isStreaming: false,
//       isNearBottom: true,
//       showScrollToBottom: false,
//       isAutoScrollLocked: false,
//       isHistoryExpanded: true,
//       openConversationMenu: null,
//     };

//     this.debouncedScrollToBottom = debounce(
//       (options?: ScrollToBottomOptions) => this.performScrollToBottom(options),
//       UI_CONFIG.SCROLL_DEBOUNCE_DELAY
//     );

//     // Bind methods that rely on 'this' and are passed as callbacks
//     this.handleScroll = this.handleScroll.bind(this);
//     this.handleSendMessage = this.handleSendMessage.bind(this);
//   }

//   // --- Initialization and Lifecycle ---

//   public initialize = () => {
//     this.initializeUserId();
//     this.initializeThemeService();
//     this.initializePageContextService();
//     this.loadInitialData();
//     this.loadSavedStreamingMode();
//     this.loadPersonas();

//     // Set initialization timeout for greeting message
//     setTimeout(() => {
//         if (!this.state.conversation_id) {
//             const effectivePersona = this.state.showPersonaSelection ? this.state.selectedPersona : null;
//             const personaGreeting = this.state.showPersonaSelection && effectivePersona?.sample_greeting;
//             const greetingContent = personaGreeting || (this.services as any).initialGreeting; // Use props.initialGreeting passed via services/closure
            
//             if (greetingContent && !this.initialGreetingAdded) {
//                 this.initialGreetingAdded = true;
//                 this.addMessageToChat({
//                     id: generateId('greeting'),
//                     sender: 'ai',
//                     content: greetingContent,
//                     timestamp: new Date().toISOString()
//                 });
//             }
//             this.setState({ isInitializing: false });
//         }
//     }, UI_CONFIG.INITIAL_GREETING_DELAY);
//   };

//   public cleanup = () => {
//     if (this.themeChangeListener && this.services?.theme) {
//       this.services.theme.removeThemeChangeListener(this.themeChangeListener);
//     }
//     if (this.pageContextUnsubscribe) {
//       this.pageContextUnsubscribe();
//     }
//     this.stopGeneration();
//   };

//   /**
//    * Initialize current user ID (moved from old AIService)
//    */
//   private async initializeUserId() {
//     try {
//       const response = await this.apiService.get('/api/v1/auth/me');
//       if (response && response.id) {
//         this.currentUserId = response.id;
//       }
//     } catch (error) {
//       console.error('Error getting current user ID:', error);
//     }
//   }

//   private initializeThemeService = () => {
//     if (this.services?.theme) {
//       const currentTheme = this.services.theme.getCurrentTheme();
//       this.setState({ currentTheme });
//       this.themeChangeListener = (newTheme: string) => {
//         this.setState({ currentTheme: newTheme });
//       };
//       this.services.theme.addThemeChangeListener(this.themeChangeListener);
//     }
//   };

//   private initializePageContextService = () => {
//     if (this.services?.pageContext) {
//       this.currentPageContext = this.services.pageContext.getCurrentPageContext();
//       this.pageContextUnsubscribe = this.services.pageContext.onPageContextChange(
//         (context) => {
//           this.currentPageContext = context;
//           this.fetchConversations(); // Reload conversations on page change
//         }
//       );
//     }
//   };

//   // --- Core State Logic ---

//   public updateScrollState = () => {
//     const { isNearBottom, shouldShowScrollToBottom } = this.getScrollMetrics();
//     this.setState({
//       isNearBottom,
//       showScrollToBottom: shouldShowScrollToBottom,
//     });
//   };

//   public handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
//     // Scroll state management moved to the service to inform the UI
//     const { isNearBottom, shouldShowScrollToBottom } = this.getScrollMetrics();
//     this.setState({
//       isNearBottom,
//       showScrollToBottom: shouldShowScrollToBottom,
//       isAutoScrollLocked: !isNearBottom, // Lock auto-scroll when user scrolls up
//     });
//   };

//   public handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
//     this.setState({ inputText: event.target.value });
//   };

//   public handleNewChatClick = () => {
//     this.setState({
//       selectedConversation: null,
//       conversation_id: null,
//       messages: [],
//       selectedPersona: this.state.showPersonaSelection ? this.state.selectedPersona : null,
//       error: '',
//     });
//     this.initialGreetingAdded = false; // Reset greeting flag for new chat
//     this.initialize(); // Re-run initialization to re-add greeting if needed
//   };

//   public addMessageToChat = (message: ChatMessage) => {
//     this.setState((prevState) => {
//       const newMessages = [...prevState.messages, message];
//       return { messages: newMessages };
//     });
//     this.debouncedScrollToBottom();
//   };

//   /**
//    * Handles the sending of a message/prompt (main business logic)
//    */
//   public async handleSendMessage(prompt?: string) {
//     const message = prompt || this.state.inputText.trim();
//     const { selectedModel, conversation_id, selectedPersona } = this.state;

//     if (this.state.isStreaming || this.state.isLoading || !selectedModel || !message) {
//       return;
//     }

//     this.setState({ 
//       inputText: '', 
//       isLoading: true, 
//       isStreaming: true, 
//       error: '',
//     });

//     const userMessage: ChatMessage = {
//       id: generateId('user'),
//       sender: 'user',
//       content: message,
//       timestamp: new Date().toISOString()
//     };
//     this.addMessageToChat(userMessage);

//     // Initial AI message placeholder
//     const aiMessageId = generateId('ai');
//     let aiMessage: ChatMessage = {
//       id: aiMessageId,
//       sender: 'ai',
//       content: '',
//       timestamp: new Date().toISOString()
//     };
//     this.addMessageToChat(aiMessage); // Add placeholder

//     try {
//       this.currentStreamingAbortController = new AbortController();

//       const onChunk = (chunk: string) => {
//         this.setState(prevState => {
//           const updatedMessages = prevState.messages.map(msg => {
//             if (msg.id === aiMessageId) {
//               return { ...msg, content: msg.content + chunk };
//             }
//             return msg;
//           });
//           return { messages: updatedMessages };
//         });
//         this.debouncedScrollToBottom();
//       };

//       const onConversationId = (id: string) => {
//         this.setState({ conversation_id: id });
//         this.refreshConversationsList(); // Update history list immediately
//       };

//       const success = await this.sendPrompt(
//         message,
//         selectedModel,
//         this.state.useStreaming,
//         conversation_id,
//         // Removed pageContext and webSearch/document-related parameters
//         onChunk,
//         onConversationId,
//         selectedPersona,
//         this.currentStreamingAbortController
//       );

//       if (!success) {
//          throw new Error("Generation failed without specific error.");
//       }
//     } catch (error: any) {
//       console.error('Error during AI generation:', error);
      
//       const errorMessage = error.message || 'An unknown error occurred during generation.';
//       this.setState(prevState => ({
//         // Replace or update the AI message placeholder with an error message
//         messages: prevState.messages.map(msg => 
//           msg.id === aiMessageId && msg.sender === 'ai' && msg.content === ''
//             ? { ...msg, content: `Error: ${errorMessage}` } 
//             : msg
//         ),
//         error: `Generation error: ${errorMessage}`,
//       }));
//     } finally {
//       this.currentStreamingAbortController = null;
//       this.setState({ isLoading: false, isStreaming: false });
//     }
//   }

//   // --- LLM Model and Persona Logic ---

//   private async getSettingKey(baseSetting: string): Promise<string> {
//     const pageContext = this.services?.pageContext?.getCurrentPageContext();
//     if (pageContext?.pageId) {
//       return `page_${pageContext.pageId}_${baseSetting}`;
//     }
//     return baseSetting; // Fallback to global
//   }
  
//   public async loadSavedStreamingMode(): Promise<void> {
//     try {
//       if (this.services?.settings?.getSetting) {
//         const pageSpecificKey = await this.getSettingKey(this.STREAMING_SETTING_KEY);
//         let savedValue = await this.services.settings.getSetting(pageSpecificKey);
        
//         if (savedValue === null || savedValue === undefined) {
//           savedValue = await this.services.settings.getSetting(this.STREAMING_SETTING_KEY);
//         }
        
//         if (typeof savedValue === 'boolean') {
//           this.setState({ useStreaming: savedValue });
//         }
//       }
//     } catch (error) {
//       // Use default
//     }
//   }

//   public async saveStreamingMode(enabled: boolean): Promise<void> {
//     try {
//       if (this.services?.settings?.setSetting) {
//         const pageSpecificKey = await this.getSettingKey(this.STREAMING_SETTING_KEY);
//         await this.services.settings.setSetting(pageSpecificKey, enabled);
//       }
//     } catch (error) {
//       // Error saving streaming mode
//     }
//   }

//   public toggleStreamingMode = () => {
//       const newStreamingMode = !this.state.useStreaming;
//       this.setState({ useStreaming: newStreamingMode });
//       this.saveStreamingMode(newStreamingMode);
//   }

//   public handleModelChange = (modelId: string) => {
//     const selectedModel = this.state.models.find(model => 
//         `${model.provider}_${model.serverId}_${model.name}` === modelId 
//     );
//     if (selectedModel) {
//       this.setState({ selectedModel });
//       this.broadcastModelSelection(selectedModel);
//     }
//   };

//   private broadcastModelSelection = (model: ModelInfo) => {
//     if (this.services?.event?.sendMessage) {
//       const modelInfo = {
//         type: 'model.selection',
//         content: {
//           model: { name: model.name, provider: model.provider, serverId: model.serverId },
//           timestamp: new Date().toISOString()
//         }
//       };
//       this.services.event.sendMessage('ai-prompt-chat', modelInfo.content);
//     }
//   };

//   public handlePersonaChange = async (personaId: string) => {
//     const selectedPersona = personaId 
//       ? this.state.personas.find(p => p.id === personaId) || null 
//       : null;
//     this.setState({ selectedPersona });

//     // Update conversation's persona if a chat is active
//     if (this.state.conversation_id) {
//       try {
//         await this.updateConversationPersona(this.state.conversation_id, personaId || null);
//       } catch (error) {
//         console.error('Failed to update conversation persona:', error);
//       }
//     }
//   };
  
//   public handlePersonaToggle = () => {
//     // Reset to no persona when toggling off
//     this.setState({ selectedPersona: null });
//   };


//   // --- Data Access / Repository Layer (Integrated) ---

//   /**
//    * Send prompt to AI provider and handle response (Core API layer)
//    */
//   private async sendPrompt(
//     prompt: string,
//     selectedModel: ModelInfo,
//     useStreaming: boolean,
//     conversationId: string | null,
//     onChunk: (chunk: string) => void,
//     onConversationId: (id: string) => void,
//     selectedPersona?: PersonaInfo,
//     abortController?: AbortController
//   ): Promise<boolean> {
    
//     // Stub: Removed logic for web search context and page context
    
//     const messages = [{ role: "user", content: prompt }];
//     const endpoint = '/api/v1/ai/providers/chat';

//     const requestParams: any = {
//       provider: selectedModel.provider || 'ollama',
//       settings_id: selectedModel.providerId,
//       server_id: selectedModel.serverId,
//       model: selectedModel.name,
//       messages: messages.map(msg => ({ role: msg.role || 'user', content: msg.content })),
//       params: { temperature: 0.7, max_tokens: 2048 },
//       stream: useStreaming,
//       user_id: this.currentUserId || 'current',
//       conversation_id: conversationId,
//       conversation_type: (this.services as any).conversationType || "chat",
//       persona_id: selectedPersona?.id || null, // Include persona ID
//     };

//     try {
//       // Simplified API call for demonstration of refactoring
//       // In a real implementation, this would handle streaming response processing
//       const response = await this.apiService.post(endpoint, requestParams, { signal: abortController?.signal });

//       if (response && response.conversation_id) {
//         onConversationId(response.conversation_id);
//       }
      
//       // Stubbed streaming chunk handling: assuming onChunk is called iteratively in the real service
//       if (response && response.data) {
//           onChunk(response.data.text || response.data.content || response.text || response.content);
//       }
      
//       return true;
//     } catch (error: any) {
//       if (error.name === 'AbortError') {
//         console.log('Request cancelled by user');
//         return true; // Cancelled is considered successful in terms of error handling
//       }
//       throw error;
//     }
//   }
  
//   public stopGeneration = () => {
//     if (this.currentStreamingAbortController) {
//       this.currentStreamingAbortController.abort();
//       if (this.state.conversation_id) {
//         this.cancelGeneration(this.state.conversation_id);
//       }
//     }
//     this.setState({ isStreaming: false, isLoading: false });
//   };
  
//   private async cancelGeneration(conversationId: string | null): Promise<void> {
//     if (!this.apiService || !conversationId) { return; }
//     try {
//       await this.apiService.post(`/api/v1/ai/providers/cancel`, { conversation_id: conversationId });
//     } catch (error) {
//       console.error('Error cancelling generation:', error);
//     }
//   }

//   /**
//    * Load model settings from API
//    */
//   public loadProviderSettings = async () => {
//     this.setState({ isLoadingModels: true, error: '' });
//     try {
//       const resp = await this.apiService.get('/api/v1/ai/providers/all-models');
//       const raw = (resp && (resp as any).models) || (Array.isArray(resp) ? resp : []);

//       const models: ModelInfo[] = Array.isArray(raw)
//         ? raw.map((m: any) => ({
//             name: m.name || m.id || '',
//             provider: m.provider || 'ollama',
//             providerId: PROVIDER_SETTINGS_ID_MAP[m.provider || 'ollama'] || (m.provider || 'ollama'),
//             serverName: m.server_name || m.serverName || 'Unknown Server',
//             serverId: m.server_id || m.serverId || 'unknown',
//           } as ModelInfo))
//         : [];

//       if (models.length > 0) {
//         this.setState(prevState => ({
//           models,
//           isLoadingModels: false,
//           selectedModel: prevState.selectedModel || models[0],
//         }));
//       } else {
//          this.setState({ models: [], selectedModel: null, isLoadingModels: false });
//       }
      
//     } catch (error: any) {
//       console.error('Error loading models:', error);
//       this.setState({
//         models: [],
//         selectedModel: null,
//         isLoadingModels: false,
//         error: `Error loading models: ${error.message || 'Unknown error'}`,
//       });
//     }
//   };
  
//   public loadPersonas = async () => {
//     if (this.state.personas.length > 0) {
//         return; // Use provided personas if available
//     }
    
//     this.setState({ isLoadingPersonas: true });
    
//     try {
//         const response = await this.apiService.get('/api/v1/personas');
//         const personas = response.personas || [];
//         this.setState({
//             personas: personas,
//             isLoadingPersonas: false
//         });
//     } catch (error) {
//         console.error('Error loading personas:', error);
//         this.setState({
//             personas: [],
//             isLoadingPersonas: false
//         });
//     }
//   };

//   public loadInitialData = async () => {
//     await Promise.all([
//       this.loadProviderSettings(),
//       this.fetchConversations()
//     ]);
//   }

//   public fetchConversations = async () => {
//     this.setState({ isLoadingHistory: true, error: '' });
//     try {
//       if (!this.currentUserId) {
//         // Ensure user ID is initialized before fetching conversations
//         await this.initializeUserId();
//       }
      
//       const userId = this.currentUserId;
//       if (!userId) { throw new Error('Could not get current user ID'); }
      
//       const pageContext = this.services?.pageContext?.getCurrentPageContext();
//       const params: any = {
//         skip: 0,
//         limit: 50,
//         conversation_type: (this.services as any).conversationType || "chat"
//       };
//       if (pageContext?.pageId) { params.page_id = pageContext.pageId; }
      
//       const response = await this.apiService.get(`/api/v1/users/${userId}/conversations`, { params });
      
//       // Simplified response parsing logic
//       const conversations = Array.isArray(response) 
//         ? response 
//         : (response && response.data && Array.isArray(response.data) ? response.data : []);
      
//       const validConversations: ConversationInfo[] = conversations
//         .filter((conv: any) => conv && conv.id && conv.user_id)
//         .sort((a: any, b: any) => 
//             new Date(b.updated_at || b.created_at).getTime() - 
//             new Date(a.updated_at || a.created_at).getTime()
//         );
      
//       this.setState({
//         conversations: validConversations,
//         isLoadingHistory: false
//       });
      
//       // Auto-load most recent conversation if no active chat
//       if (validConversations.length > 0 && !this.state.conversation_id) {
//           const mostRecent = validConversations[0];
//           this.setState({ selectedConversation: mostRecent });
//           this.loadConversationWithPersona(mostRecent.id);
//       }
      
//     } catch (error: any) {
//       console.error('Error loading conversations:', error);
//       this.setState({ isLoadingHistory: false, conversations: [], error: '' });
//     }
//   };
  
//   public loadConversationWithPersona = async (conversationId: string) => {
//     this.setState({ isLoadingHistory: true, error: '' });
//     try {
//       const response: ConversationWithPersona = await this.apiService.get(
//         `/api/v1/conversations/${conversationId}/with-persona`
//       );
      
//       const conversation = this.state.conversations.find(c => c.id === conversationId) || response;
      
//       this.setState({
//         messages: response.messages.map((m: any) => ({
//             id: generateId('msg'), 
//             sender: m.role || 'ai', 
//             content: m.content || '', 
//             timestamp: m.timestamp || new Date().toISOString()
//         })),
//         conversation_id: response.conversation_id,
//         selectedConversation: conversation,
//         selectedPersona: response.persona_id 
//             ? this.state.personas.find(p => p.id === response.persona_id) || null
//             : null,
//         isLoadingHistory: false,
//       });
      
//     } catch (error) {
//       console.error('Error loading conversation with persona:', error);
//       this.setState({
//           isLoadingHistory: false,
//           error: `Failed to load conversation: ${conversationId}`,
//       });
//     }
//   }

//   private async updateConversationPersona(conversationId: string, personaId: string | null): Promise<void> {
//     try {
//       await this.apiService.put(
//         `/api/v1/conversations/${conversationId}/persona`,
//         { persona_id: personaId }
//       );
//     } catch (error) {
//       console.error('Error updating conversation persona:', error);
//       throw error;
//     }
//   }
  
//   public handleRenameConversation = async (conversationId: string, newTitle: string) => {
//     this.setState({ openConversationMenu: null });
//     try {
//       await this.apiService.put(`/api/v1/conversations/${conversationId}`, { title: newTitle });
      
//       // Update state
//       this.setState(prevState => {
//         const updatedConversations = prevState.conversations.map(conv =>
//           conv.id === conversationId ? { ...conv, title: newTitle } : conv
//         );
//         const updatedSelectedConversation = prevState.selectedConversation?.id === conversationId 
//           ? { ...prevState.selectedConversation, title: newTitle } 
//           : prevState.selectedConversation;
          
//         return { conversations: updatedConversations, selectedConversation: updatedSelectedConversation };
//       });
//     } catch (error: any) {
//       throw new Error(`Error renaming conversation: ${error.message || 'Unknown error'}`);
//     }
//   };
  
//   public handleDeleteConversation = async (conversationId: string) => {
//     this.setState({ openConversationMenu: null });
//     try {
//       await this.apiService.delete(`/api/v1/conversations/${conversationId}`);
      
//       // Update state
//       this.setState(prevState => {
//         const conversations = prevState.conversations.filter(conv => conv.id !== conversationId);
//         let selectedConversation = prevState.selectedConversation?.id === conversationId ? null : prevState.selectedConversation;
//         let conversation_id = prevState.conversation_id === conversationId ? null : prevState.conversation_id;
//         let messages = prevState.conversation_id === conversationId ? [] : prevState.messages;

//         if (!conversation_id && conversations.length > 0) {
//             // Auto-select and load the next most recent conversation
//             const mostRecent = conversations[0];
//             selectedConversation = mostRecent;
//             this.loadConversationWithPersona(mostRecent.id);
//         } else if (!conversation_id) {
//             // Start a new chat if history is now empty
//             this.handleNewChatClick(); 
//         }

//         return { conversations, selectedConversation, conversation_id, messages };
//       });
      
//     } catch (error: any) {
//       throw new Error(`Error deleting conversation: ${error.message || 'Unknown error'}`);
//     }
//   }
// }
