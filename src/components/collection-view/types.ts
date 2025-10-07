// Base Interfaces
export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  chat_session_count?: number;
}

// Component Props Interfaces
export interface CollectionsViewProps {
  collections: Collection[];
  onCollectionSelect: (collection: Collection) => void;
  onCollectionCreate: () => void;
  setError: (error: string | null) => void;
}

export interface CreateCollectionForm {
  name: string;
  description: string;
  color: string;
}

// Collections View State Interface
export interface CollectionsViewState {
  showCreateForm: boolean;
  newCollection: CreateCollectionForm;
  isCreating: boolean;
}

export enum CollectionViewType {
  GRID = 'grid',
  LIST = 'list'
}

// Collection Form Event Handlers
export type CollectionFormSubmitHandler = (form: CreateCollectionForm) => Promise<void>;
export type CollectionFormChangeHandler = (field: keyof CreateCollectionForm, value: string) => void;
export type CollectionFormCancelHandler = () => void;
