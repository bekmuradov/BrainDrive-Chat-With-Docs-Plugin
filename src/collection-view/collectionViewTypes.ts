import type { Collection as GlobalCollection } from '../braindrive-plugin/pluginTypes';

// Use the Global type for the main data model
export type Collection = GlobalCollection;

// Local State Interfaces
export interface CollectionFeatureState {
    showCreateForm: boolean;
    newCollection: CreateCollectionForm;
    isCreating: boolean;
    currentViewMode: CollectionViewType;
}

// Data Models (moved from existing)
export interface CreateCollectionForm {
    name: string;
    description: string;
    color: string;
}

export enum CollectionViewType {
    GRID = 'grid',
    LIST = 'list'
}

// Public Service Methods (Handlers)
export type CollectionFormSubmitHandler = () => Promise<void>;
export type CollectionFormChangeHandler = (field: keyof CreateCollectionForm, value: string) => void;
export type CollectionFormToggleHandler = () => void;
export type ViewModeChangeHandler = (view: CollectionViewType) => void;

// Plugin Service
// Type for the setState function passed from the React component
export type CollectionViewStateUpdater = (newState: Partial<CollectionFeatureState>) => void;
