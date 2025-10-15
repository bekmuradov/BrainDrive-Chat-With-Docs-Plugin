import React from 'react';

import type { Document } from '../braindrive-plugin/pluginTypes';
import { DocumentListItem } from './DocumentListItem';
import { NoDocuments } from './NoDocuments';

interface ComponentProps {
    documents: Document[];
    onDocumentDelete: (docId: string, docFileName: string) => void;
	maxHeight?: string;
}

export const DocumentList: React.FC<ComponentProps> = ({
    documents,
    onDocumentDelete,
	maxHeight = "max-h-96"
}) => {
    return (
        <div className="bg-white rounded-lg">
            {documents.length === 0 ? (
                <NoDocuments />
            ) : (
              <div className={`h-full ${maxHeight} space-y-3 overflow-y-auto`}>
                {documents.map((doc) => (
                  <DocumentListItem key={doc.id} document={doc} onDocumentDelete={onDocumentDelete} />
                ))}
              </div>
            )}
        </div>
    )
}
