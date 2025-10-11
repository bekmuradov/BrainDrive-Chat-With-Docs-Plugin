import React from "react";
import {
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle,
    Clock,
    Download
} from 'lucide-react';
import { formatDate } from "../../utils";
import { DocumentStatus, type Document } from '../../braindrive-plugin/pluginTypes';

interface ComponentProps {
    document: Document;
    onDocumentDelete: (docId: string, docFileName: string) => void;
}

export const DocumentListItem: React.FC<ComponentProps> = ({document, onDocumentDelete}) => {
    const getStatusColor = (status: DocumentStatus) => {
        switch (status) {
            case DocumentStatus.PROCESSED:
                return 'bg-green-100 text-green-800';
            case DocumentStatus.PROCESSING:
                return 'bg-yellow-100 text-yellow-800';
            case DocumentStatus.FAILED:
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }
    
    const getFileIcon = (documentType: string) => {
        switch (documentType.toLowerCase()) {
            case 'pdf':
                return 'file-text';
            case 'doc':
            case 'docx':
                return 'file-text';
            case 'txt':
                return 'file-text';
            default:
                return 'file';
        }
    }
    
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    const statusColor = getStatusColor(document.status);
    const fileIcon = getFileIcon(document.document_type);
    const fileSize = formatFileSize(document.file_size);
    const processedDate = document.processed_at ? formatDate(document.processed_at) : 'Processing...';
    
    // Return JSX elements instead of HTML strings
    const getStatusElement = () => {
        if (document.status === 'processing' || document.status === 'uploaded') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <svg className="animate-spin -ml-0.5 mr-1 h-4 w-4 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    processing
                </span>
            );
        } else if (document.status === 'processed') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    processed
                </span>
            );
        } else if (document.status === 'failed') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    failed
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {document.status}
                </span>
            );
        }
    };

    const getStatusIcon = (status: DocumentStatus) => {
        switch (status) {
            case DocumentStatus.PROCESSED:
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case DocumentStatus.PROCESSING:
                return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
            case DocumentStatus.FAILED:
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Clock className="h-5 w-5 text-gray-500" />;
        }
    }
    
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                        <i data-lucide={fileIcon} className="h-8 w-8 text-gray-400"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-medium text-gray-900 truncate">
                            {document.original_filename}
                        </h5>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                            <span>{fileSize}</span>
                            <span>{document.document_type.toUpperCase()}</span>
                            {document.chunk_count && <span>{document.chunk_count} chunks</span>}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            <span>Uploaded: {formatDate(document.created_at)}</span>
                            {document.processed_at && (
                                <span className="ml-4">Processed: {processedDate}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {getStatusElement()}
                    <div className="flex space-x-1">
                        <button
                            className="p-1 text-gray-400 hover:text-gray-600" 
                            title={`Download ${document.original_filename}`}
                        >
                            <Download className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onDocumentDelete(document.id, document.original_filename)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title={`Delete ${document.original_filename}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
            {/* Alternative item element */}
            <div className="p-4 hover:bg-gray-50 hidden">
                <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {getStatusIcon(document.status)}
                    <div>
                    <h4 className="text-sm font-medium text-gray-900">{document.original_filename}</h4>
                    <p className="text-sm text-gray-500">
                        {document.document_type} • {(document.file_size / 1024).toFixed(1)} KB
                        {document.chunk_count > 0 && ` • ${document.chunk_count} chunks`}
                    </p>
                    </div>
                </div>
                <button
                    onClick={() => onDocumentDelete(document.id, document.original_filename)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title={`Delete ${document.original_filename}`}
                >
                    <Trash2 className="h-4 w-4" />
                </button>
                </div>
            </div>
        </div>
    )
}
