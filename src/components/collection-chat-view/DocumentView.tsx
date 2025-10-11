// import React, { ChangeEvent } from 'react';
// import {
//   Upload,
//   Loader2,
//   X,
// } from 'lucide-react';

// import { BRAINDRIVE_CORE_API } from '../../constants';
// import { Document, ChatSession, ChatMessage } from '../../braindrive-plugin/pluginTypes';
// import { DocumentsViewProps } from './types';
// import { ChatSessions } from './ChatSessions';
// import { ChatView } from '../chat-view/ChatView';
// import { DocumentList } from './DocumentList';
// import { stopAllPolling, pollDocumentStatus, stopPollingDocument } from '../../services/documentPolling';
// import { validateFile, showToast, createPlaceholderDocument } from '../../helpers';


// interface DocumentWithPlaceholder extends Document {
//   isPlaceholder?: boolean;
// }

// interface DocumentsViewState {
//   uploading: boolean;
//   showSessionForm: boolean;
//   newSessionName: string;
//   documents: DocumentWithPlaceholder[];
//   showModal: boolean;
//   selectedSession: ChatSession | null;
//   chatMessages: ChatMessage[];
//   error: string | null;
// }

// interface DocumentWithPlaceholder extends Document {
//   isPlaceholder?: boolean;
// }

// interface DocumentsViewState {
//   uploading: boolean;
//   showSessionForm: boolean;
//   newSessionName: string;
//   documents: DocumentWithPlaceholder[];
//   showModal: boolean;
// }

