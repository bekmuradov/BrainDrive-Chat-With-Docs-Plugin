import React from 'react';
import { ModelInfo } from './types';
import SearchableDropdown, {
  DropdownOption
} from '../SearchableDropdown';

interface ChatHeaderProps {
  // Model selection props
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
  isLoadingModels: boolean;
  onModelChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  showModelSelection: boolean;
}

interface ChatHeaderState {
  isMenuOpen: boolean;
}

class ChatHeader extends React.Component<ChatHeaderProps, ChatHeaderState> {
  private menuButtonRef: HTMLButtonElement | null = null;
  private menuRef: HTMLDivElement | null = null;
  constructor(props: ChatHeaderProps) {
    super(props);
    this.state = { isMenuOpen: false };
  }

  componentDidMount(): void {
    document.addEventListener('mousedown', this.handleDocumentClick);
  }

  componentWillUnmount(): void {
    document.removeEventListener('mousedown', this.handleDocumentClick);
  }

  handleDocumentClick = (e: MouseEvent) => {
    const target = e.target as Node;
    if (
      this.state.isMenuOpen &&
      target &&
      !this.menuRef?.contains(target) &&
      !this.menuButtonRef?.contains(target as Node)
    ) {
      this.setState({ isMenuOpen: false });
    }
  };

  private emitSelectEvent(value: string) {
    return {
      target: { value } as unknown as EventTarget & HTMLSelectElement,
      currentTarget: { value } as unknown as EventTarget & HTMLSelectElement
    } as React.ChangeEvent<HTMLSelectElement>;
  }

  private handleModelSelect = (value: string) => {
    const { onModelChange } = this.props;
    if (!onModelChange) {
      return;
    }

    onModelChange(this.emitSelectEvent(value));
  };

  render() {
    const {
      models,
      selectedModel,
      isLoadingModels,
      showModelSelection,
    } = this.props;

    const modelOptions: DropdownOption[] = models.map(model => ({
      value: `${model.provider}_${model.serverId}_${model.name}`,
      label: `${model.name} (${model.serverName})`,
      keywords: [model.provider, model.serverName, model.name]
    }));

    const selectedModelValue = selectedModel
      ? `${selectedModel.provider}_${selectedModel.serverId}_${selectedModel.name}`
      : '';

    return (
      <>
        <div className="chat-header-redesigned">
          {/* Left Section - Model Selection */}
          {showModelSelection && (
            <div className="header-model-section">
              <label className="header-label">Models</label>
              <SearchableDropdown
                id="model-selection"
                value={selectedModelValue}
                options={modelOptions}
                onSelect={this.handleModelSelect}
                placeholder={models.length === 0 ? 'No models available' : 'Select model'}
                searchPlaceholder="Search models"
                noResultsText="No models found"
                disabled={models.length === 0}
                loading={isLoadingModels}
                triggerClassName="header-select"
              />
            </div>
          )}
        </div>
      </>
    );
  }
}

export default ChatHeader;
