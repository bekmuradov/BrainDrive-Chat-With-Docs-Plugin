// import React from 'react';

// import { BRAINDRIVE_CORE_API } from '../../constants';
// import { ChatViewProps, MessageRole } from '../../custom-types';
// import {ChatMessage} from '../../braindrive-plugin/pluginTypes';
// import { ChatInput } from './ChatInput';
// import { ChatMessagesList } from './ChatMessagesList';
// // import { ChatHeader } from './ChatHeader';
// import ChatHeader from '../chat-header/ChatHeader';
// import type { ModelInfo } from '../chat-header/types';
// import { fetchEventSource } from '@microsoft/fetch-event-source';
// import { PROVIDER_SETTINGS_ID_MAP, ProviderSlug } from './constants';
// import { generateId } from '../../utils';

// import { AIService } from '../../services/aiService';


// interface ChatViewState {
//   newMessage: string;
//   sending: boolean;
//   userMessageQueued: ChatMessage | null;
//   streamingAssistantMessage: ChatMessage | null;
//   optimisticMessages: ChatMessage[];

//   messages: ChatMessage[];
//   isLoading: boolean;
//   conversation_id: string | null;
//   useStreaming: boolean;
//   isStreaming: boolean;

//   // Scroll state
//   isNearBottom: boolean;
//   showScrollToBottom: boolean;
//   isAutoScrollLocked: boolean;

//   error: null | string;

//   // Model selection state
//   models: ModelInfo[];
//   selectedModel: ModelInfo | null;
//   isLoadingModels: boolean;
//   showModelSelection: boolean;
//   pendingModelKey: null | string;
//   pendingModelSnapshot: ModelInfo | null;
// }

// // Receieve collection selected event
// export class ChatView extends React.Component<ChatViewProps, ChatViewState> {
//   private messagesEndRef: React.RefObject<HTMLDivElement>;
//   private abortController: AbortController | null = null;
//   private currentStreamingMessageId: string | null = null;

//   private currentStreamingAbortController: AbortController | null = null;

//   private aiService: AIService | null = null; 

//   // Keep the live edge comfortably in view instead of snapping flush bottom
//   private readonly SCROLL_ANCHOR_OFFSET = 420;
//   private readonly MIN_VISIBLE_LAST_MESSAGE_HEIGHT = 64;
//   private readonly NEAR_BOTTOM_EPSILON = 24;
//   private isProgrammaticScroll = false;

//   private chatHistoryRef = React.createRef<HTMLDivElement>();
//   private inputRef = React.createRef<HTMLTextAreaElement>();

//   constructor(props: ChatViewProps) {
//     super(props);
//     this.state = {
//       newMessage: '',
//       sending: false,
//       userMessageQueued: null,
//       streamingAssistantMessage: null,
//       optimisticMessages: [],

//       isLoading: false,
//       messages: [],
//       conversation_id: null,

//       // Model selection state
//       models: [],
//       isLoadingModels: true,
//       error: null,

//       useStreaming: true,
//       isStreaming: false,

//       // Scroll state
//       isNearBottom: true,
//       showScrollToBottom: false,
//       isAutoScrollLocked: false,

//       selectedModel: null,
//       showModelSelection: true,
//       pendingModelKey: null,
//       pendingModelSnapshot: null,
//     };

//     this.aiService = new AIService(props.apiService);

//     this.messagesEndRef = React.createRef();
    
//     this.stopStreaming = this.stopStreaming.bind(this);
//     this.scrollToBottom = this.scrollToBottom.bind(this);
//     this.createOptimisticMessage = this.createOptimisticMessage.bind(this);
//     this.handleSendMessage = this.handleSendMessage.bind(this);
//     this.handleSendStreamingMessage = this.handleSendStreamingMessage.bind(this);
//     this.handleSendStreamingRequest = this.handleSendStreamingRequest.bind(this);
//     this.updateStreamingMessage = this.updateStreamingMessage.bind(this);
//     this.handleStreamComplete = this.handleStreamComplete.bind(this);
//     this.handleStreamError = this.handleStreamError.bind(this);
//     this.syncWithServer = this.syncWithServer.bind(this);

//     this.loadInitialData = this.loadInitialData.bind(this);
//     this.loadProviderSettings = this.loadProviderSettings.bind(this);
//   }

//   componentWillUnmount() {
//     this.stopStreaming();
//   }

//   stopStreaming() {
//     if (this.abortController) {
//       this.abortController.abort();
//       this.abortController = null;
//     }
//   }