// // const initialState: Document[] = [
// //     {
// //         "id": "563e9d97-84f3-4ea7-94b9-my-test-id",
// //         "original_filename": "Project Overview.docx",
// //         "file_size": 19109,
// //         "document_type": "docx",
// //         "collection_id": "699e163a-5e18-4d70-8ea5-bb4cad5922fb",
// //         "status": DocumentStatus.PROCESSING,
// //         "created_at": "2025-07-04T20:41:20.263928",
// //         "processed_at": "2025-07-04T20:42:01.074257",
// //         "metadata": {},
// //         "chunk_count": 1
// //     },
// //     {
// //         "id": "a7b2c9f1-3e45-4b89-92a1-test-doc-001",
// //         "original_filename": "Marketing Strategy Q3.pdf",
// //         "file_size": 45672,
// //         "document_type": "pdf",
// //         "collection_id": "699e163a-5e18-4d70-8ea5-bb4cad5922fb",
// //         "status": DocumentStatus.PROCESSED,
// //         "created_at": "2025-07-05T09:15:33.147892",
// //         "processed_at": "2025-07-05T09:16:45.892341",
// //         "metadata": {
// //             "author": "Sarah Johnson",
// //             "pages": 12
// //         },
// //         "chunk_count": 8,
// //     },
// //     {
// //         "id": "f4e8d2c6-7a91-4b35-8f12-test-doc-002",
// //         "original_filename": "Financial Report 2024.xlsx",
// //         "file_size": 82456,
// //         "document_type": "xlsx",
// //         "collection_id": "a12b34c5-6d78-9e01-2f34-56789abcdef0",
// //         "status": DocumentStatus.PROCESSED,
// //         "created_at": "2025-07-03T14:22:17.894756",
// //         "processed_at": "2025-07-03T14:24:03.156789",
// //         "metadata": {
// //             "sheets": 5,
// //             "last_modified": "2025-06-30T18:00:00Z"
// //         },
// //         "chunk_count": 15,
// //     },
// //     {
// //         "id": "b9c3f7e1-2d46-4a78-91b5-test-doc-003",
// //         "original_filename": "Team Meeting Notes.txt",
// //         "file_size": 3847,
// //         "document_type": "txt",
// //         "collection_id": "699e163a-5e18-4d70-8ea5-bb4cad5922fb",
// //         "status": DocumentStatus.FAILED,
// //         "created_at": "2025-07-06T11:30:45.123456",
// //         "processed_at": "2025-07-06T11:31:12.789012",
// //         "metadata": {},
// //         "chunk_count": 0,
// //         "error_message": "File corrupted during upload. Please re-upload the document."
// //     },
// //     {
// //         "id": "e5a8b2d4-9c17-4f63-8e92-test-doc-004",
// //         "original_filename": "Product Requirements Document.docx",
// //         "file_size": 67893,
// //         "document_type": "docx",
// //         "collection_id": "c78d91e2-3f45-6g78-9h01-234567890abc",
// //         "status": DocumentStatus.PROCESSED,
// //         "created_at": "2025-07-02T16:45:22.567890",
// //         "processed_at": "2025-07-02T16:47:18.234567",
// //         "metadata": {
// //             "version": "2.1",
// //             "author": "Alex Chen",
// //             "word_count": 4250
// //         },
// //         "chunk_count": 12,
// //     },
// //     {
// //         "id": "d7f1a3c8-5b29-4e84-97c6-test-doc-005",
// //         "original_filename": "User Research Findings.pdf",
// //         "file_size": 91234,
// //         "document_type": "pdf",
// //         "collection_id": "a12b34c5-6d78-9e01-2f34-56789abcdef0",
// //         "status": DocumentStatus.PROCESSING,
// //         "created_at": "2025-07-07T08:12:55.678901",
// //         "processed_at": "2025-07-07T08:13:22.345678",
// //         "metadata": {
// //             "pages": 24,
// //             "research_method": "interviews"
// //         },
// //         "chunk_count": 0,
// //     },
// //     {
// //         "id": "c2e6b4f9-8a35-4d71-92b8-test-doc-006",
// //         "original_filename": "API Documentation v3.2.md",
// //         "file_size": 28567,
// //         "document_type": "md",
// //         "collection_id": "c78d91e2-3f45-6g78-9h01-234567890abc",
// //         "status": DocumentStatus.PROCESSED,
// //         "created_at": "2025-07-01T13:28:41.789012",
// //         "processed_at": "2025-07-01T13:30:15.456789",
// //         "metadata": {
// //             "version": "3.2",
// //             "last_updated": "2025-06-28T10:00:00Z",
// //             "endpoints": 47
// //         },
// //         "chunk_count": 6,
// //     },
// //     {
// //         "id": "a9b5c1e7-4f83-4d26-98a4-test-doc-007",
// //         "original_filename": "Training Materials.pptx",
// //         "file_size": 156789,
// //         "document_type": "pptx",
// //         "collection_id": "699e163a-5e18-4d70-8ea5-bb4cad5922fb",
// //         "status": DocumentStatus.UPLOADED,
// //         "created_at": "2025-07-08T10:05:18.234567",
// //         "processed_at": "2025-07-08T10:05:18.234567",
// //         "metadata": {
// //             "slides": 45,
// //             "template": "corporate"
// //         },
// //         "chunk_count": 0
// //     },
// //     {
// //         "id": "f8c4d2a6-7e91-4b58-83f1-test-doc-008",
// //         "original_filename": "Database Schema Design.sql",
// //         "file_size": 12345,
// //         "document_type": "sql",
// //         "collection_id": "c78d91e2-3f45-6g78-9h01-234567890abc",
// //         "status": DocumentStatus.PROCESSED,
// //         "created_at": "2025-06-29T15:42:07.890123",
// //         "processed_at": "2025-06-29T15:43:33.567890",
// //         "metadata": {
// //             "tables": 18,
// //             "relationships": 12,
// //             "database_type": "PostgreSQL"
// //         },
// //         "chunk_count": 4,
// //     }
// // ];

// export class DocumentsView extends React.Component<DocumentsViewProps, DocumentsViewState> {
//   fileInputRef: React.RefObject<HTMLInputElement>;

//   constructor(props: DocumentsViewProps) {
//     super(props);
//     this.state = {
//       uploading: false,
//       showSessionForm: false,
//       newSessionName: '',
//       documents: [...(props.documents || [])],
//       showModal: false,
//       selectedSession: props.selectedSession || null,
//       chatMessages: [],
//       error: null,
//     };
//     this.fileInputRef = React.createRef();

