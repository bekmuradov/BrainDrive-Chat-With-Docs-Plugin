import React from "react";
import { LayoutGrid, LayoutList } from 'lucide-react';

import { CollectionViewType } from './collectionViewTypes';

interface ComponentProps {
    currentViewMode: CollectionViewType;
    onViewModeChange: (view: CollectionViewType) => void;
}

export const CollectionViewModeToggle: React.FC<ComponentProps> = ({currentViewMode, onViewModeChange}) => {
    return (
        <div className="flex bg-gray-100 rounded-lg p-1">
            <button
                onClick={() => onViewModeChange(CollectionViewType.LIST)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentViewMode === CollectionViewType.LIST 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-label="List view"
            >
                <LayoutList className="h-4 w-4" />
            </button>
            <button
                onClick={() => onViewModeChange(CollectionViewType.GRID)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentViewMode === CollectionViewType.GRID 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-label="Grid view"
            >
                <LayoutGrid className="h-4 w-4" />
            </button>
        </div>
    )
}