//   componentDidMount() {
//     this.loadInitialData();
//     this.scrollToBottom();
//   }

//   // componentDidUpdate(prevProps: ChatViewProps) {
//   //   if (prevProps.messages !== this.props.messages) {
//   //     this.scrollToBottom();
//   //   }
//   // }
//   componentDidUpdate(prevProps: ChatViewProps, prevState: ChatViewState) {
//     // Scroll when messages change OR when streaming message updates
//     if (prevProps.messages !== this.props.messages || 
//         prevState.streamingAssistantMessage !== this.state.streamingAssistantMessage) {
//       this.scrollToBottom();
//     }
//   }

//   scrollToBottom() {
//     this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }

//   /**
//    * Load initial data (models)
//    */
//   loadInitialData = async () => {
//     await Promise.all([
//       this.loadProviderSettings(),
//     ]);
//   }

//   createOptimisticMessage = (userMessage: string, role: MessageRole, isStreaming = false): ChatMessage => {
//     const timestamp = new Date().toISOString();
//     return {
//       id: `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
//       session_id: this.props.session.id,
//       created_at: timestamp,
//       user_message: userMessage,
//       assistant_response: '',
//       retrieved_chunks: [],
//       isStreaming,
//     };
//   }

//   async handleSendMessage() {
//     const { newMessage } = this.state;
//     const { session, onMessageSent, setError } = this.props;
//     if (!newMessage.trim()) return;

//     this.setState({ sending: true });
//     const messageToSend = newMessage;
//     this.setState({ newMessage: '' });

//     try {
//       const response = await fetch(`${BRAINDRIVE_CORE_API}/chat/message`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           session_id: session.id,
//           user_message: messageToSend,
//         }),
//       });

//       if (!response.ok) throw new Error('Failed to send message');
//       onMessageSent();
//     } catch (err: any) {
//       setError(err.message);
//       this.setState({ newMessage: messageToSend });
//     } finally {
//       this.setState({ sending: false });
//     }
//   }

//   async handleSendStreamingMessage() {
//     console.log('handleSendStreamingMessage triggered');
//     const { newMessage } = this.state;
//     const { session, onMessageSent, setError } = this.props;

//     if (!newMessage.trim()) {
//       console.log('No message to sent');
//       return;
//     };

//     this.stopStreaming();

//     this.setState({ sending: true });
//     const messageToSend = newMessage;
//     this.setState({ newMessage: '' });

//     // Create initial streaming assistant message
//     const initialAssistantMessage = this.createOptimisticMessage(messageToSend, MessageRole.USER, true);
//     this.currentStreamingMessageId = initialAssistantMessage.id;

//     this.setState(prev => ({
//       optimisticMessages: [...prev.optimisticMessages, initialAssistantMessage]
//     }));

//     try {
//       this.abortController = new AbortController();
//       let fullAssistantResponse = '';
//       let finalRetrievedChunks: any[] = [];

//       await fetchEventSource(`${BRAINDRIVE_CORE_API}/chat/stream`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           session_id: session.id,
//           user_message: messageToSend,
//         }),
//         signal: this.abortController.signal,
//         onopen: async (response) => {
//           if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
//             console.log('SSE connection opened successfully.');
//             // No need to set state here, initial state for streamingAssistantMessage is already set
//           } else if (!response.ok) {
//             const errorText = await response.text();
//             console.error('SSE connection failed to open:', response.status, response.statusText, errorText);
//             throw new Error(`Failed to connect to SSE: ${response.status} ${response.statusText} - ${errorText}`);
//           } else {
//             console.error('Server did not return text/event-stream content type:', response.headers.get('content-type'));
//             throw new Error('Server did not return text/event-stream content type. Check backend.');
//           }
//         },
//         onmessage: (event) => {
//           try {
//             const data = JSON.parse(event.data);
          
//             if (data.error) {
//               throw new Error(data.error);
//             }

//             if (data.complete && data.message_id && data.created_at) {
//               this.handleStreamComplete(data.message_id, data.created_at);
//               return;
//             }

//             // Accumulate response parts
//             if (data.response) {
//               fullAssistantResponse += data.response;
//             }

//             // Update retrieved chunks if provided
//             if (data.retrieved_chunks && Array.isArray(data.retrieved_chunks)) {
//               finalRetrievedChunks = data.retrieved_chunks;
//             }

