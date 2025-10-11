// import React from 'react';
// import './BrainDriveChatWithDocs.css';
// import { 
// 	MessageSquare, 
// 	FileText, 
// 	Loader2,
// 	ArrowLeft,
// 	Settings,
// } from 'lucide-react';
// import {
// 	CollectionsView,
// 	DocumentsView,
// 	CreateSessionForm,
// 	ChatCollectionsSettings,
// 	ErrorAlert,
// 	ServiceStatusIndicator,
// 	ServiceWarningBanner,
// 	ContentOverlay,
// } from './components';
// import { API_BASE } from './config';
// import {
// 	Collection,
// 	ChatSession,
// 	ViewType,
// 	Document,
// 	ChatMessage,
// 	ServiceRuntimeStatus,
// } from './custom-types';
// import type { TemplateTheme, Services } from './types';

// // Version information
// export const version = '1.0.0';


// interface ChatCollectionsConfig {
//   apiBaseUrl?: string;
//   refreshInterval?: number;
//   showAdvancedOptions?: boolean;
//   maxDocuments?: number;
//   chatSettings?: {
//     maxMessages?: number;
//     autoSave?: boolean;
//   };
// }

// interface ChatCollectionsPluginProps {
//   title?: string;
//   description?: string;
//   pluginId?: string;
//   moduleId?: string;
//   instanceId?: string;
//   config?: ChatCollectionsConfig;
//   services: Services;
// }

// interface PageContext {
//   pageId?: string;
//   pageName?: string;
//   pageRoute?: string;
//   isStudioPage?: boolean;
// }

// interface ChatCollectionsPluginState {
//   currentView: ViewType;
//   selectedCollection: Collection | null;
//   selectedChatSession: ChatSession | null;
//   collections: Collection[];
//   documents: Document[];
//   chatSessions: ChatSession[];
//   chatMessages: ChatMessage[];
//   loading: boolean;
//   error: string | null;
//   currentTheme: TemplateTheme;
//   isInitializing: boolean;
//   serviceStatuses: ServiceRuntimeStatus[];
//   showServiceDetails: boolean;
// }

// const requiredServiceRuntimes = [
//   {
//     "name": "cwyd_service",
//     "healthcheck_url": "http://localhost:8000/health",
//   },
//   {
//     "name": "document_processing_service",
//     "healthcheck_url": "http://localhost:8080/health",
//   },
// ];

// class ChatCollectionsPlugin extends React.Component<ChatCollectionsPluginProps, ChatCollectionsPluginState> {
//   private _isMounted: boolean = false;
//   private themeChangeListener: ((theme: TemplateTheme) => void) | null = null;
//   private pageContextUnsubscribe: (() => void) | null = null;
//   private dataRefreshInterval: NodeJS.Timeout | null = null;
//   private serviceCheckInterval: NodeJS.Timeout | null = null;
//   private apiBaseUrl: string;

//   constructor(props: ChatCollectionsPluginProps) {
//     super(props);
    
//     this.apiBaseUrl = props.config?.apiBaseUrl || API_BASE;
    
//     this.state = {
//       currentView: ViewType.COLLECTIONS,
//       selectedCollection: null,
//       selectedChatSession: null,
//       collections: [],
//       documents: [],
//       chatSessions: [],
//       chatMessages: [],
//       loading: false,
//       error: null,
//       currentTheme: 'light',
//       isInitializing: true,
//       serviceStatuses: requiredServiceRuntimes.map(service => ({
//         name: service.name,
//         status: 'checking' as const,
//       })),
//       showServiceDetails: false,
//     };

//     this.loadCollections = this.loadCollections.bind(this);
//     this.loadDocuments = this.loadDocuments.bind(this);
//     this.loadChatSessions = this.loadChatSessions.bind(this);
//     this.loadChatMessages = this.loadChatMessages.bind(this);
//     this.handleViewChange = this.handleViewChange.bind(this);
//     this.handleCollectionSelect = this.handleCollectionSelect.bind(this);
//     this.handleChatSessionSelect = this.handleChatSessionSelect.bind(this);
//     this.handleBack = this.handleBack.bind(this);
//     this.checkServiceHealth = this.checkServiceHealth.bind(this);
//     this.checkAllServices = this.checkAllServices.bind(this);
//   }

