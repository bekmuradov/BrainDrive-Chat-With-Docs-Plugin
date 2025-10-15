import React from 'react';
import {FileText} from 'lucide-react';

export const NoDocuments: React.FC = () => {
    return (
        <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-600">Upload your first document to get started</p>
        </div>
    )
}
