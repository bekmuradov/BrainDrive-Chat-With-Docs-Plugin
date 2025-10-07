import React from "react";
import {FolderOpen} from 'lucide-react';

export const NoCollections: React.FC = () => {
    return (
        <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No collections yet</h3>
            <p className="text-gray-600">Create your first collection to get started</p>
        </div>
    )
}