//     // bind handlers if not using property initializers
//     this.handleFileUpload = this.handleFileUpload.bind(this);
//     this.handleDocumentDelete = this.handleDocumentDelete.bind(this);
//     this.handleCreateSession = this.handleCreateSession.bind(this);
//     this.handleSelectedChatSession = this.handleSelectedChatSession.bind(this);
//     this.handleDeleteSession = this.handleDeleteSession.bind(this);
//   }

//   componentDidMount() {
//     // select latest session by default
//     const { chatSessions } = this.props;
//     if (chatSessions.length) {
//       const latest = chatSessions[0];
//       this.handleSelectedChatSession(latest);
//     }
//   }

//   componentDidUpdate(prevProps: DocumentsViewProps, prevState: DocumentsViewState) {
//     // update documents
//     if (prevProps.documents !== this.props.documents) {
//       this.setState(prev => ({
//         documents: [
//           ...prev.documents.filter(d => d.isPlaceholder),
//           ...(this.props.documents || [])
//         ]
//       }));
//     }
//     // if sessions list changes, ensure selected remains valid
//     if (prevProps.chatSessions !== this.props.chatSessions) {
//       const { selectedSession } = this.state;
//       const { chatSessions } = this.props;
//       if (!selectedSession && chatSessions.length) {
//         this.handleSelectedChatSession(chatSessions[0])
//       }
//     }

//     if (prevProps.selectedSession !== this.props.selectedSession) {
//       console.log("New session: ", {
//         prev_session: prevProps.selectedSession?.name,
//         new_session: this.props.selectedSession?.name
//       })
//       if (this.props.selectedSession) {
//         this.handleSelectedChatSession(this.props.selectedSession)
//       }
//     }
//   }

//   componentWillUnmount() {
//     // Clean up any active polling when component unmounts
//     stopAllPolling();
//   }

//   handleSelectedChatSession(session: ChatSession) {
//     if (session) {
//       this.setState({ selectedSession: session }, () => this.loadChatMessages(session.id));
//     }
//   }

//   async loadChatMessages(sessionId: string) {
//     try {
//       const fetchResponse = await fetch(`${BRAINDRIVE_CORE_API}/chat/messages?session_id=${sessionId}`);
//         if (!fetchResponse.ok) throw new Error('Failed to load messages');
//         const response = await fetchResponse.json();
      
//       this.setState({ chatMessages: response });
//     } catch (err: any) {
//       this.setState({ error: err.message });
//     }
//   }

//   async handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     // Use the utility for file validation
//     const validation = validateFile(file, {
//       maxSizeBytes: 10 * 1024 * 1024, // 10MB
//       allowedExtensions: ['.pdf', '.doc', '.docx'],
//       allowedTypes: [
//         'application/pdf',
//         'application/msword',
//       ]
//     });

//     if (!validation.isValid) {
//       showToast(validation.error!, 'error');
//       e.target.value = '';
//       return;
//     }

//     // 1. Create placeholder document for immediate UI feedback
//     const placeholderDoc = createPlaceholderDocument(file, this.props.collection.id);
    
//     // Add placeholder to local state
//     this.setState((prevState) => ({
//       documents: [placeholderDoc, ...prevState.documents]
//     }));

//     this.setState({ uploading: true });
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('collection_id', this.props.collection.id);

//     try {
//       const response = await fetch(`${BRAINDRIVE_CORE_API}/documents/`, {
//         method: 'POST',
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error(`Failed to upload document: ${response.statusText}`);
//       }

//       const uploadedDocument = await response.json();
//       showToast(`Successfully uploaded "${file.name}"`, 'success');

//       // 2. Replace placeholder with actual document
//       this.setState((prevState) => ({
//         documents: prevState.documents.map(doc => 
//           doc.id === placeholderDoc.id 
//             ? { ...uploadedDocument, isPlaceholder: false }
//             : doc
//         )
//       }));
//       // 3. Start polling for document status
//       pollDocumentStatus(
//         uploadedDocument.id,
//         // onStatusUpdate callback
//         (updatedDoc) => {
//           this.setState((prevState) => ({
//             documents: prevState.documents.map(doc =>
//               doc.id === uploadedDocument.id
//                 ? { ...updatedDoc, isPlaceholder: false }
//                 : doc
//             )
//           }));
//           console.log("Updated doc: ", updatedDoc);