//   async componentDidMount() {
//     this._isMounted = true;
//     try {
//       await this.initializeServices();
//       await this.checkAllServices();
//       this.setupPeriodicHealthCheck();
//       this.setupDataRefreshIfServicesReady();
//       this.setState({ isInitializing: false });
//     } catch (error) {
//       console.error('ChatCollectionsPlugin: Failed to initialize:', error);
//       this.setState({ 
//         error: 'Failed to initialize plugin',
//         isInitializing: false 
//       });
//     }
//   }

//   componentWillUnmount() {
//     this._isMounted = false;
//     this.cleanupServices();
//     this.cleanupIntervals();
//   }

//   componentDidUpdate(prevProps: ChatCollectionsPluginProps, prevState: ChatCollectionsPluginState) {
//     // Handle collection selection changes
//     if (
//       this.state.selectedCollection &&
//       prevState.selectedCollection?.id !== this.state.selectedCollection.id
//     ) {
//       if (this.areServicesReady()) {
//         this.loadDocuments(this.state.selectedCollection.id);
//         this.loadChatSessions();
//       }
//     }
    
//     // Handle chat session selection changes
//     if (
//       this.state.selectedChatSession &&
//       prevState.selectedChatSession?.id !== this.state.selectedChatSession.id
//     ) {
//       if (this.areServicesReady()) {
//         this.loadChatMessages(this.state.selectedChatSession.id);
//       }
//     }

//     // Check if services just became ready
//     const wasReady = this.areServicesReady(prevState.serviceStatuses);
//     const isReady = this.areServicesReady();
    
//     if (!wasReady && isReady) {
//       // Services just became ready, load initial data
//       this.loadInitialData();
//       this.setupDataRefreshIfServicesReady();
//     }
//   }

//   // ============ SERVICE HEALTH CHECK METHODS ============

//   /**
//    * Check if all services are ready
//    */
//   private areServicesReady(statuses?: ServiceRuntimeStatus[]): boolean {
//     const statusesToCheck = statuses || this.state.serviceStatuses;
//     return statusesToCheck.every(s => s.status === 'ready');
//   }

//   /**
//    * Check health of a single service
//    */
//   private async checkServiceHealth(service: typeof requiredServiceRuntimes[0]): Promise<ServiceRuntimeStatus> {
//     try {
//       const response = await fetch(service.healthcheck_url, {
//         method: 'GET',
//         signal: AbortSignal.timeout(5000),
//       });
      
//       if (response.ok) {
//         return {
//           name: service.name,
//           status: 'ready',
//           lastChecked: new Date(),
//         };
//       } else {
//         return {
//           name: service.name,
//           status: 'not-ready',
//           lastChecked: new Date(),
//           error: `HTTP ${response.status}`,
//         };
//       }
//     } catch (error: any) {
//       return {
//         name: service.name,
//         status: 'error',
//         lastChecked: new Date(),
//         error: error.message || 'Connection failed',
//       };
//     }
//   }

//   /**
//    * Check all required services
//    */
//   private async checkAllServices(): Promise<void> {
//     if (!this._isMounted) return;

//     const statusChecks = await Promise.all(
//       requiredServiceRuntimes.map(service => this.checkServiceHealth(service))
//     );

//     if (this._isMounted) {
//       this.setState({ serviceStatuses: statusChecks });
//     }
//   }

//   /**
//    * Setup periodic health check (every 30 seconds)
//    */
//   private setupPeriodicHealthCheck(): void {
//     this.serviceCheckInterval = setInterval(() => {
//       this.checkAllServices();
//     }, 30000);
//   }

//   // ============ DATA LOADING METHODS ============

//   /**
//    * Load initial data (only when services are ready)
//    */
//   private async loadInitialData(): Promise<void> {
//     if (!this.areServicesReady()) {
//       console.log('ChatCollectionsPlugin: Services not ready, skipping data load');
//       return;
//     }

//     this.setState({ loading: true, error: null });
//     try {
//       await this.loadCollections();
//     } catch (error) {
//       console.error('ChatCollectionsPlugin: Failed to load initial data:', error);
//       this.setState({ error: 'Failed to load initial data' });
//     } finally {
//       this.setState({ loading: false });
//     }
//   }

//   /**
//    * Refresh all data (collections, documents, etc.)
//    */
//   private async refreshData(): Promise<void> {
//     if (!this.areServicesReady() || this.state.loading) {
//       return;
//     }
    
//     try {
//       await this.loadCollections();
//       if (this.state.selectedCollection) {
//         await this.loadDocuments(this.state.selectedCollection.id);
//         await this.loadChatSessions();
//       }
//     } catch (error) {
//       console.error('ChatCollectionsPlugin: Failed to refresh data:', error);
//     }
//   }

