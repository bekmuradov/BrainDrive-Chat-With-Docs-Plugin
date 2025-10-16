import { 
    IDocumentService, 
    DocumentServiceState, 
    DocumentWithPlaceholder, 
    DocumentManagerModalProps
} from './DocumentsView.types'; 
import { Document, ChatSession } from '../braindrive-plugin/pluginTypes'; 
import { validateFile, showToast, createPlaceholderDocument } from '../helpers';
import { stopAllPolling, pollDocumentStatus, stopPollingDocument } from '../services/documentPolling';
import { CHAT_SERVICE_API_BASE } from '../constants';

// Use the ApiService defined in types.ts
type ApiService = DocumentManagerModalProps['apiService'];


export class DocumentService implements IDocumentService {
    private state: DocumentServiceState;
    private listeners: Set<(state: DocumentServiceState) => void> = new Set();
    private apiService: ApiService;

    constructor(apiService: ApiService) {
        this.apiService = apiService;
        this.state = {
            documents: [],
            uploading: false,
            error: null,
            selectedSession: null,
            selectedCollection: null,
        };
    }

    // --- State Management ---
    public updateState(newState: Partial<DocumentServiceState>): void {
        this.state = { ...this.state, ...newState };
        this.listeners.forEach(listener => listener(this.state));
    }

    public getState(): DocumentServiceState {
        return this.state;
    }

    public subscribe(listener: (state: DocumentServiceState) => void): () => void {
        this.listeners.add(listener);
        listener(this.state); 
        return () => this.listeners.delete(listener);
    }
    
    // --- Lifecycle and Initialization ---

    public initialize(initialDocuments: Document[] | undefined, initialSessions: ChatSession[]): void {
        const latestSession = initialSessions.length > 0 ? initialSessions[0] : null;

        this.updateState({ 
            documents: initialDocuments || [],
            // Important: We only manage selectedSession and messages, the full list comes from props
            selectedSession: latestSession 
        });
    }

    public cleanup(): void {
        stopAllPolling();
        this.listeners.clear();
    }

    // --- Document Methods ---

    public uploadFile = async (file: File, collectionId: string): Promise<void> => {
        // ... (File validation logic is now here) ...
        const validation = validateFile(file, { maxSizeBytes: 10 * 1024 * 1024, allowedExtensions: ['.pdf', '.doc', '.docx'] });
        if (!validation.isValid) {
            showToast(validation.error!, 'error');
            return;
        }

        const placeholderDoc = createPlaceholderDocument(file, collectionId);
        this.updateState({ documents: [placeholderDoc, ...this.state.documents], uploading: true });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('collection_id', collectionId);

        try {
            // Use injected apiService for POST
            // const uploadedDocument = await this.apiService?.post<Document>(
            //     `${CHAT_SERVICE_API_BASE}/documents/`, 
            //     formData
            // );

            const response = await fetch(`${CHAT_SERVICE_API_BASE}/documents/`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const uploadedDocument: Document = await response.json();
            
            if (uploadedDocument) {
                showToast(`Successfully uploaded "${file.name}"`, 'success');

                // 1. Replace placeholder and update state
                this.updateState({
                    documents: this.state.documents.map(doc => 
                        doc.id === placeholderDoc.id ? { ...uploadedDocument, isPlaceholder: false } as DocumentWithPlaceholder : doc
                    )
                });

                // 2. Start polling and update state on status change
                pollDocumentStatus(
                    uploadedDocument.id,
                    (updatedDoc) => {
                        this.updateState({
                            documents: this.state.documents.map(doc =>
                                doc.id === uploadedDocument.id ? { ...updatedDoc, isPlaceholder: false } as DocumentWithPlaceholder : doc
                            )
                        });
                    },
                    {
                        apiBase: CHAT_SERVICE_API_BASE,
                        onComplete: (finalDoc) => this.updateState({ uploading: false }),
                        onError: (error) => {
                            showToast(`Error polling status: ${error}`, 'error');
                            this.updateState({ documents: this.state.documents.filter(doc => doc.id !== uploadedDocument.id) });
                        }
                    }
                );
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to upload document';
            showToast(errorMessage, 'error');
            this.updateState({ 
                error: errorMessage, 
                documents: this.state.documents.filter(doc => doc.id !== placeholderDoc.id),
                uploading: false
            });
        }
    }

    public deleteDocument = async (documentId: string, documentName: string): Promise<void> => {
        if (!confirm(`Are you sure you want to delete "${documentName}"?`)) return;

        try {
            stopPollingDocument(documentId);

            // Use injected apiService for DELETE
            await this.apiService?.delete(`${CHAT_SERVICE_API_BASE}/documents/${documentId}`);

            showToast(`Successfully deleted "${documentName}"`, 'success');

            // Remove from local state immediately
            this.updateState({ documents: this.state.documents.filter(doc => doc.id !== documentId) });
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to delete document';
            showToast(errorMessage, 'error');
            this.updateState({ error: errorMessage });
        }
    }
}
