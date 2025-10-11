// import React from 'react';

// import {
//   ChatServiceState,
//   CollectionChatViewProps,
//   ModelInfo,
//   PersonaInfo,
//   ScrollToBottomOptions,
// } from './collectionChatTypes';
// import { CollectionChatService } from './CollectionChatService';

// // --- Stubbed Imports (Replace with actual paths in your project) ---
// const debounce = <T extends (...args: any[]) => void>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
//     let timeout: ReturnType<typeof setTimeout>;
//     return (...args: Parameters<T>) => {
//         clearTimeout(timeout);
//         timeout = setTimeout(() => func(...args), delay);
//     };
// };
// const UI_CONFIG = {
//     SCROLL_DEBOUNCE_DELAY: 150,
// };
// const ChatHeader = (props: any) => <div>{/* Stubbed ChatHeader */}</div>;
// const ChatHistory = (props: any) => <div>{/* Stubbed ChatHistory */}</div>;
// const ChatInput = (props: any) => <div>{/* Stubbed ChatInput */}</div>;
// const LoadingStates = (props: any) => <div>{/* Stubbed LoadingStates */}</div>;


// /**
//  * CollectionChatViewShell: The thin Presenter component for the chat feature.
//  * It manages UI rendering and delegates all business logic to CollectionChatService.
//  */
// class CollectionChatViewShell extends React.Component<CollectionChatViewProps, ChatServiceState> {
//   private chatHistoryRef = React.createRef<HTMLDivElement>();
//   private inputRef = React.createRef<HTMLTextAreaElement>();
//   private service: CollectionChatService;
//   private readonly SCROLL_ANCHOR_OFFSET = 420;
//   private readonly NEAR_BOTTOM_EPSILON = 24;
  
//   constructor(props: CollectionChatViewProps) {
//     super(props);
    
//     // --- Service Injection and Initialization ---
    
//     // The setState callback is how the Service updates the Presenter's state
//     const setStateCallback = (update: Partial<ChatServiceState>) => {
//       this.setState(update as ChatServiceState);
//     };
    
//     // DOM-related methods injected into the Service
//     const performScrollToBottom = (options?: ScrollToBottomOptions) => {
//         const historyEl = this.chatHistoryRef.current;
//         if (historyEl) {
//             historyEl.scrollTo({
//                 top: historyEl.scrollHeight,
//                 behavior: options?.behavior || 'smooth',
//             });
//         }
//     };
    
//     const getScrollMetrics = () => {
//         const el = this.chatHistoryRef.current;
//         if (!el) { return { isNearBottom: true, shouldShowScrollToBottom: false }; }
        
//         // Logic for determining if user is near the bottom
//         const isNearBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + this.NEAR_BOTTOM_EPSILON;
        
//         // Logic for showing the scroll button
//         const shouldShowScrollToBottom = el.scrollHeight > el.clientHeight && el.scrollTop < el.scrollHeight - this.SCROLL_ANCHOR_OFFSET;
        
//         return { isNearBottom, shouldShowScrollToBottom };
//     }

//     this.service = new CollectionChatService(
//       props,
//       setStateCallback,
//       performScrollToBottom,
//       getScrollMetrics
//     );

//     // Initialize component state from the service's initial state
//     this.state = this.service.state;

//     // Bind event handlers that delegate to the service
//     this.handleScroll = this.service.handleScroll.bind(this.service);
//     this.handleSendMessage = this.service.handleSendMessage.bind(this.service);
//     this.handleInputChange = this.service.handleInputChange.bind(this.service);
//     this.stopGeneration = this.service.stopGeneration.bind(this.service);
//     this.handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => this.service.handleModelChange(e.target.value);
//     this.handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => this.service.handlePersonaChange(e.target.value);
//     this.handlePersonaToggle = this.service.handlePersonaToggle.bind(this.service);
//   }

//   componentDidMount() {
//     this.service.initialize();
    
//     // Add global key event listener for ESC key (UI concern)
//     document.addEventListener('keydown', this.handleGlobalKeyPress);
    
//     // Add click outside listener to close conversation menu (UI concern)
//     document.addEventListener('mousedown', this.handleClickOutside);
//   }

//   componentDidUpdate(prevProps: CollectionChatViewProps, prevState: ChatServiceState) {
//     const messagesChanged = prevState.messages !== this.state.messages;
    