//   /**
//    * Setup periodic data refresh if services are ready and refresh interval is configured
//    */
//   private setupDataRefreshIfServicesReady(): void {
//     // Clear existing interval if any
//     if (this.dataRefreshInterval) {
//       clearInterval(this.dataRefreshInterval);
//       this.dataRefreshInterval = null;
//     }

//     const refreshInterval = this.props.config?.refreshInterval;
    
//     if (refreshInterval && refreshInterval > 0 && this.areServicesReady()) {
//       // Load initial data immediately
//       this.loadInitialData();
      
//       // Setup periodic refresh
//       this.dataRefreshInterval = setInterval(() => {
//         this.refreshData();
//       }, refreshInterval * 1000);
//     } else if (this.areServicesReady()) {
//       // No refresh interval, just load once
//       this.loadInitialData();
//     }
//   }

//   // ============ INITIALIZATION & CLEANUP ============

//   /**
//    * Initialize BrainDrive services
//    */
//   private async initializeServices(): Promise<void> {
//     const { services } = this.props;
    
//     if (services.theme) {
//       const currentTheme = services.theme.getCurrentTheme();
//       this.setState({ currentTheme });
      
//       this.themeChangeListener = (theme: TemplateTheme) => {
//         this.setState({ currentTheme: theme });
//       };
//       services.theme.addThemeChangeListener(this.themeChangeListener);
//     }

//     if (services.pageContext) {
//       this.pageContextUnsubscribe = services.pageContext.onPageContextChange((context) => {
//         console.log('ChatCollectionsPlugin: Page context changed:', context);
//       });
//     }
//   }

//   /**
//    * Clean up services and listeners
//    */
//   private cleanupServices(): void {
//     const { services } = this.props;
    
//     if (services.theme && this.themeChangeListener) {
//       services.theme.removeThemeChangeListener(this.themeChangeListener);
//     }
    
//     if (this.pageContextUnsubscribe) {
//       this.pageContextUnsubscribe();
//     }
//   }

//   /**
//    * Clean up all intervals
//    */
//   private cleanupIntervals(): void {
//     if (this.dataRefreshInterval) {
//       clearInterval(this.dataRefreshInterval);
//     }
    
//     if (this.serviceCheckInterval) {
//       clearInterval(this.serviceCheckInterval);
//     }
//   }

//   // ============ API METHODS ============

//   async loadCollections() {
//     if (!this._isMounted && !this.state) {
//       return;
//     }
//     try {
//       const { services } = this.props;
//       let response;
      
//       if (services.api) {
//         response = await services.api.get(`${this.apiBaseUrl}/collections/`);
//       } else {
//         const fetchResponse = await fetch(`${this.apiBaseUrl}/collections/`);
//         if (!fetchResponse.ok) throw new Error('Failed to load collections');
//         response = await fetchResponse.json();
//       }
      
//       this.setState({ collections: response });
//     } catch (err: any) {
//       this.setState({ error: err.message });
//     }
//   }

//   async loadDocuments(collectionId: string) {
//     try {
//       const { services } = this.props;
//       let response;
      
//       if (services.api) {
//         response = await services.api.get(`${this.apiBaseUrl}/documents/?collection_id=${collectionId}`);
//       } else {
//         const fetchResponse = await fetch(`${this.apiBaseUrl}/documents/?collection_id=${collectionId}`);
//         if (!fetchResponse.ok) throw new Error('Failed to load documents');
//         response = await fetchResponse.json();
//       }
      
//       this.setState({ documents: response });
//     } catch (err: any) {
//       this.setState({ error: err.message });
//     }
//   }

//   async loadChatSessions() {
//     try {
//       const { services } = this.props;
//       let response;
      
//       if (services.api) {
//         response = await services.api.get(`${this.apiBaseUrl}/chat/sessions`);
//       } else {
//         const fetchResponse = await fetch(`${this.apiBaseUrl}/chat/sessions`);
//         if (!fetchResponse.ok) throw new Error('Failed to load chat sessions');
//         response = await fetchResponse.json();
//       }
      
//       const filtered = response.filter(
//         (session: ChatSession) => session.collection_id === this.state.selectedCollection?.id
//       );
//       this.setState({ chatSessions: filtered });
//     } catch (err: any) {
//       this.setState({ error: err.message });
//     }
//   }