//             // Update the streaming message in optimistic messages
//             this.updateStreamingMessage(fullAssistantResponse, finalRetrievedChunks);

//           } catch (parseError) {
//             console.error('Error parsing SSE event data or during onmessage processing:', parseError, 'Event data was:', event.data);
//             console.error('Error parsing SSE event data:', parseError);
//             this.handleStreamError(messageToSend, 'Error processing streaming response data.');
//             setError('Error processing streaming response data.');
//           }
//         },
//         onerror: (error) => {
//           console.error('fetchEventSource error:', error);
//           this.handleStreamError(messageToSend, 'Error processing streaming response data.');
//           if (error.name === 'AbortError') {
//             console.log('Streaming was aborted by user or component unmount.');
//           } else {
//             setError(error.message || 'Connection error occurred during streaming.');
//           }
//         },
//         onclose: () => {
//           console.log('SSE connection closed by server or client.');
//           // This might fire after `complete` is handled, or on unexpected close.
//           // No explicit setState needed here if 'complete' already handles cleanup.
//         },
//         openWhenHidden: true, // Keep connection open even if browser tab is in background
//       });

//     } catch (err: any) {
//       console.error('Stream setup error:', err);
//       this.handleStreamError(messageToSend, err.message || 'Failed to start streaming');
//       if (err.name === 'AbortError') {
//         console.log('Stream was aborted');
//       } else {
//         setError(err.message || 'Failed to start streaming');
//       }
//     }
//   }

//   handleSendStreamingRequest = async () => {
//     const { newMessage } = this.state;
//     const { session, setError, apiService } = this.props;
    
//     if (!apiService || !apiService.postStreaming) {
//       // falback in case api service is undefined
//       console.log("falling back to in app streaming request")
//       await this.handleSendStreamingMessage();
//       return;
//     }

//     if (!newMessage.trim()) {
//       return;
//     };

//     this.stopStreaming();
//     this.setState({ sending: true });
//     const messageToSend = newMessage;
//     this.setState({ newMessage: '' });

//     // Create initial streaming assistant message
//     const initialAssistantMessage = this.createOptimisticMessage(messageToSend, MessageRole.USER, true);
//     this.currentStreamingMessageId = initialAssistantMessage.id;

//     this.setState(prev => ({
//       optimisticMessages: [...prev.optimisticMessages, initialAssistantMessage]
//     }));

//     try {
//       this.abortController = new AbortController();
//       let fullAssistantResponse = '';
//       let finalRetrievedChunks: any[] = [];

//       const onChunk = (chunk: string) => {
//         try {
//           const data = JSON.parse(chunk);
          
//           if (data.error) {
//             throw new Error(data.error);
//           }

//           if (data.complete && data.message_id && data.created_at) {
//             this.handleStreamComplete(data.message_id, data.created_at);
//             return;
//           }

//           // Accumulate response parts
//           if (data.response) {
//             fullAssistantResponse += data.response;
//           }

//           // Update retrieved chunks if provided
//           if (data.retrieved_chunks && Array.isArray(data.retrieved_chunks)) {
//             finalRetrievedChunks = data.retrieved_chunks;
//           }

//           // Update the streaming message in optimistic messages
//           this.updateStreamingMessage(fullAssistantResponse, finalRetrievedChunks);

//         } catch (parseError) {
//           console.error('Error parsing SSE event data:', parseError);
//           this.handleStreamError(messageToSend, 'Error processing streaming response data.');
//         }
//       };

//       await apiService.postStreaming(
//         `${BRAINDRIVE_CORE_API}/chat/stream`,
//         {
//           session_id: session.id,
//           user_message: messageToSend,
//         },
//         onChunk,
//       )
//     } catch (err: any) {
//       this.handleStreamError(messageToSend, err.message || 'Failed to start streaming');
//     }
//   }

//   updateStreamingMessage = (content: string, retrievedChunks: any[]) => {
//     if (!this.currentStreamingMessageId) return;

//     this.setState((prev) => ({
//       optimisticMessages: prev.optimisticMessages.map(msg => 
//         msg.id === this.currentStreamingMessageId
//           ? {
//               ...msg,
//               assistant_response: content,
//               retrieved_chunks: retrievedChunks,
//             }
//           : msg
//       )
//     }));
//   }

//   handleStreamComplete = (savedMessageId: string, savedCreatedAt: string) => {
//     this.stopStreaming();
//     this.setState({ sending: false });
    
