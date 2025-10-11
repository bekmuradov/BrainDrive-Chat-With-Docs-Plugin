import type { DataRepository } from '../braindrive-plugin/DataRepository';
import type { 
    CollectionFeatureState,
    CollectionViewStateUpdater,
    CollectionViewType,
    CreateCollectionForm,
} from './collectionViewTypes';
import { CHAT_SERVICE_API_BASE } from '../constants';


// Props passed down from the Main PluginService
interface ServiceDependencies {
    dataRepository: DataRepository;
    // We only need the top-level setError function from the main service
    setError: (error: string | null) => void; 
    // Callback to refresh data in the parent component (PluginService)
    onCollectionsUpdated: () => Promise<void>; 
}


export class CollectionService {
    private state: CollectionFeatureState;
    private updateShellState: CollectionViewStateUpdater; // Local setState for the Shell
    private deps: ServiceDependencies;

    constructor(
        initialState: CollectionFeatureState, 
        deps: ServiceDependencies, 
        updateShellState: CollectionViewStateUpdater
    ) {
        this.state = initialState;
        this.deps = deps;
        this.updateShellState = updateShellState;
    }

    // --- Private State Management ---

    private updateState(newState: Partial<CollectionFeatureState>): void {
        this.state = { ...this.state, ...newState } as CollectionFeatureState;
        this.updateShellState(newState);
    }
    
    // --- Public Handlers (Logic) ---

    public handleFormChange = (field: keyof CreateCollectionForm, value: string): void => {
        this.updateState({ 
            newCollection: { ...this.state.newCollection, [field]: value } 
        });
    }

    public handleToggleCreateForm = (): void => {
        // Toggle the form visibility
        const isCurrentlyShown = this.state.showCreateForm;
        this.updateState({ 
            showCreateForm: !isCurrentlyShown,
            // Reset form fields only when hiding/canceling
            newCollection: isCurrentlyShown 
                ? { name: '', description: '', color: '#3B82F6' } 
                : this.state.newCollection 
        });
    }

    public handleViewModeChange = (viewType: CollectionViewType): void => {
        this.updateState({ currentViewMode: viewType });
    }
    
    // NOTE: This logic should ideally be moved to the DataRepository. 
    // For now, we keep the original fetch implementation but house it here 
    // in the Service, since we cannot yet inject a 'createCollection' into the Repo.
    public handleCreateCollection = async (): Promise<void> => {
        if (!this.state.newCollection.name?.trim()) return;

        this.updateState({ isCreating: true });
        this.deps.setError(null);
        
        try {
            const { newCollection } = this.state;
            
            // NOTE: Replace this raw fetch with a dataRepository.createCollection(newCollection) 
            // once that method is added to DataRepository.
            const response = await fetch(`${CHAT_SERVICE_API_BASE}/collections/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCollection),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create collection');
            }

            // Success: Reset state and notify parent service to refresh data
            this.updateState({
                newCollection: { name: '', description: '', color: '#3B82F6' },
                showCreateForm: false,
            });
            await this.deps.onCollectionsUpdated();

        } catch (err: any) {
            this.deps.setError(err.message || 'An unknown error occurred during collection creation.');
        } finally {
            this.updateState({ isCreating: false });
        }
    }
}