//   async loadChatMessages(sessionId: string) {
//     try {
//       const { services } = this.props;
//       let response;
      
//       if (services.api) {
//         response = await services.api.get(`${this.apiBaseUrl}/chat/messages?session_id=${sessionId}`);
//       } else {
//         const fetchResponse = await fetch(`${this.apiBaseUrl}/chat/messages?session_id=${sessionId}`);
//         if (!fetchResponse.ok) throw new Error('Failed to load messages');
//         response = await fetchResponse.json();
//       }
      
//       this.setState({ chatMessages: response });
//     } catch (err: any) {
//       this.setState({ error: err.message });
//     }
//   }

//   // ============ EVENT HANDLERS ============

//   handleViewChange(view: ViewType) {
//     this.setState({ currentView: view, error: null });
//   }

//   handleCollectionSelect(collection: Collection) {
//     this.setState({
//       selectedCollection: collection,
//       selectedChatSession: null,
//       chatMessages: [],
//       currentView:
//         this.state.currentView === ViewType.COLLECTIONS
//           ? ViewType.DOCUMENTS
//           : this.state.currentView,
//     });
//   }

//   async handleChatSessionSelect(session: ChatSession) {
//     if (session) {
//       this.setState({
//         selectedChatSession: session,
//       });
//       if (this.areServicesReady()) {
//         this.loadChatMessages(session.id);
//       }
//     }
//   }

//   handleBack() {
//     const { currentView } = this.state;
//     if (currentView === ViewType.CHAT) {
//       this.setState({
//         currentView: ViewType.DOCUMENTS,
//         selectedChatSession: null,
//         chatMessages: [],
//       });
//     } else if (currentView === ViewType.DOCUMENTS) {
//       this.setState({
//         currentView: ViewType.COLLECTIONS,
//         selectedCollection: null,
//         documents: [],
//         chatSessions: [],
//       });
//     } else if (currentView === ViewType.SETTINGS) {
//       this.setState({
//         currentView: ViewType.COLLECTIONS,
//         selectedCollection: null,
//         documents: [],
//         chatSessions: [],
//       });
//     }
//   }

//   // ============ UTILITY METHODS ============

//   getPluginInfo() {
//     return {
//       name: 'ChatCollectionsPlugin',
//       version: '1.0.0',
//       status: 'initialized',
//       apiBaseUrl: this.apiBaseUrl,
//       hasServices: {
//         api: !!this.props.services.api,
//         theme: !!this.props.services.theme,
//         settings: !!this.props.services.settings,
//         pageContext: !!this.props.services.pageContext
//       },
//       currentState: {
//         currentView: this.state.currentView,
//         collectionsCount: this.state.collections.length,
//         hasSelectedCollection: !!this.state.selectedCollection,
//         isLoading: this.state.loading,
//         hasError: !!this.state.error,
//         theme: this.state.currentTheme,
//         isInitializing: this.state.isInitializing
//       },
//       serviceStatuses: this.state.serviceStatuses,
//       servicesReady: this.areServicesReady(),
//       timestamp: new Date().toISOString()
//     };
//   }

//   // ============ RENDER METHODS ============

//   private renderLoading(): JSX.Element {
//     return (
//       <div className="plugin-template-loading">
//         <div className="loading-spinner">
//           <Loader2 className="h-8 w-8 animate-spin" />
//         </div>
//         <p>Initializing Chat Collections Plugin...</p>
//       </div>
//     );
//   }

//   private renderContent(): JSX.Element {
//     const {
//       currentView,
//       selectedCollection,
//       selectedChatSession,
//       collections,
//       documents,
//       chatSessions,
//       chatMessages,
//       error,
//       serviceStatuses,
//       showServiceDetails,
//     } = this.state;
//     const { services } = this.props;
//     const isServicesReady = this.areServicesReady();

//     return (
//       <div className="chat-collections-plugin-content">
//         {/* Header */}
//         <div className="bg-white shadow-sm border-b">
//           <div className="max-w-7xl mx-auto px-4 py-4">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center space-x-4">
//                 {currentView !== ViewType.COLLECTIONS && (
//                   <button
//                     onClick={this.handleBack}
//                     className="flex items-center text-gray-600 hover:text-gray-900"
//                     disabled={!isServicesReady}
//                   >
//                     <ArrowLeft className="h-5 w-5 mr-2" />
//                     Back
//                   </button>
//                 )}
//                 <h1 className="text-2xl font-bold text-gray-900">
//                   {currentView === ViewType.COLLECTIONS && 'Collections'}
//                   {currentView === ViewType.DOCUMENTS && `Documents - ${selectedCollection?.name}`}
//                   {currentView === ViewType.CHAT && `Chat - ${selectedChatSession?.name}`}
//                   {currentView === ViewType.SETTINGS && 'Plugin Settings'}
//                 </h1>
//               </div>
              