//     // Convert streaming message to final message by removing streaming metadata
//     this.setState((prev) => ({
//       optimisticMessages: prev.optimisticMessages.map(msg => 
//         msg.id === this.currentStreamingMessageId
//           ? {
//             ...msg,
//             id: savedMessageId,
//             created_at: savedCreatedAt,
//             metadata: undefined
//           }
//           : msg
//       )
//     }));

//     // Sync with server after a brief delay to ensure smooth UX
//     setTimeout(() => {
//       this.syncWithServer();
//     }, 500);
//   }

//   handleStreamError = (originalMessage: string, errorMessage: string) => {
//     this.stopStreaming();
//     this.setState({
//       sending: false,
//       optimisticMessages: [], // Clear all optimistic messages on error
//       newMessage: originalMessage, // Restore original message
//     });
//     this.props.setError(errorMessage);
//   }

//   syncWithServer = () => {
//     // Clear optimistic messages and trigger server sync
//     this.setState({ optimisticMessages: [] });
//     this.props.onMessageSent();
//   }

//   /**
//    * Load provider settings and models
//    */
//   loadProviderSettings = async () => {
//     this.setState({ isLoadingModels: true, error: '' });

//     if (!this.props.apiService) {
//       this.setState({
//         isLoadingModels: false,
//         error: 'API service not available'
//       });
//       return;
//     }

//     try {
//       const resp = await this.props.apiService.get('/api/v1/ai/providers/all-models');
//       const raw = (resp && (resp as any).models)
//         || (resp && (resp as any).data && (resp as any).data.models)
//         || (Array.isArray(resp) ? resp : []);

//       const models: ModelInfo[] = Array.isArray(raw)
//         ? raw.map((m: any) => {
//             const provider: ProviderSlug = m.provider || 'ollama';
//             const providerId = PROVIDER_SETTINGS_ID_MAP[provider] || provider;
//             const serverId = m.server_id || m.serverId || 'unknown';
//             const serverName = m.server_name || m.serverName || 'Unknown Server';
//             const name = m.name || m.id || '';
//             return {
//               name,
//               provider,
//               providerId,
//               serverName,
//               serverId,
//             } as ModelInfo;
//           })
//         : [];

//       if (models.length > 0) {
//         const shouldBroadcastDefault = !this.state.pendingModelKey && !this.state.selectedModel;

//         this.setState(prevState => {
//           if (!prevState.pendingModelKey && !prevState.selectedModel && models.length > 0) {
//             return {
//               models,
//               isLoadingModels: false,
//               selectedModel: models[0],
//             };
//           }

//           return {
//             models,
//             isLoadingModels: false,
//             selectedModel: prevState.selectedModel,
//           };
//         }, () => {
//           if (this.state.pendingModelKey) {
//             this.resolvePendingModelSelection();
//           } else if (shouldBroadcastDefault && this.state.selectedModel) {
//             this.broadcastModelSelection(this.state.selectedModel);
//           }
//         });

//         return;
//       }

//       // Fallback: Try Ollama-only via settings + /api/v1/ollama/models
//       try {
//         const settingsResp = await this.props.apiService.get('/api/v1/settings/instances', {
//           params: {
//             definition_id: 'ollama_servers_settings',
//             scope: 'user',
//             user_id: 'current',
//           },
//         });

//         let settingsData: any = null;
//         if (Array.isArray(settingsResp) && settingsResp.length > 0) settingsData = settingsResp[0];
//         else if (settingsResp && typeof settingsResp === 'object') {
//           const obj = settingsResp as any;
//           if (obj.data) settingsData = Array.isArray(obj.data) ? obj.data[0] : obj.data;
//           else settingsData = settingsResp;
//         }

//         const fallbackModels: ModelInfo[] = [];
//         if (settingsData && settingsData.value) {
//           const parsedValue = typeof settingsData.value === 'string'
//             ? JSON.parse(settingsData.value)
//             : settingsData.value;
//           const servers = Array.isArray(parsedValue?.servers) ? parsedValue.servers : [];
//           for (const server of servers) {
//             try {
//               const params: Record<string, string> = {
//                 server_url: encodeURIComponent(server.serverAddress),
//                 settings_id: 'ollama_servers_settings',
//                 server_id: server.id,
//               };
//               if (server.apiKey) params.api_key = server.apiKey;
//               const modelResponse = await this.props.apiService.get('/api/v1/ollama/models', { params });
//               const serverModels = Array.isArray(modelResponse) ? modelResponse : [];
//               for (const m of serverModels) {
//                 fallbackModels.push({
//                   name: m.name,
//                   provider: 'ollama',
//                   providerId: 'ollama_servers_settings',
//                   serverName: server.serverName,
//                   serverId: server.id,
//                 });
//               }
//             } catch (innerErr) {
//               console.error('Fallback: error loading Ollama models for server', server?.serverName, innerErr);
//             }
//           }
//         }

