import React from 'react';
import {Plus} from 'lucide-react';

import { BRAINDRIVE_CORE_API } from '../../constants';
import { type CollectionsViewProps, type Collection, CollectionViewType } from './types';

import { NoCollections } from './NoCollections';
import { CollectionsList } from './CollectionsList';
import { CollectionViewModeToggle } from './CollectionViewModeToggle';

// Define the state interface for the class component
interface CollectionsViewState {
  showCreateForm: boolean;
  newCollection: Partial<Collection>;
  currentViewMode: CollectionViewType;
}

/**
 * Collections View Component
 * Displays a list of collections and provides functionality to create new ones.
 * This is a class-based component.
 */
export class CollectionsView extends React.Component<CollectionsViewProps, CollectionsViewState> {
  constructor(props: CollectionsViewProps) {
    super(props);
    // Initialize the component's state
    this.state = {
      showCreateForm: false, // Controls visibility of the create collection form
      newCollection: {
        name: '',
        description: '',
        color: '#3B82F6' // Default color for new collections
      },
      currentViewMode: CollectionViewType.LIST
    };

    // Bind event handlers to the component instance
    // This ensures 'this' context is correct when these methods are called
    this.handleCreateCollection = this.handleCreateCollection.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleDescriptionChange = this.handleDescriptionChange.bind(this);
    this.handleColorChange = this.handleColorChange.bind(this);
    this.handleShowCreateForm = this.handleShowCreateForm.bind(this);
    this.handleCancelCreateForm = this.handleCancelCreateForm.bind(this);
    this.handleViewModeChange = this.handleViewModeChange.bind(this);
  }

  /**
   * Handles the creation of a new collection by sending a POST request to the API.
   * Updates the state and triggers the onCollectionCreate prop on success.
   * Catches and sets errors if the API call fails.
   */
  async handleCreateCollection() {
    try {
      // Destructure newCollection from the component's state
      const { newCollection } = this.state;

      // Send a POST request to create the new collection
      const response = await fetch(`${BRAINDRIVE_CORE_API}/collections/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCollection),
      });

      // Check if the response was successful
      if (!response.ok) {
        // If not successful, throw an error with the response status
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create collection');
      }

      // Reset the new collection form fields and hide the form
      this.setState({
        newCollection: { name: '', description: '', color: '#3B82F6' },
        showCreateForm: false
      });

      // Call the parent component's callback to refresh the collection list
      this.props.onCollectionCreate();
    } catch (err: any) {
      // Set the error state in the parent component
      this.props.setError(err.message);
    }
  }

  /**
   * Updates the 'name' field of the newCollection state.
   * @param e The change event from the input field.
   */
  handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState(prevState => ({
      newCollection: { ...prevState.newCollection, name: e.target.value }
    }));
  }

  /**
   * Updates the 'description' field of the newCollection state.
   * @param e The change event from the textarea.
   */
  handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    this.setState(prevState => ({
      newCollection: { ...prevState.newCollection, description: e.target.value }
    }));
  }

  /**
   * Updates the 'color' field of the newCollection state.
   * @param e The change event from the color input.
   */
  handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState(prevState => ({
      newCollection: { ...prevState.newCollection, color: e.target.value }
    }));
  }

  /**
   * Sets showCreateForm to true to display the creation form.
   */
  handleShowCreateForm() {
    this.setState({ showCreateForm: true });
  }

  /**
   * Sets showCreateForm to false to hide the creation form.
   */
  handleCancelCreateForm() {
    this.setState({ showCreateForm: false });
  }

  handleViewModeChange(viewType: CollectionViewType) {
    this.setState({ currentViewMode: viewType })
  }

  render() {
    // Destructure props and state for easier access in render method
    const { collections, onCollectionSelect } = this.props;
    const { showCreateForm, newCollection, currentViewMode } = this.state;

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
                onViewModeChange={this.handleViewModeChange}
            />
            
            <button
                onClick={this.handleShowCreateForm}
                className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
            >
                <Plus className="h-4 w-4 mr-2" />
                New Collection
            </button>
          </div>
        </div>

        {/* Create Collection Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Create New Collection</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newCollection.name}
                  onChange={this.handleNameChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter collection name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCollection.description}
                  onChange={this.handleDescriptionChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter collection description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={newCollection.color}
                  onChange={this.handleColorChange}
                  className="w-20 h-10 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={this.handleCreateCollection}
                  disabled={!newCollection.name?.trim() || !newCollection.description?.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Create Collection
                </button>
                <button
                  onClick={this.handleCancelCreateForm}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collections Section */}
        {collections.length === 0 ? (
          <NoCollections />
        ) : (
          <CollectionsList collections={collections} onCollectionSelect={onCollectionSelect} viewMode={currentViewMode} />
        )}
      </div>
    );
  }
}