//           console.log("State documents: ", this.state.documents);
//         },
//         // options
//         {
//           apiBase: BRAINDRIVE_CORE_API,
//           onComplete: (finalDoc) => {
//             this.setState({ uploading: false });
//             // Refresh the parent component's document list
//             this.props.onDocumentUpload();
//           },
//           onError: (error) => {
//             showToast(`Error polling document status: ${error}`, 'error');
//             // Remove the document from local state on error
//             this.setState((prevState) => ({
//               documents: prevState.documents.filter(doc => doc.id !== uploadedDocument.id)
//             }));
//           }
//         }
//       );
//     } catch (err: any) {
//       const errorMessage = err.message || 'Failed to upload document';
//       showToast(errorMessage, 'error');
//       this.props.setError(errorMessage);

//       // Remove placeholder on error
//       this.setState(prevState => ({
//         documents: prevState.documents.filter(doc => doc.id !== placeholderDoc.id)
//       }));
//     } finally {
//       // this.setState({ uploading: false });
//       // Utils.hideLoading();
//       e.target.value = '';
//     }
//   }

//   async handleDocumentDelete(documentId: string, documentName: string) {
//     if (!confirm(`Are you sure you want to delete "${documentName}"?`)) return;

//     // Utils.showLoading(`Deleting "${documentName}"...`);

//     try {
//       // Stop any active polling for this document
//       stopPollingDocument(documentId);

//       const response = await fetch(`${BRAINDRIVE_CORE_API}/documents/${documentId}`, {
//         method: 'DELETE',
//       });

//       if (!response.ok) {
//         throw new Error(`Failed to delete document: ${response.statusText}`);
//       }

//       showToast(`Successfully deleted "${documentName}"`, 'success');

//       // Remove from local state immediately
//       this.setState(prevState => ({
//         documents: prevState.documents.filter(doc => doc.id !== documentId)
//       }));

//       this.props.onDocumentDelete();
//     } catch (err: any) {
//       const errorMessage = err.message || 'Failed to delete document';
//       showToast(errorMessage, 'error');
//       this.props.setError(errorMessage);
//     } finally {
//       // Utils.hideLoading();
//     }
//   }

//   async handleCreateSession() {
//     const { newSessionName } = this.state;
//     const trimmedName = newSessionName.trim();

//     if (!trimmedName) {
//       showToast('Please enter a session name', 'warning');
//       return;
//     }

//     try {
//       const response = await fetch(`${BRAINDRIVE_CORE_API}/chat/sessions`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name: newSessionName,
//           collection_id: this.props.collection.id,
//         }),
//       });

//       if (!response.ok) {
//         throw new Error(`Failed to create chat session: ${response.statusText}`);
//       }

//       showToast(`Created session "${trimmedName}"`, 'success');
//       this.setState({ newSessionName: '', showSessionForm: false });
//       this.props.onChatSessionCreate();
//     } catch (err: any) {
//       const errorMessage = err.message || 'Failed to create chat session';
//       showToast(errorMessage, 'error');
//       this.props.setError(errorMessage);
//     }
//   }

//   // TODO: Implement chat session delete with propagation
//   async handleDeleteSession(sessionId: string, sessionName: string) {
//     if (!confirm(`Are you sure you want to delete the chat session "${sessionName}"? This action will permanently delete all messages in this session.`)) {
//       return;
//     }

//     // Utils.showLoading(`Deleting "${sessionName}"...`);

//     try {
//       const response = await fetch(`${BRAINDRIVE_CORE_API}/chat/sessions/${sessionId}`, {
//         method: 'DELETE',
//       });

//       if (!response.ok) {
//         throw new Error(`Failed to delete document: ${response.statusText}`);
//       }

//       showToast(`Successfully deleted "${sessionName}"`, 'success');

//       // --- NEW LOGIC FOR SELECTING THE NEXT SESSION ---
//       const { selectedSession, chatMessages } = this.state;
//       const { onChatSessionDelete, chatSessions } = this.props;

//       // Check if the deleted session was the currently selected one
//       if (selectedSession && selectedSession.id === sessionId) {
//         // Find the index of the deleted session in the prop's list
//         const deletedIndex = chatSessions.findIndex(s => s.id === sessionId);