//         if (fallbackModels.length > 0) {
//           const shouldBroadcastDefault = !this.state.pendingModelKey && !this.state.selectedModel;

//           this.setState(prevState => {
//             if (!prevState.pendingModelKey && !prevState.selectedModel && fallbackModels.length > 0) {
//               return {
//                 models: fallbackModels,
//                 isLoadingModels: false,
//                 selectedModel: fallbackModels[0],
//               };
//             }

//             return {
//               models: fallbackModels,
//               isLoadingModels: false,
//               selectedModel: prevState.selectedModel,
//             };
//           }, () => {
//             if (this.state.pendingModelKey) {
//               this.resolvePendingModelSelection();
//             } else if (shouldBroadcastDefault && this.state.selectedModel) {
//               this.broadcastModelSelection(this.state.selectedModel);
//             }
//           });

//           return;
//         }

//         this.setState({
//           models: fallbackModels,
//           isLoadingModels: false,
//         }, () => {
//           if (this.state.pendingModelKey) {
//             this.resolvePendingModelSelection();
//           }
//         });
//         return;
//       } catch (fallbackErr) {
//         console.error('Fallback: error loading Ollama settings/models:', fallbackErr);
//         this.setState({ models: [], selectedModel: null, isLoadingModels: false });
//       }
//     } catch (error: any) {
//       console.error('Error loading models from all providers:', error);
//       this.setState({
//         models: [],
//         selectedModel: null,
//         isLoadingModels: false,
//         error: `Error loading models: ${error.message || 'Unknown error'}`,
//       });
//     }
//   };

//   /**
//    * Handle model selection change
//    */
//   handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
//     const modelId = event.target.value;
//     const selectedModel = this.state.models.find(model => 
//       `${model.provider}_${model.serverId}_${model.name}` === modelId
//     );
    
//     if (selectedModel) {
//       this.setState({
//         selectedModel,
//         pendingModelKey: null,
//         pendingModelSnapshot: null
//       }, () => {
//         this.broadcastModelSelection(selectedModel);
//       });
//     }
//   };

//   /**
//    * Broadcast model selection event
//    */
//   broadcastModelSelection = (model: ModelInfo) => {
//     if (!this.props.eventService) {
//       return;
//     }

//     // Create model selection message
//     const modelInfo = {
//       type: 'model.selection',
//       content: {
//         model: {
//           name: model.name,
//           provider: model.provider,
//           providerId: model.providerId,
//           serverName: model.serverName,
//           serverId: model.serverId
//         },
//         timestamp: new Date().toISOString()
//       }
//     };
    
//     // Send to event system
//     this.props.eventService.sendMessage('ai-prompt-chat', modelInfo.content);
//   };

//   private getModelKey(modelName?: string | null, serverName?: string | null) {
//     const safeModel = (modelName || '').trim();
//     const safeServer = (serverName || '').trim();
//     return `${safeServer}:::${safeModel}`;
//   }

//   private getModelKeyFromInfo(model: ModelInfo | null) {
//     if (!model) {
//       return '';
//     }
//     return this.getModelKey(model.name, model.serverName);
//   }

//   private resolvePendingModelSelection = () => {
//     const { pendingModelKey, models, selectedModel, pendingModelSnapshot } = this.state;

//     if (!pendingModelKey) {
//       if (pendingModelSnapshot) {
//         this.setState({ pendingModelSnapshot: null });
//       }
//       return;
//     }

//     const matchingModel = models.find(model => this.getModelKeyFromInfo(model) === pendingModelKey);

//     if (matchingModel) {
//       const selectedKey = this.getModelKeyFromInfo(selectedModel);
//       const isSameKey = selectedKey === pendingModelKey;
//       const selectedIsTemporary = Boolean(selectedModel?.isTemporary);
//       const matchingIsTemporary = Boolean(matchingModel.isTemporary);

