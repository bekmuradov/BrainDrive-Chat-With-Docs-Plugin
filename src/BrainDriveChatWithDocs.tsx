import React from 'react';
// Keep all UI/Style imports
import './BrainDriveChatWithDocs.css';
import {
	Loader2,
	ArrowLeft,
	Settings,
    AlertCircle
} from 'lucide-react';
import { CollectionViewShell } from './collection-view/CollectionViewShell';
import { CollectionChatViewShell } from './collection-chat-view/CollectionChatViewShell';
import {
	CreateSessionForm,
	ErrorAlert,
	ServiceStatusIndicator,
	ServiceWarningBanner,
	ContentOverlay,
    ChatCollectionsSettings
} from './components';

// Import Service & Types
import { PluginService } from './braindrive-plugin/PluginService';
// Import only the external constants needed for initial state
import { CHAT_SERVICE_API_BASE, PLUGIN_SERVICE_RUNTIMES } from './constants'; 
import {
	ViewType,
    ChatCollectionsPluginState, 
    ChatCollectionsPluginProps,
    Collection,
    ChatSession,
} from './braindrive-plugin/pluginTypes'; 

// Version information
export const version = '1.0.0';


class BrainDriveChatWithDocs extends React.Component<ChatCollectionsPluginProps, ChatCollectionsPluginState> {
    // 1. The service instance is now the only private class property
    private pluginService: PluginService; 

    constructor(props: ChatCollectionsPluginProps) {
        super(props);
        
        const apiBaseUrl = props.config?.apiBaseUrl || CHAT_SERVICE_API_BASE;
        
        // Define initial state that will be managed by the Service
        const initialState: ChatCollectionsPluginState = {
            currentView: ViewType.COLLECTIONS,
            selectedCollection: null,
            selectedChatSession: null,
            collections: [],
            documents: [],
            chatSessions: [],
            chatMessages: [],
            loading: false,
            error: null,
            currentTheme: 'light',
            isInitializing: true,
            serviceStatuses: PLUGIN_SERVICE_RUNTIMES.map(service => ({
                name: service.name,
                status: 'checking' as const,
            })),
            showServiceDetails: false,
        };
        
        // 2. Instantiate the PluginService, injecting dependencies (props) and the setState callback
        this.pluginService = new PluginService(
            initialState, 
            props.services, 
            props.config,
            (newState) => this.setState((prev) => ({ ...prev, ...newState }))
        );

        // Set initial state from the service
        this.state = initialState; 
        
        // 3. **ALL** constructor bindings are now removed. Handlers will be arrow functions or direct service calls.
    }

    // ===================================
    // LIFECYCLE (Thin Controller)
    // ===================================
    async componentDidMount() {
        this.pluginService.setMounted(true);
        try {
            await this.pluginService.initializePlugin();
            this.setState({ isInitializing: false });
        } catch (error) {
            console.error('ChatCollectionsPlugin: Failed to initialize:', error);
            this.setState({ 
                error: 'Failed to initialize plugin',
                isInitializing: false 
            });
        }
    }

    componentWillUnmount() {
        this.pluginService.setMounted(false);
        this.pluginService.cleanup();
    }

    componentDidUpdate(_: ChatCollectionsPluginProps, prevState: ChatCollectionsPluginState) {
        // Delegate complex update logic to the service
        this.pluginService.handleComponentUpdate(prevState);
    }
    
    // ===================================
    // HANDLER DISPATCHERS (Arrow Functions to Avoid Binding)
    // ===================================

    // Handlers simply delegate to the service
    handleViewChange = (view: ViewType) => this.pluginService.handleViewChange(view);
    handleCollectionSelect = (collection: Collection) => this.pluginService.handleCollectionSelect(collection);
    handleChatSessionSelect = (session: ChatSession) => this.pluginService.handleChatSessionSelect(session);
    handleBack = () => this.pluginService.handleBack();
    
    // Direct call for service checks
    checkAllServices = () => this.pluginService.checkAllServices();
    
    // ===================================
    // RENDER METHODS (Focus on UI)
    // ===================================

