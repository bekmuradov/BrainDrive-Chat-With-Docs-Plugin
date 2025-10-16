// IPluginService.ts

import {
    Collection,
    ChatSession,
    ViewType,
    ServiceRuntimeStatus,
    ChatCollectionsPluginState as PluginState,
    PluginStateUpdater,
    ChatCollectionsConfig,
} from './pluginTypes';
import { DataRepository } from './DataRepository';

/**
 * Defines the public contract for the PluginService class.
 * This interface is used for dependency injection and mocking in tests.
 */
export interface IPluginService {
    // --- Public Lifecycle Methods ---
    initializePlugin(): Promise<void>;
    setMounted(mounted: boolean): void;
    cleanup(): void;
    handleComponentUpdate(prevState: PluginState): void;

    // --- Data Loading & Status Methods ---
    areServicesReady(statuses?: ServiceRuntimeStatus[]): boolean;
    checkAllServices(): Promise<void>;
    loadCollections(): Promise<void>;
    loadDocuments(collectionId: string): Promise<void>;
    loadChatSessions(): Promise<void>;
    loadChatMessages(sessionId: string): Promise<void>;

    // --- Public View Controllers (Event Handlers) ---
    handleViewChange(view: ViewType): void;
    handleCollectionSelect(collection: Collection): void;
    handleChatSessionSelect(session: ChatSession): Promise<void>;
    handleBack(): void;
    
    // --- State Access & Mutators ---
    setError(msg: string | null): void;
    toggleServiceDetails(): void;
    
    // Accessors
    getCurrentState(): PluginState;
    getDataRepository(): DataRepository;
}
