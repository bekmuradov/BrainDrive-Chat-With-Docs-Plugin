import React from "react";
import { ChevronRight } from 'lucide-react';
import { type Collection, CollectionViewType } from './types';
import { formatDate } from "../../utils";

interface ComponentProps {
    collections: Collection[];
    onCollectionSelect: (collection: Collection) => void;
    viewMode: CollectionViewType;
    maxHeight?: string;
}

export const CollectionsList: React.FC<ComponentProps> = ({
    collections,
    onCollectionSelect,
    viewMode,
    maxHeight = "max-h-96"
}) => {
    const renderListItem = (collection: Collection) => {
        const collectionIndicatorStyle = {
            backgroundColor: collection.color
        };
        
        return (
            <li
                key={collection.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onCollectionSelect(collection)}
            >
                <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <div 
                            className="w-3 h-3 rounded-full mr-3" 
                            style={collectionIndicatorStyle}
                            aria-label="Collection color indicator"
                        />
                        <div>
                            <p className="text-sm font-medium text-gray-900">{collection.name}</p>
                            <p className="text-sm text-gray-500">{collection.description || 'No description'}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{formatDate(collection.created_at)}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                </div>
            </li>
        );
    };
    const renderGridItem = (collection: Collection) => {
        const collectionIndicatorStyle = {
            backgroundColor: collection.color
        };

        return (
            <div
                key={collection.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onCollectionSelect(collection)}
            >
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <div
                            className="w-4 h-4 rounded-full mr-3"
                            style={collectionIndicatorStyle}
                            aria-label="Collection color indicator"
                        />
                        <h3 className="text-lg font-medium text-gray-900">{collection.name}</h3>
                    </div>
                    <p className="text-gray-600 mb-4">{collection.description || 'No description'}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{collection.document_count || 0} documents</span>
                        <span>{formatDate(collection.created_at)}</span>
                    </div>
                </div>
            </div>
        );
    };

    if (viewMode === CollectionViewType.GRID) {
        return (
            <div className={`h-full ${maxHeight} overflow-y-auto overflow-x-hidden`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
                    {collections.map((collection) => renderGridItem(collection))}
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full ${maxHeight} overflow-y-auto`}>
            <ul id="collections-list" className="divide-y divide-gray-200">
                {collections.map((collection) => renderListItem(collection))}
            </ul>
        </div>
    )
}
