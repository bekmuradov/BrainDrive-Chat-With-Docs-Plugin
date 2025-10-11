import React from 'react';

import type { CreateCollectionForm } from './collectionViewTypes';

interface CollectionFormProps {
    newCollection: CreateCollectionForm;
    isCreating: boolean;
    handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleColorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCreateCollection: () => Promise<void>;
    handleCancelCreateForm: () => void;
}

export const CollectionForm: React.FC<CollectionFormProps> = ({
    newCollection,
    isCreating,
    handleNameChange,
    handleDescriptionChange,
    handleColorChange,
    handleCreateCollection,
    handleCancelCreateForm,
}) => {
    const isFormValid = newCollection.name?.trim().length > 0 && newCollection.description?.trim().length > 0;
    
    return (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Create New Collection</h3>
            <div className="space-y-4">
                {/* Name Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                        type="text"
                        value={newCollection.name}
                        onChange={handleNameChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter collection name"
                        disabled={isCreating}
                    />
                </div>
                {/* Description Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        value={newCollection.description}
                        onChange={handleDescriptionChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Enter collection description"
                        disabled={isCreating}
                    />
                </div>
                {/* Color Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input
                        type="color"
                        value={newCollection.color}
                        onChange={handleColorChange}
                        className="w-20 h-10 border border-gray-300 rounded-lg"
                        disabled={isCreating}
                    />
                </div>
                
                {/* Actions */}
                <div className="flex space-x-3">
                    <button
                        onClick={handleCreateCollection}
                        disabled={!isFormValid || isCreating}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                        {isCreating ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Create Collection'}
                    </button>
                    <button
                        onClick={handleCancelCreateForm}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