    private renderLoading(): JSX.Element {
        return (
            // ... (remains the same)
            <div className="plugin-template-loading">
                <div className="loading-spinner">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
                <p>Initializing Chat Collections Plugin...</p>
            </div>
        );
    }

    private renderContent(): JSX.Element {
        const {
            currentView, selectedCollection, selectedChatSession, collections, documents,
            chatSessions, chatMessages, error, serviceStatuses, showServiceDetails,
        } = this.state;
        const { services } = this.props;
        // Get service status directly from the logic layer's current state
        const areServicesReady = this.pluginService.areServicesReady(); 

        return (
            <div className="chat-collections-plugin-content">
                {/* Header */}
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {/* Uses delegated handlers */}
                                {currentView !== ViewType.COLLECTIONS && (
                                    <button onClick={this.handleBack} disabled={!areServicesReady} /* ... */>
                                        <ArrowLeft className="h-5 w-5 mr-2" /> Back
                                    </button>
                                )}
                                <p className='text-black text-xl'>TESTING HEADER</p>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                                {/* Service Status Indicator - Uses delegated handlers */}
                                <ServiceStatusIndicator
                                    serviceStatuses={serviceStatuses}
                                    showDetails={showServiceDetails}
                                    onToggleDetails={this.pluginService.toggleServiceDetails} // Direct Service call
                                    onRefresh={this.checkAllServices}
                                />
                                
                                {currentView !== ViewType.SETTINGS && (
                                    <button onClick={() => this.handleViewChange(ViewType.SETTINGS)} /* ... */>
                                        <Settings className="w-5 h-5" />
                                    </button>
                                )}
                                
                                {selectedCollection && areServicesReady && (
                                    <div className="flex space-x-2">
                                        {/* ... View Switch Buttons ... */}
                                        <CreateSessionForm
                                            collectionId={selectedCollection.id}
                                            onSessionCreated={this.handleChatSessionSelect}
                                            onError={this.pluginService.setError} // Direct Service call
                                            buttonText="New Chat"
                                            placeholder="Session name"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service Warning Banner & Error Alert - use service state/handlers */}
                <ServiceWarningBanner serviceStatuses={serviceStatuses} />
                {error && (
                    <ErrorAlert
                        error={error}
                        onDismiss={() => this.pluginService.setError(null)} // Direct Service call
                    />
                )}

                {/* Main Content with Overlay */}
                <ContentOverlay areServicesReady={areServicesReady}>
                    <div className="max-w-7xl mx-auto px-4 py-6">
                        {currentView === ViewType.COLLECTIONS && (
                            <CollectionViewShell
                                collections={collections}
                                onCollectionSelect={this.handleCollectionSelect}
                                onCollectionCreate={this.pluginService.loadCollections} // Pass service method as handler
                                setError={this.pluginService.setError}
                                dataRepository={this.pluginService.getDataRepository()} // Assuming a getter is added/available
                            />
                        )}
                        {currentView === ViewType.DOCUMENTS && selectedCollection && (
                            <CollectionChatViewShell
                                services={services}
                                selectedCollection={selectedCollection}
                            />
                        )}
                        {currentView === ViewType.SETTINGS && (
                            <ChatCollectionsSettings services={services} />
                        )}
                    </div>
                </ContentOverlay>
            </div>
        );
    }

    /**
   * Render error state
   */
    private renderError(): JSX.Element {
        return (
            <div className="plugin-template-error">
                <div className="error-icon">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <p>{this.state.error}</p>
                <button
                    onClick={() => this.setState({ error: null })}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    render(): JSX.Element {
        const { currentTheme, isInitializing, error } = this.state;
        
        return (
            <div className={`plugin-template chat-collections-plugin ${currentTheme === 'dark' ? 'dark-theme' : ''}`}>
                {isInitializing ? (
                    this.renderLoading()
                ) : error && !this.state.collections.length ? (
                    this.renderError()
                ) : (
                    this.renderContent()
                )}
            </div>
        );
    }
}

export default BrainDriveChatWithDocs;