//     if (messagesChanged && !this.state.isAutoScrollLocked) {
//         // Debounced scroll down when new message arrives and scroll is not locked
//         (this.service as any).debouncedScrollToBottom();
//     } else if (messagesChanged) {
//         // Update the scroll state (show button) if the message count increased but auto-scroll is locked
//         this.service.updateScrollState();
//     }
//   }

//   componentWillUnmount() {
//     this.service.cleanup();
//     document.removeEventListener('keydown', this.handleGlobalKeyPress);
//     document.removeEventListener('mousedown', this.handleClickOutside);
//   }

//   // --- UI/Component-Specific Handlers ---

//   private handleGlobalKeyPress = (event: KeyboardEvent) => {
//     if (event.key === 'Escape' && this.state.isStreaming) {
//         event.preventDefault();
//         this.stopGeneration();
//     }
//     // Other key handlers (e.g., Enter in input) would live here or in ChatInput
//   };
  
//   private handleClickOutside = (event: MouseEvent) => {
//       // Logic to close the conversation menu if a click happens outside
//       // Removed specific menu ref logic, stubbing general approach
//       if (this.state.openConversationMenu) {
//           // Simplified: call service to close menu
//           this.service.setState({ openConversationMenu: null });
//       }
//   };

//   private handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
//     if (event.key === 'Enter' && !event.shiftKey) {
//         event.preventDefault();
//         this.handleSendMessage();
//     }
//   };
  
//   // --- Render ---

//   render() {
//     const { 
//         messages, inputText, isLoading, error, currentTheme, 
//         selectedModel, useStreaming, conversation_id, isLoadingHistory, 
//         models, isLoadingModels, personas, selectedPersona, isStreaming,
//         conversations, isHistoryExpanded, showScrollToBottom, isInitializing
//     } = this.state;
    
//     const isReady = !isInitializing && !isLoadingModels;
//     const promptQuestion = error || (isLoadingHistory ? 'Loading history...' : '');

//     return (
//       <div className={`collection-chat-view-shell theme-${currentTheme}`}>
//         <ChatHeader 
//           // Passed data
//           selectedModel={selectedModel}
//           models={models}
//           personas={personas}
//           selectedPersona={selectedPersona}
//           useStreaming={useStreaming}
//           // Passed actions/delegated service calls
//           onModelChange={this.handleModelChange}
//           onPersonaChange={this.handlePersonaChange}
//           onPersonaToggle={this.handlePersonaToggle}
//           onNewChatClick={this.service.handleNewChatClick}
//           onToggleStreaming={this.service.toggleStreamingMode}
//           // History/Conversation actions
//           conversations={conversations}
//           onConversationSelect={this.service.loadConversationWithPersona} // simplified
//           onRenameConversation={this.service.handleRenameConversation}
//           onDeleteConversation={this.service.handleDeleteConversation}
//           // Removed web search and document buttons
//         />

//         <div className="chat-main-area">
//           {(!isReady) ? (
//             <LoadingStates />
//           ) : (
//             <>
//               <div className="chat-history-container" ref={this.chatHistoryRef}>
//                 <ChatHistory
//                   messages={messages}
//                   onScroll={this.handleScroll}
//                   // Removed documentContext passing
//                 />
//               </div>
              
//               {showScrollToBottom && (
//                   <button 
//                       className="scroll-to-bottom-button" 
//                       onClick={() => (this.service as any).performScrollToBottom({ behavior: 'smooth', manual: true })}
//                   >
//                       ↓
//                   </button>
//               )}
              
//               <ChatInput
//                 inputText={inputText}
//                 isLoading={isLoading}
//                 isStreaming={isStreaming}
//                 selectedModel={selectedModel}
//                 promptQuestion={promptQuestion}
//                 // Delegated actions
//                 onInputChange={this.handleInputChange}
//                 onKeyPress={this.handleKeyPress}
//                 onSendMessage={this.handleSendMessage}
//                 onStopGeneration={this.stopGeneration}
//                 inputRef={this.inputRef}
//                 // Removed all web search and document file upload props
//               />
//             </>
//           )}
//         </div>
//       </div>
//     );
//   }
// }

// export default CollectionChatViewShell;
