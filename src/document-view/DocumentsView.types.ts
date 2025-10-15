import { DataRepository } from '../braindrive-plugin/DataRepository';
import { Document, ChatSession, ChatMessage, Collection } from '../braindrive-plugin/pluginTypes'; 
import { ApiService } from '../types';

export interface DocumentWithPlaceholder extends Document {
    isPlaceholder?: boolean;
}

// 1. Service State Definition: All data needed by the documents/chat features
export interface DocumentServiceState {
    documents: DocumentWithPlaceholder[];
    uploading: boolean;
    error: string | null;
    selectedSession: ChatSession | null;
    selectedCollection: Collection | null;
}

// 2. Component Local State Definition: UI state plus necessary mirrored service state
export interface DocumentManagerModalState {
    showModal: boolean; // Unique to the component (controls visibility)
    documents: DocumentWithPlaceholder[]; // Mirrored from service for rendering
    uploading: boolean; // Mirrored from service for rendering
    selectedSession: ChatSession | null; // Mirrored from service for rendering
}

// 3. Service Interface: The contract for the business logic layer
export interface IDocumentService {
    // State management
    getState(): DocumentServiceState;
    // The subscribe function returns an unsubscribe function
    subscribe(listener: (state: DocumentServiceState) => void): () => void;
    // Internal state update (used by service methods, useful for component to handle errors)
    updateState(newState: Partial<DocumentServiceState>): void; 

    // Lifecycle/Initialization
    initialize(initialDocuments: Document[] | undefined, initialSessions: ChatSession[]): void;
    cleanup(): void;

    // Document methods
    uploadFile(file: File, collectionId: string): Promise<void>;
    deleteDocument(documentId: string, documentName: string): Promise<void>;
}

// 3. Component Props Definition
export interface DocumentManagerModalProps {
    collectionId: string;
    apiService?: ApiService; // Dependency injection for API access
    dataRepository: DataRepository;
    // Callbacks to notify the parent/main PluginController that a global list changed
    onDocumentListChange: () => void;
}

// Interface for component with the service injected
export interface DocumentManagerModalInjectedProps extends DocumentManagerModalProps {
    // documentService: IDocumentService;
    documents: Document[];
    chatSessions: ChatSession[];
}