//               <div className="flex items-center space-x-3">
//                 {/* Service Status Indicator */}
//                 <ServiceStatusIndicator
//                   serviceStatuses={serviceStatuses}
//                   showDetails={showServiceDetails}
//                   onToggleDetails={() => this.setState({ showServiceDetails: !showServiceDetails })}
//                   onRefresh={this.checkAllServices}
//                 />
                
//                 {currentView !== ViewType.SETTINGS && (
//                   <button
//                     onClick={() => this.handleViewChange(ViewType.SETTINGS)}
//                     className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
//                     title="Settings"
//                     disabled={!isServicesReady}
//                   >
//                     <Settings className="w-5 h-5" />
//                   </button>
//                 )}
                
//                 {selectedCollection && isServicesReady && (
//                   <div className="flex space-x-2">
//                     <button
//                       onClick={() => this.handleViewChange(ViewType.DOCUMENTS)}
//                       className={`px-4 py-2 rounded-lg font-medium transition-colors hidden ${
//                         currentView === ViewType.DOCUMENTS
//                           ? 'bg-blue-100 text-blue-700'
//                           : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                       }`}
//                     >
//                       <FileText className="h-4 w-4 inline mr-2" />
//                       Documents
//                     </button>
//                     <button
//                       onClick={() => this.handleViewChange(ViewType.CHAT)}
//                       className={`px-4 py-2 rounded-lg font-medium transition-colors hidden ${
//                         currentView === ViewType.CHAT
//                           ? 'bg-blue-100 text-blue-700'
//                           : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                       }`}
//                     >
//                       <MessageSquare className="h-4 w-4 inline mr-2" />
//                       Chat
//                     </button>
//                     <CreateSessionForm
//                       collectionId={selectedCollection.id}
//                       onSessionCreated={this.handleChatSessionSelect}
//                       onError={(error) => console.error(error)}
//                       buttonText="New Chat"
//                       placeholder="Session name"
//                     />
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Service Warning Banner */}
//         <ServiceWarningBanner serviceStatuses={serviceStatuses} />

//         {/* Error Alert */}
//         {error && (
//           <ErrorAlert
//             error={error}
//             onDismiss={() => this.setState({ error: null })}
//           />
//         )}

//         {/* Main Content with Overlay */}
//         <ContentOverlay isServicesReady={isServicesReady}>
//           <div className="max-w-7xl mx-auto px-4 py-6">
//             {currentView === ViewType.COLLECTIONS && (
//               <CollectionsView
//                 collections={collections}
//                 onCollectionSelect={this.handleCollectionSelect}
//                 onCollectionCreate={this.loadCollections}
//                 setError={(msg) => this.setState({ error: msg })}
//               />
//             )}
//             {currentView === ViewType.DOCUMENTS && selectedCollection && (
//               <DocumentsView
//                 collection={selectedCollection}
//                 selectedSession={selectedChatSession}
//                 documents={documents}
//                 chatSessions={chatSessions}
//                 apiService={this.props.services.api}
//                 onDocumentUpload={() => this.loadDocuments(selectedCollection.id)}
//                 onDocumentDelete={() => this.loadDocuments(selectedCollection.id)}
//                 onChatSessionCreate={this.loadChatSessions}
//                 onChatSessionSelect={this.handleChatSessionSelect}
//                 onChatSessionDelete={this.loadChatSessions}
//                 setError={(msg) => this.setState({ error: msg })}
//               />
//             )}
//             {currentView === ViewType.SETTINGS && (
//               <ChatCollectionsSettings services={services} />
//             )}
//           </div>
//         </ContentOverlay>
//       </div>
//     );
//   }

//   render(): JSX.Element {
//     const { currentTheme, isInitializing } = this.state;
    
//     return (
//       <div className={`plugin-template chat-collections-plugin ${currentTheme === 'dark' ? 'dark-theme' : ''}`}>
//         {isInitializing ? this.renderLoading() : this.renderContent()}
//       </div>
//     );
//   }
// }

// export default ChatCollectionsPlugin;
