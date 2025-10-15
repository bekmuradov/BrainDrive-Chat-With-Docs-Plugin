import React, { ChangeEvent } from 'react';
import { Upload, Loader2, X } from 'lucide-react';

import { 
    DocumentManagerModalInjectedProps, 
    DocumentManagerModalState, 
    DocumentWithPlaceholder
} from './DocumentsView.types'; 
// Import components
import { DocumentList } from './DocumentList';
import { showToast } from '../helpers';
import { DocumentService } from './DocumentService';

export class DocumentManagerModal extends React.Component<DocumentManagerModalInjectedProps, DocumentManagerModalState> {
    // service instance
    private documentService: DocumentService;
    fileInputRef: React.RefObject<HTMLInputElement>;
    private unsubscribeService?: () => void;

    constructor(props: DocumentManagerModalInjectedProps) {
        super(props);
        this.documentService = new DocumentService(props.apiService);
        const initialState = this.documentService.getState();
        
        // Local state is minimal, holding UI state (showModal) and a copy of relevant service state for rendering
        this.state = {
            showModal: false,
            documents: initialState.documents,
            uploading: initialState.uploading,
            selectedSession: initialState.selectedSession,
        };
        this.fileInputRef = React.createRef();
    }

    /**
     * Helper to load all necessary data for the current collection.
     * This method assumes DocumentService has a public loadDataForCollection(collectionId: string) method.
     */
    private loadDataForCollection = async (collectionId: string) => {
        // Assume documentService has a method to fetch both documents and sessions
        // which then updates the state that the component is subscribed to.
        try {
            // NOTE: You must implement this method in your DocumentService.ts
            const documents = await this.props.dataRepository.getDocuments(collectionId);
            this.setState({documents: documents});
        } catch (error) {
            // Error is handled via subscription, but this catch ensures the promise chain is complete.
            console.error("Failed to load data for collection:", error);
        }
    }
    
    /**
     * Subscribes to the service state to keep the component's rendering state up-to-date.
     */
    componentDidMount() {
        // Initialize the service with the initial data coming from parent component props
        this.documentService.initialize(
            this.props.documents,
            this.props.chatSessions
        );

        // Subscribe to state changes from the service
        this.unsubscribeService = this.documentService.subscribe(serviceState => {
            // Map service state to component state
            this.setState({
                documents: serviceState.documents,
                uploading: serviceState.uploading,
                selectedSession: serviceState.selectedSession,
            });
            
            // Handle error toast on service error (clearing the error in the service afterwards)
            if (serviceState.error) {
                showToast(serviceState.error, 'error');
                this.documentService.updateState({ error: null });
            }
        });

        this.loadDataForCollection(this.props.collectionId);
    }
    
    /**
     * If the parent component's lists change, re-initialize the service to maintain consistency.
     */
    componentDidUpdate(prevProps: DocumentManagerModalInjectedProps) {
        if (prevProps.collectionId !== this.props.collectionId) {
            this.loadDataForCollection(this.props.collectionId);
            // Optionally close the modal if the collection changes
            this.setState({ showModal: false });
        }
    }

    componentWillUnmount() {
        if (this.unsubscribeService) {
            this.unsubscribeService();
        }
        this.documentService.cleanup();
    }
    
    // --- Handlers (Delegate to Service) ---

    handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Delegate entire upload logic to the service
        this.documentService.uploadFile(file, this.props.collectionId)
            .then(() => {
                 this.props.onDocumentListChange(); // Notify parent on success/completion
            });

        e.target.value = ''; // Reset file input
    }
    
    handleDocumentDelete = (id: string, name: string) => {
        this.documentService.deleteDocument(id, name)
            .then(() => {
                 this.props.onDocumentListChange(); // Notify parent on success
            });
    }
    
    // --- UI State Management (Kept in component) ---

    toggleModal = () => {
        this.setState((s) => ({ showModal: !s.showModal }));
    };

    render() {
        const {
            documents,
            uploading,
            showModal,
        } = this.state;

        return (
            <div className="header-docs-section overflow-y-auto">
                <div className="space-y-6 mb-8">
                    {/* Project files button and sessions list */}
                    <div className="space-y-4">
                        <div className="flex space-x-2 items-center mb-6">
                            <button
                                onClick={this.toggleModal}
                                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2"
                            >
                                <span className="font-medium">Project files</span>
                                <span className="bg-blue-500 text-white rounded-full px-2 text-sm">
                                    {documents.length}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Documents modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-[rgba(115, 112, 112, 0.70)] dark:bg-[rgba(37, 36, 69, 0.7)] z-40 flex items-center justify-center">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full mx-4 relative z-50">
                                <div className="flex justify-between items-center border-b px-6 py-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Files</h3>
                                    <button onClick={this.toggleModal} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="p-6 text-gray-600 dark:text-gray-300">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-md font-medium">Documents</h4>
                                        <div>
                                            <input
                                                type="file"
                                                ref={this.fileInputRef}
                                                onChange={this.handleFileSelect}
                                                accept=".pdf,.doc,.docx"
                                                className="hidden"
                                            />
                                            <button
                                                onClick={() => this.fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="bg-blue-500 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center text-sm disabled:opacity-50"
                                            >
                                                {uploading
                                                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    : <Upload className="h-4 w-4 mr-2" />
                                                }
                                                {uploading ? 'Uploading…' : 'Upload Document'}
                                            </button>
                                        </div>
                                    </div>
                                    <DocumentList
                                        documents={documents}
                                        onDocumentDelete={this.handleDocumentDelete}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
