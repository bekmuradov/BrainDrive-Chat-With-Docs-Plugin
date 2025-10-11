import React, { Component, KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { BRAINDRIVE_CORE_API } from '../../constants';
import type { ChatSession } from '../../braindrive-plugin/pluginTypes';
import { showToast } from '../../helpers';

interface CreateSessionFormProps {
  collectionId: string;
  onSessionCreated: (sessin: ChatSession) => void;
  onError: (error: string) => void;
  buttonText?: string;
  placeholder?: string;
}

interface CreateSessionFormState {
  showDialog: boolean;
  sessionName: string;
  isCreating: boolean;
}

export class CreateSessionForm extends Component<CreateSessionFormProps, CreateSessionFormState> {
  private buttonRef: React.RefObject<HTMLButtonElement>;
  private popupRef: React.RefObject<HTMLDivElement>;

  constructor(props: CreateSessionFormProps) {
    super(props);
    this.state = {
      showDialog: false,
      sessionName: '',
      isCreating: false,
    };

    this.buttonRef = React.createRef();
    this.popupRef = React.createRef();
    
    this.handleCreateSession = this.handleCreateSession.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.openDialog = this.openDialog.bind(this);
    this.closeDialog = this.closeDialog.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  async handleCreateSession() {
    const { sessionName } = this.state;
    const { collectionId, onSessionCreated, onError } = this.props;
    
    const trimmedName = sessionName.trim();
    if (!trimmedName) {
      showToast('Please enter a session name', 'warning');
      return;
    }

    this.setState({ isCreating: true });

    try {
      const response = await fetch(`${BRAINDRIVE_CORE_API}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          collection_id: collectionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create chat session: ${response.statusText}`);
      }

      const newSession = await response.json();

      console.log("New Session: ", newSession);

      showToast(`Created session "${trimmedName}"`, 'success');
      
      // Reset form state
      this.setState({ 
        sessionName: '', 
        showDialog: false,
        isCreating: false 
      });
      
      // Notify parent component
      onSessionCreated(newSession);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create chat session';
      showToast(errorMessage, 'error');
      onError(errorMessage);
      this.setState({ isCreating: false });
    }
  }

  handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !this.state.isCreating) {
      this.handleCreateSession();
    } else if (e.key === 'Escape') {
      this.closeDialog();
    }
  }

  handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ sessionName: e.target.value });
  }

  openDialog() {
    this.setState({ showDialog: true });
  }

  closeDialog() {
    this.setState({ 
      showDialog: false, 
      sessionName: '',
      isCreating: false 
    });
  }

  handleClickOutside(event: MouseEvent) {
    if (this.popupRef.current && 
        this.buttonRef.current &&
        !this.popupRef.current.contains(event.target as Node) &&
        !this.buttonRef.current.contains(event.target as Node)) {
      this.closeDialog();
    }
  }

  render() {
    const { showDialog, sessionName, isCreating } = this.state;
    const { 
      buttonText = 'New Session',
      placeholder = 'Session name'
    } = this.props;

    return (
      <div className="relative">
        {/* Trigger Button */}
        <button
          ref={this.buttonRef}
          onClick={this.openDialog}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-2" />
          {buttonText}
        </button>

        {/* Popup Dialog */}
        {showDialog && (
          <div 
            ref={this.popupRef}
            className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80 z-50"
          >
            {/* Popup Header */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Create New Session
              </h3>
              <button
                onClick={this.closeDialog}
                disabled={isCreating}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Popup Body */}
            <div className="space-y-3">
              <input
                type="text"
                value={sessionName}
                onChange={this.handleInputChange}
                placeholder={placeholder}
                disabled={isCreating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
                onKeyDown={this.handleKeyDown}
                autoFocus
              />

              {/* Popup Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={this.handleCreateSession}
                  disabled={!sessionName.trim() || isCreating}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={this.closeDialog}
                  disabled={isCreating}
                  className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Small arrow pointing to the button */}
            <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
          </div>
        )}
      </div>
    );
  }
}
