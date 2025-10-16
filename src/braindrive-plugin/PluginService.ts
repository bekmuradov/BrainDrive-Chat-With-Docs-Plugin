import { TemplateTheme, Services } from '../types';
import {
    Collection,
    ChatSession,
    ViewType,
    ServiceRuntimeStatus,
    ChatCollectionsConfig,
    ChatCollectionsPluginState as PluginState,
    PluginStateUpdater,
} from './pluginTypes';
import { DataRepository } from './DataRepository';
import { HealthCheckService } from './HealthCheckService';
import { CHAT_SERVICE_API_BASE, PLUGIN_SERVICE_RUNTIMES } from '../constants';
import type { IPluginService } from './IPluginService';


export class PluginService implements IPluginService {
    // Private properties for internal state and dependencies
    private state: PluginState;
    private updateComponentState: PluginStateUpdater;
    private services: Services;
    private config: ChatCollectionsConfig | undefined;
    private apiBaseUrl: string;

    // Infrastructure dependencies
    private dataRepository: DataRepository;
    private healthCheckService: HealthCheckService;

    // External listener/interval references for cleanup
    private themeChangeListener: ((theme: TemplateTheme) => void) | null = null;
    private pageContextUnsubscribe: (() => void) | null = null;
    private dataRefreshInterval: NodeJS.Timeout | null = null;
    private serviceCheckInterval: NodeJS.Timeout | null = null;
    private isMounted: boolean = false; // Use a flag, similar to _isMounted

    constructor(initialState: PluginState, services: Services, config: ChatCollectionsConfig | undefined, updateComponentState: PluginStateUpdater) {
        this.state = initialState;
        this.updateComponentState = updateComponentState;
        this.services = services;
        this.config = config;
        this.apiBaseUrl = config?.apiBaseUrl || CHAT_SERVICE_API_BASE;

        // Initialize Repositories (Dependency Injection)
        this.dataRepository = new DataRepository(services.api, this.apiBaseUrl);
        this.healthCheckService = new HealthCheckService(PLUGIN_SERVICE_RUNTIMES);
    }

    // --- Private State Management ---

    private updateState = (newState: Partial<PluginState>): void => {
        this.state = { ...this.state, ...newState } as PluginState;
        // Only update React if the component is mounted (simulating the previous _isMounted check)
        if (this.isMounted) {
            this.updateComponentState(newState); 
        }
    }
    
    // --- Public Lifecycle Methods (Called by React Component) ---

    public initializePlugin = async(): Promise<void> => {
        try {
            this.setupExternalListeners();
            await this.checkAllServices(); // Checks health
            this.setupPeriodicHealthCheck();
            this.setupDataRefreshIfServicesReady();
            this.updateState({ isInitializing: false });
        } catch (error) {
            console.error('PluginService: Failed to initialize:', error);
            this.updateState({ error: 'Failed to initialize plugin', isInitializing: false });
        }
    }

    public setMounted(mounted: boolean): void {
        this.isMounted = mounted;
        // On mount, if services are ready, try loading data again just in case the initial load was missed
        if (mounted && this.areServicesReady()) {
            this.loadInitialData();
            this.setupDataRefreshIfServicesReady();
        }
    }
    
    public cleanup = (): void => {
        this.isMounted = false; // Prevent setState calls after unmount
        this.cleanupExternalListeners();
        this.cleanupIntervals();
    }
    
    public handleComponentUpdate = (prevState: PluginState): void => {
        // Logic previously in componentDidUpdate moved here
        const { selectedCollection, selectedChatSession, serviceStatuses } = this.state;
        const wasServicesReady = this.areServicesReady(prevState.serviceStatuses);
        const isServicesReady = this.areServicesReady(serviceStatuses);

        // 1. Handle selection changes (only if services are ready)
        if (isServicesReady) {
            if (selectedCollection && prevState.selectedCollection?.id !== selectedCollection.id) {
                this.loadDocuments(selectedCollection.id);
                this.loadChatSessions();
            }
            if (selectedChatSession && prevState.selectedChatSession?.id !== selectedChatSession.id) {
                this.loadChatMessages(selectedChatSession.id);
            }
        }

        // 2. Services just became ready
        if (!wasServicesReady && isServicesReady) {
            this.loadInitialData();
            this.setupDataRefreshIfServicesReady();
        }
    }
    
    // --- Infrastructure & Cleanup Management ---

    public areServicesReady = (statuses?: ServiceRuntimeStatus[]): boolean => {
        const statusesToCheck = statuses || this.state.serviceStatuses;
        return statusesToCheck.every((s) => s.status === 'ready');
    }

    private setupExternalListeners = (): void => {
        if (this.services.theme) {
            this.updateState({ currentTheme: this.services.theme.getCurrentTheme() });
            this.themeChangeListener = (theme: TemplateTheme) => this.updateState({ currentTheme: theme });
            this.services.theme.addThemeChangeListener(this.themeChangeListener);
        }
        if (this.services.pageContext) {
            this.pageContextUnsubscribe = this.services.pageContext.onPageContextChange((context) => {
                console.log('PluginService: Page context changed:', context);
            });
        }
    }

