import React from 'react';
import { Plus } from 'lucide-react';

// Imports from the local feature directory
import { CollectionService } from './CollectionService';
import { CollectionForm } from './CollectionForm';
import { CollectionsList } from './CollectionsList';
import { CollectionViewModeToggle } from './CollectionViewModeToggle';
import { NoCollections } from './NoCollections';
import { Collection, CollectionFeatureState, CollectionViewType } from './collectionViewTypes';

// Props received from the parent PluginShell
interface CollectionsViewProps {
    collections: Collection[];
    onCollectionSelect: (collection: Collection) => void;
    // Data & Error Callbacks from PluginService (via PluginShell)
    onCollectionCreate: () => Promise<void>; // Refreshes collection list in parent
    setError: (error: string | null) => void;
    dataRepository: any; // Using 'any' as a placeholder for the DataRepository instance
}

// Initial state for the local Service
const initialState: CollectionFeatureState = {
    showCreateForm: false,
    newCollection: { name: '', description: '', color: '#3B82F6' },
    isCreating: false,
    currentViewMode: CollectionViewType.LIST,
};

// State interface for this component (reflects the state managed by the local Service)
interface ComponentState extends CollectionFeatureState {}


export class CollectionViewShell extends React.Component<CollectionsViewProps, ComponentState> {
    private collectionService: CollectionService;

    constructor(props: CollectionsViewProps) {
        super(props);
        
        // Initialize local component state from the service's initial state
        this.state = initialState;

        // Initialize the local Service, injecting the necessary dependencies
        this.collectionService = new CollectionService(
            initialState, 
            {
                dataRepository: props.dataRepository,
                setError: props.setError,
                onCollectionsUpdated: props.onCollectionCreate,
            },
            (newState) => this.setState((prev) => ({ ...prev, ...newState }))
        );
    }
    
    // Pass-through render function
    private renderCreateForm() {
        const { showCreateForm, newCollection, isCreating } = this.state;
        
        if (!showCreateForm) return null;

        return (
            <CollectionForm
                newCollection={newCollection}
                isCreating={isCreating}
                handleNameChange={(e) => this.collectionService.handleFormChange('name', e.target.value)}
                handleDescriptionChange={(e) => this.collectionService.handleFormChange('description', e.target.value)}
                handleColorChange={(e) => this.collectionService.handleFormChange('color', e.target.value)}
                handleCreateCollection={this.collectionService.handleCreateCollection}
                handleCancelCreateForm={this.collectionService.handleToggleCreateForm}
            />
        );
    }

    render() {
        const { collections, onCollectionSelect } = this.props;
        const { currentViewMode } = this.state;
        
        // Destructure handlers from the service
        const { handleToggleCreateForm, handleViewModeChange } = this.collectionService;

        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div className="px-4 sm:px-6">
                        <h2 className="text-lg leading-6 font-medium text-gray-900">Your Collections</h2>
                        <p className="max-w-2xl text-sm text-gray-500">Organize your documents into collections for better management</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <CollectionViewModeToggle 
                            currentViewMode={currentViewMode}
                            onViewModeChange={handleViewModeChange}
                        />
                        
                        <button
                            onClick={handleToggleCreateForm}
                            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Collection
                        </button>
                    </div>
                </div>

                {/* Render the Form */}
                {this.renderCreateForm()}

                {/* Collections Section */}
                {collections.length === 0 ? (
                    <NoCollections />
                ) : (
                    <CollectionsList 
                        collections={collections} 
                        onCollectionSelect={onCollectionSelect} 
                        viewMode={currentViewMode} 
                    />
                )}
            </div>
        );
    }
}