//       if (!selectedModel || !isSameKey || (selectedIsTemporary && !matchingIsTemporary)) {
//         this.setState({
//           selectedModel: matchingModel,
//           pendingModelKey: matchingIsTemporary ? pendingModelKey : null,
//           pendingModelSnapshot: matchingIsTemporary ? pendingModelSnapshot : null
//         }, () => {
//           if (!matchingIsTemporary) {
//             this.broadcastModelSelection(matchingModel);
//           }
//         });
//         return;
//       }

//       if (!matchingIsTemporary) {
//         this.setState({ pendingModelKey: null, pendingModelSnapshot: null });
//       }

//       return;
//     }

//     if (pendingModelSnapshot && !models.some(model => this.getModelKeyFromInfo(model) === pendingModelKey)) {
//       this.setState(prevState => ({
//         models: [...prevState.models, pendingModelSnapshot]
//       }));
//     }
//   };

//   /**
//    * Handle sending a message
//    */
//   handleSendMessage = () => {
//     const { newMessage } = this.state;
    
//     // Don't send empty messages
//     if (!newMessage.trim() || this.state.isLoading) return;
    
//     // Add user message to chat (will be updated with search context if web search is enabled)
//     const userMessageId = generateId('user');
//     const userMessage: ChatMessage = {
//       id: userMessageId,
//       sender: 'user',
//       content: newMessage.trim(),
//       timestamp: new Date().toISOString(),
//       isEditable: true
//     };
    
//     // this.addMessageToChat(userMessage);
    
//     // Clear input
//     this.setState({ newMessage: '' });
    
//     // Reset textarea height
//     // if (this.inputRef.current) {
//     //   this.inputRef.current.style.height = 'auto';
//     // }
    
//     // Send to AI and get response
//     this.sendPromptToAI(userMessage.content, userMessageId);
    
//     // Auto-close accordions on first message
//     // this.autoCloseAccordionsOnFirstMessage();
//   };

//   /**
//    * Clean up message content by removing excessive newlines and search/document context
//    */
//   cleanMessageContent = (content: string): string => {
//     if (!content) return content;
    
//     let cleanedContent = content
//       .replace(/\r\n/g, '\n')      // Normalize line endings
//       .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2 (paragraph break)
//       .trim();                     // Remove leading/trailing whitespace
    
//     // Remove web search context that might have been stored in old messages
//     cleanedContent = cleanedContent.replace(/\n\n\[WEB SEARCH CONTEXT[^]*$/, '');
    
//     // Remove document context that might have been stored in old messages
//     cleanedContent = cleanedContent.replace(/^Document Context:[^]*?\n\nUser Question: /, '');
//     cleanedContent = cleanedContent.replace(/^[^]*?\n\nUser Question: /, '');
    
//     return cleanedContent.trim();
//   };

//   /**
//    * Add a new message to the chat history
//    */
//   addMessageToChat = (message: ChatMessage) => {
//     // Clean up the message content
//     const cleanedMessage = {
//       ...message,
//       content: this.cleanMessageContent(message.content)
//     };
    
//     console.log(`💬 Adding message to chat: ${cleanedMessage.sender} - ${cleanedMessage.content.substring(0, 50)}...`);
//     this.setState(prevState => ({
//       messages: [...prevState.messages, cleanedMessage]
//     }), () => {
//       console.log(`✅ Message added. Total messages: ${this.state.messages.length}`);
//     });
//   }

//   /**
//    * Send prompt to AI provider and handle response
//    */
//   sendPromptToAI = async (prompt: string, userMessageId?: string) => {
//     if (!this.aiService || !this.props.apiService) {
//       this.setState({ error: 'API service not available' });
//       return;
//     }

//     if (!this.state.selectedModel) {
//       this.setState({ error: 'Please select a model first' });
//       return;
//     }
    
//     console.log(`🚀 Sending prompt to AI with conversation_id: ${this.state.conversation_id || 'null (will create new)'}`);
    
//     try {
//       // Set loading and streaming state
//       this.setState({ isLoading: true, isStreaming: true, error: '' });
      
//       // Create abort controller for streaming
//       this.currentStreamingAbortController = new AbortController();
      
//       // Perform web search if enabled
//       let enhancedPrompt = prompt;
      
//       // Add document context if available (only for AI, not for chat history)
//       // if (this.state.documentContext) {
//       //   enhancedPrompt = `${this.state.documentContext}\n\nUser Question: ${prompt}`;
//       // }
      
//       // Create placeholder for AI response
//       const placeholderId = generateId('ai');
      