    private cleanupExternalListeners = (): void => {
        if (this.services.theme && this.themeChangeListener) {
            this.services.theme.removeThemeChangeListener(this.themeChangeListener);
        }
        if (this.pageContextUnsubscribe) {
            this.pageContextUnsubscribe();
        }
    }

    private cleanupIntervals = (): void => {
        if (this.dataRefreshInterval) clearInterval(this.dataRefreshInterval);
        if (this.serviceCheckInterval) clearInterval(this.serviceCheckInterval);
    }

    // --- Data Loading & Refresh Logic ---

    public checkAllServices = async (): Promise<void> => {
        const statusChecks = await this.healthCheckService.checkAllServices();
        this.updateState({ serviceStatuses: statusChecks });
    }

    private setupPeriodicHealthCheck = (): void => {
        this.serviceCheckInterval = setInterval(() => this.checkAllServices(), 30000);
    }
    
    private loadInitialData = async (): Promise<void> => {
        if (!this.areServicesReady()) return;
        this.updateState({ loading: true, error: null });
        try {
            console.log("Loading collections.....");
            await this.loadCollections();
        } catch (error) {
            console.error('PluginService: Failed to load initial data:', error);
            this.updateState({ error: 'Failed to load initial data' });
        } finally {
            this.updateState({ loading: false });
        }
    }

    public loadCollections = async (): Promise<void> => {
        try {
            const collections = await this.dataRepository.getCollections();
            console.log("loaded collections: ", collections);
            this.updateState({ collections, error: null });
        } catch (err: any) {
            this.updateState({ error: `Failed to load collections: ${err.message}` });
        }
    }

    public loadDocuments = async (collectionId: string): Promise<void> => {
        try {
            const documents = await this.dataRepository.getDocuments(collectionId);
            this.updateState({ documents, error: null });
        } catch (err: any) {
            this.updateState({ error: `Failed to load documents: ${err.message}` });
        }
    }

    public loadChatSessions = async (): Promise<void> => {
        try {
            const allSessions = await this.dataRepository.getChatSessions();
            const filtered = allSessions.filter(
                (session: ChatSession) => session.collection_id === this.state.selectedCollection?.id
            );
            this.updateState({ chatSessions: filtered, error: null });
        } catch (err: any) {
            this.updateState({ error: `Failed to load chat sessions: ${err.message}` });
        }
    }

    public loadChatMessages = async (sessionId: string): Promise<void> => {
        try {
            const messages = await this.dataRepository.getChatMessages(sessionId);
            this.updateState({ chatMessages: messages, error: null });
        } catch (err: any) {
            this.updateState({ error: `Failed to load messages: ${err.message}` });
        }
    }

    private setupDataRefreshIfServicesReady = (): void => {
        this.cleanupIntervals(); // Clear existing
        const refreshInterval = this.config?.refreshInterval;
        
        if (refreshInterval && refreshInterval > 0 && this.areServicesReady()) {
            // Setup periodic refresh
            this.dataRefreshInterval = setInterval(this.refreshData.bind(this), refreshInterval * 1000);
        } else if (this.areServicesReady()) {
            this.loadInitialData();
        }
    }

    private refreshData = async (): Promise<void> => {
        if (!this.areServicesReady() || this.state.loading) return;
        
        try {
            await this.loadCollections();
            if (this.state.selectedCollection) {
                await this.loadDocuments(this.state.selectedCollection.id);
                await this.loadChatSessions();
            }
        } catch (error) {
            console.error('PluginService: Failed to refresh data silently:', error);
        }
    }

    // --- Public View Controllers (Event Handlers) ---

    public handleViewChange = (view: ViewType): void => {
        this.updateState({ currentView: view, error: null });
    }

    public handleCollectionSelect = (collection: Collection): void => {
        // Business logic for view navigation and state reset
        this.updateState({
            selectedCollection: collection,
            selectedChatSession: null,
            chatMessages: [],
            currentView: ViewType.CHAT,
        });
        // Data loading is handled by the handleComponentUpdate logic
    }

    public handleChatSessionSelect = async (session: ChatSession): Promise<void> => {
        if (session) {
            this.updateState({ selectedChatSession: session });
            // Data loading is handled by the handleComponentUpdate logic
        }
    }

    public handleBack = (): void => {
        const { currentView } = this.state;
        let newState: Partial<PluginState> = {};
        
        if (currentView === ViewType.CHAT) {
            newState = { currentView: ViewType.COLLECTIONS, selectedChatSession: null, chatMessages: [] };
        } else if (currentView === ViewType.DOCUMENTS) {
            newState = { currentView: ViewType.COLLECTIONS, selectedCollection: null, documents: [], chatSessions: [] };
        } else if (currentView === ViewType.SETTINGS) {
            newState = { currentView: ViewType.COLLECTIONS };
        }
        
        this.updateState(newState);
    }
    
    public setError = (msg: string | null): void => {
        this.updateState({ error: msg });
    }
    
    public toggleServiceDetails = (): void => {
        this.updateState({ showServiceDetails: !this.state.showServiceDetails });
    }
    
    public getCurrentState = (): PluginState => this.state;

    public getDataRepository = (): DataRepository => {
        return this.dataRepository;
    }
}