//         let nextSession = null;
//         // Check if there is a session after the deleted one
//         if (chatSessions[deletedIndex + 1]) {
//             nextSession = chatSessions[deletedIndex + 1];
//         } 
//         // If not, check if there is a session before the deleted one
//         else if (chatSessions[deletedIndex - 1]) {
//             nextSession = chatSessions[deletedIndex - 1];
//         } 
//         // If it was the only session, set selectedSession to null
//         else {
//             nextSession = null;
//         }

//         // Update the state with the new selected session or null
//         this.setState({selectedSession: nextSession}, () => {
//           if (this.state.selectedSession) {
//             this.loadChatMessages(this.state.selectedSession.id)
//           } else {
//             this.setState({ chatMessages: [] })
//           }
//         });
//       }

//       onChatSessionDelete();
//     } catch (err: any) {
//       const errorMessage = err.message || 'Failed to delete document';
//       showToast(errorMessage, 'error');
//       this.props.setError(errorMessage);
//     } finally {
//       // Utils.hideLoading();
//     }
//   }

//   toggleModal = () => {
//     this.setState((s) => ({ showModal: !s.showModal }));
//   };

//   render() {
//     const {
//       documents,
//       uploading,
//       showSessionForm,
//       newSessionName,
//       showModal,
//       selectedSession,
//       chatMessages
//     } = this.state;
//     const { chatSessions, apiService } = this.props;

//     return (
//       <div className="h-[700px] overflow-y-auto">
//         <div className="space-y-6 mb-8">
//           {/* Chat view at top */}
//           {selectedSession && (
//             <ChatView
//               apiService={apiService}
//               session={selectedSession}
//               messages={chatMessages}
//               onMessageSent={() => this.loadChatMessages(selectedSession.id)}
//               setError={msg => this.setState({ error: msg })}
//             />
//           )}

//           {/* Project files button and sessions list */}
//           <div className="space-y-4">
//             <div className="flex space-x-2 items-center mb-6">
//               <button
//                 onClick={this.toggleModal}
//                 className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2"
//               >
//                 <span className="font-medium">Project files</span>
//                 <span className="bg-blue-500 text-white rounded-full px-2 text-sm">
//                   {documents.length}
//                 </span>
//               </button>
//             </div>

//             {/* Scrollable Chat Sessions */}
//             <div className="max-h-96 overflow-y-auto">
//               <ChatSessions
//                 chatSessions={chatSessions}
//                 onChatSessionSelect={this.handleSelectedChatSession}
//                 onChatSessionDelete={this.handleDeleteSession}
//               />
//             </div>
//           </div>

//           {/* Documents modal */}
//           {showModal && (
//             <div className="fixed inset-0 bg-[rgba(115, 112, 112, 0.70)] dark:bg-[rgba(37, 36, 69, 0.7)] z-40 flex items-center justify-center">
//               <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full mx-4 relative z-50">
//                 <div className="flex justify-between items-center border-b px-6 py-4">
//                   <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Files</h3>
//                   <button onClick={this.toggleModal} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
//                     <X className="h-5 w-5" />
//                   </button>
//                 </div>

//                 <div className="p-6 text-gray-600 dark:text-gray-300">
//                   <div className="flex justify-between items-center mb-4">
//                     <h4 className="text-md font-medium">Documents</h4>
//                     <div>
//                       <input
//                         type="file"
//                         ref={this.fileInputRef}
//                         onChange={e => this.handleFileUpload(e)}
//                         accept=".pdf,.doc,.docx"
//                         className="hidden"
//                       />
//                       <button
//                         onClick={() => this.fileInputRef.current?.click()}
//                         disabled={uploading}
//                         className="bg-blue-500 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center text-sm disabled:opacity-50"
//                       >
//                         {uploading
//                           ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                           : <Upload className="h-4 w-4 mr-2" />
//                         }
//                         {uploading ? 'Uploading…' : 'Upload Document'}
//                       </button>
//                     </div>
//                   </div>
//                   <DocumentList
//                     documents={documents}
//                     onDocumentDelete={(id, name) => this.handleDocumentDelete(id, name)}
//                   />
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   }
// }