//       this.addMessageToChat({
//         id: placeholderId,
//         sender: 'ai',
//         content: '',
//         timestamp: new Date().toISOString(),
//         isStreaming: true
//       });
      
//       // Track the current response content for proper abort handling
//       let currentResponseContent = '';
      
//       // Handle streaming chunks
//       const onChunk = (chunk: string) => {
//         currentResponseContent += chunk;
//         this.setState(prevState => {
//           const updatedMessages = prevState.messages.map(message => {
//             if (message.id === placeholderId) {
//               return {
//                 ...message,
//                 content: this.cleanMessageContent(currentResponseContent)
//               };
//             }
//             return message;
//           });
          
//           return { ...prevState, messages: updatedMessages };
//         }, () => {
//           if (!this.state.isAutoScrollLocked) {
//             this.scrollToBottom();
//           } else {
//             this.updateScrollState();
//           }
//         });
//       };
      
//       // Handle conversation ID updates
//       const onConversationId = (id: string) => {
//         console.log(`🔄 Conversation ID received: ${id}`);
//         this.setState({ conversation_id: id }, () => {
//           console.log(`✅ Conversation ID updated in state: ${this.state.conversation_id}`);
//           // Refresh conversations list after a small delay to ensure backend has processed the conversation
//           setTimeout(() => {
//             this.refreshConversationsList();
//           }, 1000);
//         });
//       };
      
//       // Get current page context to pass to AI service
//       const pageContext = this.getCurrentPageContext();
      
//       // Send prompt to AI
//       await this.aiService.sendPrompt(
//         enhancedPrompt,
//         this.state.selectedModel,
//         this.state.useStreaming,
//         this.state.conversation_id,
//         this.props.conversationType || "chat",
//         onChunk,
//         onConversationId,
//         pageContext,
//         this.state.selectedPersona || undefined,
//         this.currentStreamingAbortController
//       );
      
//       const shouldScrollToBottom = this.state.isNearBottom || this.isUserNearBottom();

//       // Finalize the message
//       this.setState(prevState => {
//         console.log('✅ Finalizing message with ID:', placeholderId);
        
//         const updatedMessages = prevState.messages.map(message => {
//           if (message.id === placeholderId) {
//             const shouldPreserveContinue = message.isCutOff;
//             console.log(`✅ Finalizing message ${message.id}, isCutOff: ${message.isCutOff}, preserving canContinue: ${shouldPreserveContinue}`);
            
//             return {
//               ...message,
//               isStreaming: false,
//               canRegenerate: true,
//               // Preserve canContinue state if message was cut off, otherwise set to false
//               canContinue: shouldPreserveContinue ? true : false
//             };
//           }
//           return message;
//         });
        
//         return {
//           messages: updatedMessages,
//           isLoading: false,
//           isStreaming: false
//         };
//       }, () => {
//         console.log(`✅ Message finalized. Total messages: ${this.state.messages.length}`);
//         if (shouldScrollToBottom) {
//           this.scrollToBottom();
//         } else {
//           this.updateScrollState();
//         }
//         // Focus the input box after response is completed
//         this.focusInput();
        
//         // Refresh conversations list after the message is complete to include the new conversation
//         if (this.state.conversation_id) {
//           this.refreshConversationsList();
//         }
//       });
      
//       // Clear abort controller
//       this.currentStreamingAbortController = null;
      
//     } catch (error) {
//       // Check if this was an abort error
//       if (error instanceof Error && error.name === 'AbortError') {
//         // Request was aborted, keep the partial response and mark it as stopped
//         this.setState(prevState => ({
//           isLoading: false,
//           isStreaming: false,
//           messages: prevState.messages.map(message => ({
//             ...message,
//             isStreaming: false,
//             canRegenerate: true,
//             // Only set canContinue and isCutOff for messages that are currently streaming
//             canContinue: message.isStreaming ? true : message.canContinue,
//             isCutOff: message.isStreaming ? true : message.isCutOff
//           }))
//         }), () => {
//           this.focusInput();
//         });
//       } else {
//         // Real error occurred
//         this.setState({
//           isLoading: false,
//           isStreaming: false,
//           error: `Error sending prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
//         }, () => {
//           // Focus input even on error so user can try again
//           this.focusInput();
//         });
//       }
      
//       // Clear abort controller
//       this.currentStreamingAbortController = null;
//     }
//   };

//   /**
//    * Check if user is near the bottom of the chat
//    */
//   isUserNearBottom = () => {
//     if (!this.chatHistoryRef.current) return true;

//     const container = this.chatHistoryRef.current;
//     const { scrollTop, scrollHeight, clientHeight } = container;
//     const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
//     const dynamicOffset = this.getEffectiveAnchorOffset(container);
//     const threshold = Math.max(dynamicOffset, this.NEAR_BOTTOM_EPSILON);

//     return distanceFromBottom <= threshold;
//   };

//   /**
//    * Update scroll state based on current position
//    */
//   updateScrollState = (options: { fromUser?: boolean } = {}) => {
//     if (!this.chatHistoryRef.current) return;

//     const { fromUser = false } = options;
//     const container = this.chatHistoryRef.current;
//     const { scrollTop, scrollHeight, clientHeight } = container;
//     const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
//     const dynamicOffset = this.getEffectiveAnchorOffset(container);
//     const nearBottomThreshold = Math.max(dynamicOffset, this.NEAR_BOTTOM_EPSILON);
//     const isNearBottom = distanceFromBottom <= nearBottomThreshold;
//     const showScrollToBottom = !isNearBottom;

//     this.setState(prevState => {
//       let isAutoScrollLocked = prevState.isAutoScrollLocked;

//       if (fromUser) {
//         isAutoScrollLocked = !isNearBottom;
//       } else if (isNearBottom && prevState.isAutoScrollLocked) {
//         isAutoScrollLocked = false;
//       }

//       if (
//         prevState.isNearBottom === isNearBottom &&
//         prevState.showScrollToBottom === showScrollToBottom &&
//         prevState.isAutoScrollLocked === isAutoScrollLocked
//       ) {
//         return null;
//       }

//       return {
//         isNearBottom,
//         showScrollToBottom,
//         isAutoScrollLocked
//       };
//     });
//   };

//   /**
//    * Handle scroll events to track user scroll position
//    */
//   handleScroll = () => {
//     if (this.isProgrammaticScroll) {
//       this.updateScrollState();
//       return;
//     }

//     this.updateScrollState({ fromUser: true });
//   };

//   /**
//    * Scroll the chat history to the bottom while respecting the anchor offset
//    */
//   scrollToBottom = (options: ScrollToBottomOptions = {}) => {
//     if (!this.chatHistoryRef.current) return;

//     const { behavior = 'auto', manual = false } = options;
//     const container = this.chatHistoryRef.current;

//     const dynamicOffset = this.getEffectiveAnchorOffset(container);
//     const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
//     const targetTop = Math.max(maxScrollTop - dynamicOffset, 0);

//     this.isProgrammaticScroll = true;

//     if (typeof container.scrollTo === 'function') {
//       try {
//         container.scrollTo({ top: targetTop, behavior });
//       } catch (_err) {
//         container.scrollTop = targetTop;
//       }
//     } else {
//       container.scrollTop = targetTop;
//     }

//     if (manual && this.state.isAutoScrollLocked) {
//       this.setState({ isAutoScrollLocked: false });
//     }

//     const finalize = () => {
//       this.isProgrammaticScroll = false;
//       this.updateScrollState({ fromUser: manual });
//     };

//     if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
//       window.requestAnimationFrame(finalize);
//     } else {
//       setTimeout(finalize, 0);
//     }
//   }

//   render() {
//     const { session, messages } = this.props;
//     const {
//       newMessage,
//       sending,
//       optimisticMessages,
//       models,
//       selectedModel,
//       isLoadingModels,
//       showModelSelection,
      
//     } = this.state;

//     const displayMessages = [...messages, ...optimisticMessages];

//     return (
//       <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
//         {/* Chat Header */}
//         {/* <ChatHeader sessionName={session.name} messagesLenght={messages.length} /> */}
//         {/* Chat header with controls and history dropdown */}
//         <ChatHeader
//           models={models}
//           selectedModel={selectedModel}
//           isLoadingModels={isLoadingModels}
//           onModelChange={this.handleModelChange}
//           showModelSelection={showModelSelection}
//         />

//         {/* Messages */}
//         <ChatMessagesList messages={displayMessages} sending={sending} />

//         {/* <div ref={this.messagesEndRef} /> */}

//         {/* Message Input */}
//         <ChatInput
//           newMessage={newMessage}
//           onChange={(newInput) => this.setState({ newMessage: newInput })}
//           onMessageSend={this.handleSendStreamingMessage}
//           sending={sending}
//         />
//       </div>
//     );
//   }
// }
