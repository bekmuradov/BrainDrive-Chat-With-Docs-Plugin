// ============================================
// CHAT SERVICE - Business Logic Layer
// ============================================

import {
  ChatFeatureState,
  ChatViewStateUpdater,
  ChatServiceDependencies,
  ChatMessage,
  ModelInfo,
  PersonaInfo,
  ConversationWithPersona,
} from './chatViewTypes';
import { PROVIDER_SETTINGS_ID_MAP, ProviderSlug } from '../components/chat-view/constants';

export class ChatService {
  // ============================================
  // PRIVATE PROPERTIES
  // ============================================
  
  private state: ChatFeatureState;
  private updateShellState: ChatViewStateUpdater;
  private deps: ChatServiceDependencies;
  private currentStreamingAbortController: AbortController | null = null;
  private pendingPersonaRequestId: string | null = null;
  private initialGreetingAdded = false;

  // ============================================
  // CONSTRUCTOR
  // ============================================
  
  constructor(
    initialState: ChatFeatureState,
    deps: ChatServiceDependencies,
    updateShellState: ChatViewStateUpdater
  ) {
    this.state = initialState;
    this.deps = deps;
    this.updateShellState = updateShellState;
  }

  // ============================================
  // PRIVATE STATE MANAGEMENT
  // ============================================
  
  private updateState(newState: Partial<ChatFeatureState>): void {
    this.state = { ...this.state, ...newState } as ChatFeatureState;
    this.updateShellState(newState);
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  
  public async initialize(initialGreeting?: string): Promise<void> {
    try {
      await Promise.all([
        this.loadProviderSettings(),
        this.loadPersonas(),
        this.fetchConversations()
      ]);
      
      this.updateState({ isInitializing: false });
      
      // Add initial greeting if no conversation is loaded
      if (!this.state.conversationId && initialGreeting && !this.initialGreetingAdded) {
        this.initialGreetingAdded = true;
        const personaGreeting = this.state.showPersonaSelection && this.state.selectedPersona?.sample_greeting;
        const greetingContent = personaGreeting || initialGreeting;
        
        this.addMessageToChat({
          id: this.generateId('greeting'),
          sender: 'ai',
          content: greetingContent,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('ChatService: Failed to initialize:', error);
      this.updateState({ 
        error: 'Failed to initialize chat',
        isInitializing: false 
      });
    }
  }

  // ============================================
  // MODEL MANAGEMENT
  // ============================================

  public async loadProviderSettings(): Promise<void> {
    this.updateState({ isLoadingModels: true, error: '' });

    if (!this.deps.apiService) {
      this.updateState({
        isLoadingModels: false,
        error: 'API service not available'
      });
      return;
    }

    try {
      const resp = await this.deps.apiService.get('/api/v1/ai/providers/all-models');
      const raw = (resp && (resp as any).models)
        || (resp && (resp as any).data && (resp as any).data.models)
        || (Array.isArray(resp) ? resp : []);

      const models: ModelInfo[] = Array.isArray(raw)
        ? raw.map((m: any) => {
            const provider: ProviderSlug = m.provider || 'ollama';
            const providerId = PROVIDER_SETTINGS_ID_MAP[provider] || provider;
            const serverId = m.server_id || m.serverId || 'unknown';
            const serverName = m.server_name || m.serverName || 'Unknown Server';
            const name = m.name || m.id || '';
            return {
              name,
              provider,
              providerId,
              serverName,
              serverId,
            } as ModelInfo;
          })
        : [];

      if (models.length > 0) {
        const shouldBroadcastDefault = !this.state.pendingModelKey && !this.state.selectedModel;

        if (!this.state.pendingModelKey && !this.state.selectedModel && models.length > 0) {
          this.updateState({
            models,
            isLoadingModels: false,
            selectedModel: models[0],
          });
          
          if (shouldBroadcastDefault) {
            this.broadcastModelSelection(models[0]);
          }
        } else {
          this.updateState({
            models,
            isLoadingModels: false,
          });
        }

        if (this.state.pendingModelKey) {
          this.resolvePendingModelSelection();
        }

        return;
      }

      // Fallback: Try Ollama-only via settings
      await this.loadOllamaFallbackModels();
      
    } catch (error: any) {
      console.error('Error loading models:', error);
      this.updateState({
        models: [],
        selectedModel: null,
        isLoadingModels: false,
        error: `Error loading models: ${error.message || 'Unknown error'}`,
      });
    }
  }

  private async loadOllamaFallbackModels(): Promise<void> {
    try {
      const settingsResp = await this.deps.apiService.get('/api/v1/settings/instances', {
        params: {
          definition_id: 'ollama_servers_settings',
          scope: 'user',
          user_id: 'current',
        },
      });

      let settingsData: any = null;
      if (Array.isArray(settingsResp) && settingsResp.length > 0) settingsData = settingsResp[0];
      else if (settingsResp && typeof settingsResp === 'object') {
        const obj = settingsResp as any;
        if (obj.data) settingsData = Array.isArray(obj.data) ? obj.data[0] : obj.data;
        else settingsData = settingsResp;
      }

      const fallbackModels: ModelInfo[] = [];
      if (settingsData && settingsData.value) {
        const parsedValue = typeof settingsData.value === 'string'
          ? JSON.parse(settingsData.value)
          : settingsData.value;
        const servers = Array.isArray(parsedValue?.servers) ? parsedValue.servers : [];
        
        for (const server of servers) {
          try {
            const params: Record<string, string> = {
              server_url: encodeURIComponent(server.serverAddress),
              settings_id: 'ollama_servers_settings',
              server_id: server.id,
            };
            if (server.apiKey) params.api_key = server.apiKey;
            
            const modelResponse = await this.deps.apiService.get('/api/v1/ollama/models', { params });
            const serverModels = Array.isArray(modelResponse) ? modelResponse : [];
            
            for (const m of serverModels) {
              fallbackModels.push({
                name: m.name,
                provider: 'ollama',
                providerId: 'ollama_servers_settings',
                serverName: server.serverName,
                serverId: server.id,
              });
            }
          } catch (innerErr) {
            console.error('Fallback: error loading Ollama models for server', server?.serverName, innerErr);
          }
        }
      }

      if (fallbackModels.length > 0) {
        const shouldBroadcastDefault = !this.state.pendingModelKey && !this.state.selectedModel;

        if (!this.state.pendingModelKey && !this.state.selectedModel) {
          this.updateState({
            models: fallbackModels,
            isLoadingModels: false,
            selectedModel: fallbackModels[0],
          });
          
          if (shouldBroadcastDefault) {
            this.broadcastModelSelection(fallbackModels[0]);
          }
        } else {
          this.updateState({
            models: fallbackModels,
            isLoadingModels: false,
          });
        }

        if (this.state.pendingModelKey) {
          this.resolvePendingModelSelection();
        }
        
        return;
      }

      this.updateState({
        models: [],
        selectedModel: null,
        isLoadingModels: false,
      });
      
    } catch (fallbackErr) {
      console.error('Fallback: error loading Ollama settings/models:', fallbackErr);
      this.updateState({ 
        models: [], 
        selectedModel: null, 
        isLoadingModels: false 
      });
    }
  }

  public handleModelChange = (modelId: string): void => {
    const selectedModel = this.state.models.find(model => 
      `${model.provider}_${model.serverId}_${model.name}` === modelId
    );
    
    if (selectedModel) {
      this.updateState({
        selectedModel,
        pendingModelKey: null,
        pendingModelSnapshot: null
      });
      
      this.broadcastModelSelection(selectedModel);
    }
  };

  private broadcastModelSelection(model: ModelInfo): void {
    // This would integrate with the event service if needed
    // For now, just log the selection
    console.log('Model selected:', model);
  }

  private getModelKey(modelName?: string | null, serverName?: string | null): string {
    const safeModel = (modelName || '').trim();
    const safeServer = (serverName || '').trim();
    return `${safeServer}:::${safeModel}`;
  }

  private getModelKeyFromInfo(model: ModelInfo | null): string {
    if (!model) return '';
    return this.getModelKey(model.name, model.serverName);
  }

  private resolvePendingModelSelection(): void {
    const { pendingModelKey, models, selectedModel, pendingModelSnapshot } = this.state;

    if (!pendingModelKey) {
      if (pendingModelSnapshot) {
        this.updateState({ pendingModelSnapshot: null });
      }
      return;
    }

    const matchingModel = models.find(model => this.getModelKeyFromInfo(model) === pendingModelKey);

    if (matchingModel) {
      const selectedKey = this.getModelKeyFromInfo(selectedModel);
      const isSameKey = selectedKey === pendingModelKey;
      const selectedIsTemporary = Boolean(selectedModel?.isTemporary);
      const matchingIsTemporary = Boolean(matchingModel.isTemporary);

      if (!selectedModel || !isSameKey || (selectedIsTemporary && !matchingIsTemporary)) {
        this.updateState({
          selectedModel: matchingModel,
          pendingModelKey: matchingIsTemporary ? pendingModelKey : null,
          pendingModelSnapshot: matchingIsTemporary ? pendingModelSnapshot : null
        });
        
        if (!matchingIsTemporary) {
          this.broadcastModelSelection(matchingModel);
        }
        return;
      }

      if (!matchingIsTemporary) {
        this.updateState({ pendingModelKey: null, pendingModelSnapshot: null });
      }

      return;
    }

    if (pendingModelSnapshot && !models.some(model => this.getModelKeyFromInfo(model) === pendingModelKey)) {
      this.updateState({
        models: [...this.state.models, pendingModelSnapshot]
      });
    }
  }

  // ============================================
  // PERSONA MANAGEMENT
  // ============================================
  
  public async loadPersonas(): Promise<void> {
    this.updateState({ isLoadingPersonas: true });
    
    try {
      if (this.deps.apiService) {
        const response = await this.deps.apiService.get('/api/v1/personas');
        const personas = response.personas || [];
        
        this.updateState({
          personas: personas,
          isLoadingPersonas: false
        });
        
        this.resolvePendingPersonaSelection();
      } else {
        this.updateState({ isLoadingPersonas: false });
      }
    } catch (error) {
      console.error('Error loading personas:', error);
      this.updateState({
        personas: [],
        isLoadingPersonas: false
      });
    }
  }

  public handlePersonaChange = (personaId: string | null): void => {
    const selectedPersona = personaId
      ? this.state.personas.find(p => p.id === personaId) || null
      : null;
    
    this.updateState({ selectedPersona, pendingPersonaId: null });

    // Update conversation persona if we have an active conversation
    if (this.state.conversationId) {
      this.updateConversationPersona(this.state.conversationId, personaId);
    }
  };

  private resolvePendingPersonaSelection(): void {
    const { pendingPersonaId, showPersonaSelection, personas, selectedPersona } = this.state;

    if (!showPersonaSelection) {
      if (pendingPersonaId) {
        this.updateState({ pendingPersonaId: null });
      }
      return;
    }

    if (!pendingPersonaId) {
      return;
    }

    const normalizedPendingId = `${pendingPersonaId}`;

    if (selectedPersona && `${selectedPersona.id}` === normalizedPendingId) {
      this.updateState({ pendingPersonaId: null });
      return;
    }

    const existingPersona = personas.find(persona => `${persona.id}` === normalizedPendingId);
    if (existingPersona) {
      this.updateState({
        selectedPersona: existingPersona,
        pendingPersonaId: null
      });
      return;
    }

    if (!this.deps.apiService) {
      return;
    }

    if (this.pendingPersonaRequestId === normalizedPendingId) {
      return;
    }

    this.pendingPersonaRequestId = normalizedPendingId;

    this.fetchPersonaById(normalizedPendingId)
      .then(persona => {
        if (!persona) return;

        const personaId = `${persona.id}`;

        if (!this.state.pendingPersonaId || `${this.state.pendingPersonaId}` !== personaId) {
          return;
        }

        const alreadyExists = this.state.personas.some(p => `${p.id}` === personaId);
        const personasList = alreadyExists
          ? this.state.personas
          : [...this.state.personas, { ...persona, id: personaId }];

        this.updateState({
          personas: personasList,
          selectedPersona: personasList.find(p => `${p.id}` === personaId) || null,
          pendingPersonaId: null
        });
      })
      .catch(error => {
        console.error('Error resolving pending persona:', error);
      })
      .finally(() => {
        this.pendingPersonaRequestId = null;
      });
  }

  private async fetchPersonaById(personaId: string): Promise<PersonaInfo | null> {
    if (!this.deps.apiService) {
      return null;
    }

    try {
      const response = await this.deps.apiService.get(`/api/v1/personas/${personaId}`);
      const personaCandidate: any = response?.persona || response?.data || response;
      if (personaCandidate && personaCandidate.id) {
        return {
          ...personaCandidate,
          id: `${personaCandidate.id}`
        } as PersonaInfo;
      }
    } catch (error) {
      console.error('Error fetching persona by id:', error);
    }

    return null;
  }

  private async updateConversationPersona(conversationId: string, personaId: string | null): Promise<void> {
    if (!this.deps.apiService) {
      return;
    }

    try {
      await this.deps.apiService.put(
        `/api/v1/conversations/${conversationId}/persona`,
        { persona_id: personaId }
      );
    } catch (error) {
      console.error('Error updating conversation persona:', error);
    }
  }

  // ============================================
  // CONVERSATION MANAGEMENT
  // ============================================
  
  public async fetchConversations(): Promise<void> {
    if (!this.deps.apiService) {
      this.updateState({
        isLoadingHistory: false,
        error: 'API service not available'
      });
      return;
    }
    
    try {
      this.updateState({ isLoadingHistory: true, error: '' });
      
      const userResponse = await this.deps.apiService.get('/api/v1/auth/me');
      let userId = userResponse.id;
      
      if (!userId) {
        throw new Error('Could not get current user ID');
      }
      
      const pageContext = this.deps.getCurrentPageContext();
      const params: any = {
        skip: 0,
        limit: 50,
        conversation_type: "chat"
      };
      
      if (pageContext?.pageId) {
        params.page_id = pageContext.pageId;
      }
      
      const response = await this.deps.apiService.get(
        `/api/v1/users/${userId}/conversations`,
        { params }
      );
      
      let conversations = [];
      
      if (Array.isArray(response)) {
        conversations = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        conversations = response.data;
      } else if (response && typeof response === 'object') {
        if (response.id && response.user_id) {
          conversations = [response];
        }
      }
      
      if (conversations.length === 0) {
        this.updateState({
          conversations: [],
          isLoadingHistory: false
        });
        return;
      }
      
      const validConversations = conversations.filter((conv: any) => {
        return conv && typeof conv === 'object' && conv.id && conv.user_id;
      });
      
      validConversations.sort((a: any, b: any) => {
        if (a.updated_at && b.updated_at) {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        
        if (a.updated_at && !b.updated_at) return -1;
        if (!a.updated_at && b.updated_at) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      const mostRecentConversation = validConversations.length > 0 ? validConversations[0] : null;
      
      this.updateState({
        conversations: validConversations,
        selectedConversation: mostRecentConversation,
        isLoadingHistory: false
      });
      
      if (mostRecentConversation && !this.state.conversationId) {
        await this.loadConversationWithPersona(mostRecentConversation.id);
      }
      
    } catch (error: any) {
      if (error.status === 403 || error.status === 404 || 
          (error.response && (error.response.status === 403 || error.response.status === 404))) {
        this.updateState({
          isLoadingHistory: false,
          conversations: [],
          error: ''
        });
      } else {
        this.updateState({
          isLoadingHistory: false,
          error: `Error loading conversations: ${error.message || 'Unknown error'}`
        });
      }
    }
  }

  public async refreshConversationsList(): Promise<void> {
    if (!this.deps.apiService) return;
    
    try {
      const userResponse = await this.deps.apiService.get('/api/v1/auth/me');
      let userId = userResponse.id;
      
      if (!userId) return;
      
      const pageContext = this.deps.getCurrentPageContext();
      const params: any = {
        skip: 0,
        limit: 50,
        conversation_type: "chat"
      };
      
      if (pageContext?.pageId) {
        params.page_id = pageContext.pageId;
      }
      
      const response = await this.deps.apiService.get(
        `/api/v1/users/${userId}/conversations`,
        { params }
      );
      
      let conversations = [];
      
      if (Array.isArray(response)) {
        conversations = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        conversations = response.data;
      } else if (response && typeof response === 'object') {
        if (response.id && response.user_id) {
          conversations = [response];
        }
      }
      
      if (conversations.length === 0) {
        this.updateState({ conversations: [] });
        return;
      }
      
      const validConversations = conversations.filter((conv: any) => {
        return conv && typeof conv === 'object' && conv.id && conv.user_id;
      });
      
      validConversations.sort((a: any, b: any) => {
        if (a.updated_at && b.updated_at) {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        
        if (a.updated_at && !b.updated_at) return -1;
        if (!a.updated_at && b.updated_at) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      const currentConversation = this.state.conversationId 
        ? validConversations.find((conv: any) => conv.id === this.state.conversationId)
        : null;
      
      this.updateState({
        conversations: validConversations,
        selectedConversation: currentConversation || this.state.selectedConversation
      });
      
    } catch (error: any) {
      console.error('Error refreshing conversations list:', error);
    }
  }

  public handleConversationSelect = (conversationId: string): void => {
    if (!conversationId) {
      this.handleNewChat();
      return;
    }
    
    const selectedConversation = this.state.conversations.find(
      conv => conv.id === conversationId
    );
    
    if (selectedConversation) {
      this.updateState({ selectedConversation });
      this.loadConversationWithPersona(conversationId);
    }
  };

  public handleNewChat = (): void => {
    const personaGreeting = this.state.showPersonaSelection && this.state.selectedPersona?.sample_greeting;
    const greetingContent = personaGreeting; // Could add default greeting here
    
    this.updateState({
      selectedConversation: null,
      conversationId: null,
      messages: [],
      selectedPersona: this.state.showPersonaSelection ? this.state.selectedPersona : null,
      pendingModelKey: null,
      pendingModelSnapshot: null,
      pendingPersonaId: null
    });
    
    if (greetingContent) {
      this.initialGreetingAdded = true;
      this.addMessageToChat({
        id: this.generateId('greeting'),
        sender: 'ai',
        content: greetingContent,
        timestamp: new Date().toISOString()
      });
    }
  };

  public async loadConversationWithPersona(conversationId: string): Promise<void> {
    if (!this.deps.apiService) {
      this.updateState({ error: 'API service not available', isInitializing: false });
      return;
    }
    
    try {
      this.updateState({
        messages: [],
        conversationId: null,
        isLoadingHistory: true,
        error: ''
      });
      
      const selectedConversation = this.state.selectedConversation;
      
      let conversationWithPersona: ConversationWithPersona | null = null;
      try {
        const response = await this.deps.apiService.get(
          `/api/v1/conversations/${conversationId}/with-persona`
        );
        conversationWithPersona = response;
      } catch (error) {
        console.warn('Persona-aware conversation loading not available, falling back');
        conversationWithPersona = selectedConversation;
      }
      
      const showPersonaSelection = this.state.showPersonaSelection;
      const personaFromConversation = showPersonaSelection && conversationWithPersona?.persona
        ? { ...conversationWithPersona.persona, id: `${conversationWithPersona.persona.id}` }
        : null;
      const personaIdFromConversation = showPersonaSelection
        ? (personaFromConversation?.id
          || (conversationWithPersona?.persona_id ? `${conversationWithPersona.persona_id}` : null))
        : null;
      const pendingPersonaId = personaIdFromConversation && personaIdFromConversation.trim() !== ''
        ? personaIdFromConversation
        : null;

      const modelName = conversationWithPersona?.model?.trim();
      const serverName = conversationWithPersona?.server?.trim();
      const hasModelMetadata = Boolean(modelName && serverName);

      const pendingModelKey = hasModelMetadata
        ? this.getModelKey(modelName, serverName)
        : null;
      const matchingModel = pendingModelKey
        ? this.state.models.find(model => this.getModelKeyFromInfo(model) === pendingModelKey)
        : null;
      const pendingModelSnapshot = pendingModelKey && !matchingModel && hasModelMetadata
        ? {
            name: modelName!,
            provider: 'ollama',
            providerId: 'ollama_servers_settings',
            serverName: serverName!,
            serverId: 'unknown',
            isTemporary: true
          } as ModelInfo
        : null;

      const previousSelectedModelKey = this.getModelKeyFromInfo(this.state.selectedModel);

      const nextState: Partial<ChatFeatureState> = {
        pendingModelKey,
        pendingModelSnapshot,
        pendingPersonaId,
      };

      if (matchingModel) {
        nextState.selectedModel = matchingModel;
      } else if (pendingModelSnapshot) {
        nextState.selectedModel = pendingModelSnapshot;
      } else if (!pendingModelKey) {
        nextState.pendingModelKey = null;
        nextState.pendingModelSnapshot = null;
      }

      if (showPersonaSelection) {
        if (personaFromConversation) {
          const existingPersona = this.state.personas.find(p => `${p.id}` === personaFromConversation.id);
          if (existingPersona) {
            nextState.selectedPersona = existingPersona;
          } else {
            nextState.personas = [...this.state.personas, personaFromConversation];
            nextState.selectedPersona = personaFromConversation;
          }
        } else if (pendingPersonaId) {
          nextState.pendingPersonaId = pendingPersonaId;
          const existingPersona = this.state.personas.find(p => `${p.id}` === pendingPersonaId);
          nextState.selectedPersona = existingPersona || null;
        } else {
          nextState.selectedPersona = null;
          nextState.pendingPersonaId = null;
        }
      } else {
        nextState.selectedPersona = null;
        nextState.pendingPersonaId = null;
      }

      this.updateState(nextState);

      const newSelectedModelKey = this.getModelKeyFromInfo(this.state.selectedModel);
      if (
        (matchingModel || pendingModelSnapshot) &&
        newSelectedModelKey &&
        newSelectedModelKey !== previousSelectedModelKey
      ) {
        const currentModel = this.state.selectedModel;
        if (currentModel) {
          this.broadcastModelSelection(currentModel);
        }
      }

      if (pendingModelKey) {
        this.resolvePendingModelSelection();
      }
      if (this.state.pendingPersonaId) {
        this.resolvePendingPersonaSelection();
      }
      
      await this.loadConversationHistory(conversationId);
      
    } catch (error) {
      console.error('Error loading conversation with persona:', error);
      await this.loadConversationHistory(conversationId);
    }
  }

  private async loadConversationHistory(conversationId: string): Promise<void> {
    if (!this.deps.apiService) {
      this.updateState({ error: 'API service not available', isInitializing: false });
      return;
    }
    
    try {
      this.initialGreetingAdded = true;
      
      const response = await this.deps.apiService.get(
        `/api/v1/conversations/${conversationId}/with-messages`
      );
      
      const messages: ChatMessage[] = [];
      
      if (response && response.messages && Array.isArray(response.messages)) {
        messages.push(...response.messages.map((msg: any) => ({
          id: msg.id || this.generateId('history'),
          sender: msg.sender === 'llm' ? 'ai' : 'user' as 'ai' | 'user',
          content: this.cleanMessageContent(msg.message),
          timestamp: msg.created_at
        })));
      }
      
      this.updateState({
        messages,
        conversationId: conversationId,
        isLoadingHistory: false,
        isInitializing: false
      });
      
    } catch (error) {
      this.updateState({
        isLoadingHistory: false,
        error: 'Error loading conversation history',
        isInitializing: false
      });
    }
  }

  public async handleRenameConversation(conversationId: string, newTitle: string): Promise<void> {
    if (!this.deps.apiService) {
      throw new Error('API service not available');
    }

    try {
      await this.deps.apiService.put(
        `/api/v1/conversations/${conversationId}`,
        { title: newTitle }
      );

      const updatedConversations = this.state.conversations.map(conv =>
        conv.id === conversationId
          ? { ...conv, title: newTitle }
          : conv
      );

      const updatedSelectedConversation = this.state.selectedConversation?.id === conversationId
        ? { ...this.state.selectedConversation, title: newTitle }
        : this.state.selectedConversation;

      this.updateState({
        conversations: updatedConversations,
        selectedConversation: updatedSelectedConversation
      });

    } catch (error: any) {
      throw new Error(`Error renaming conversation: ${error.message || 'Unknown error'}`);
    }
  }

  public async handleDeleteConversation(conversationId: string): Promise<void> {
    if (!this.deps.apiService) {
      throw new Error('API service not available');
    }

    try {
      await this.deps.apiService.delete(`/api/v1/conversations/${conversationId}`);

      const updatedConversations = this.state.conversations.filter(
        conv => conv.id !== conversationId
      );

      const wasSelected = this.state.selectedConversation?.id === conversationId;

      this.updateState({
        conversations: updatedConversations,
        selectedConversation: wasSelected ? null : this.state.selectedConversation,
        conversationId: wasSelected ? null : this.state.conversationId,
        messages: wasSelected ? [] : this.state.messages,
        selectedPersona: wasSelected ? (this.state.showPersonaSelection ? this.state.selectedPersona : null) : this.state.selectedPersona
      });

      if (wasSelected) {
        const greetingContent = (this.state.showPersonaSelection && this.state.selectedPersona?.sample_greeting);
        
        if (greetingContent) {
          this.initialGreetingAdded = true;
          this.addMessageToChat({
            id: this.generateId('greeting'),
            sender: 'ai',
            content: greetingContent,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error: any) {
      throw new Error(`Error deleting conversation: ${error.message || 'Unknown error'}`);
    }
  }

  // ============================================
  // MESSAGE MANAGEMENT
  // ============================================

  public async handleSendMessage(prompt: string): Promise<void> {
    if (!this.deps.apiService) {
      this.deps.setError('API service not available');
      return;
    }

    if (!this.state.selectedModel) {
      this.deps.setError('Please select a model first');
      return;
    }
    
    try {
      this.updateState({ isLoading: true, isStreaming: true, error: '' });
      
      this.currentStreamingAbortController = new AbortController();
      
      const placeholderId = this.generateId('ai');
      
      this.addMessageToChat({
        id: placeholderId,
        sender: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      });
      
      let currentResponseContent = '';
      
      const onChunk = (chunk: string) => {
        currentResponseContent += chunk;
        const updatedMessages = this.state.messages.map(message => {
          if (message.id === placeholderId) {
            return {
              ...message,
              content: this.cleanMessageContent(currentResponseContent)
            };
          }
          return message;
        });
        
        this.updateState({ messages: updatedMessages });
      };
      
      const onConversationId = (id: string) => {
        this.updateState({ conversationId: id });
        setTimeout(() => {
          this.refreshConversationsList();
        }, 1000);
      };
      
      const pageContext = this.deps.getCurrentPageContext();
      
      // Call AI service through dataRepository
      await this.deps.dataRepository.sendPromptToAI(
        prompt,
        this.state.selectedModel,
        true, // useStreaming
        this.state.conversationId,
        "chat",
        onChunk,
        onConversationId,
        pageContext,
        this.state.selectedPersona || undefined,
        this.currentStreamingAbortController
      );
      
      const updatedMessages = this.state.messages.map(message => {
        if (message.id === placeholderId) {
          const shouldPreserveContinue = message.isCutOff;
          
          return {
            ...message,
            isStreaming: false,
            canRegenerate: true,
            canContinue: shouldPreserveContinue ? true : false
          };
        }
        return message;
      });
      
      this.updateState({
        messages: updatedMessages,
        isLoading: false,
        isStreaming: false
      });
      
      this.currentStreamingAbortController = null;
      
      if (this.state.conversationId) {
        this.refreshConversationsList();
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const updatedMessages = this.state.messages.map(message => ({
          ...message,
          isStreaming: false,
          canRegenerate: true,
          canContinue: message.isStreaming ? true : message.canContinue,
          isCutOff: message.isStreaming ? true : message.isCutOff
        }));
        
        this.updateState({
          isLoading: false,
          isStreaming: false,
          messages: updatedMessages
        });
      } else {
        this.updateState({
          isLoading: false,
          isStreaming: false,
          error: `Error sending prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
      
      this.currentStreamingAbortController = null;
    }
  }

  public stopGeneration = async (): Promise<void> => {
    if (this.currentStreamingAbortController) {
      this.currentStreamingAbortController.abort();
      this.currentStreamingAbortController = null;
    }
    
    if (this.deps.dataRepository && this.state.conversationId) {
      try {
        await this.deps.dataRepository.cancelGeneration(this.state.conversationId);
      } catch (error) {
        console.error('Error canceling backend generation:', error);
      }
    }
    
    const updatedMessages = this.state.messages.map(message => {
      const shouldUpdate = message.isStreaming;
      
      return {
        ...message,
        isStreaming: false,
        canRegenerate: true,
        canContinue: shouldUpdate ? true : message.canContinue,
        isCutOff: shouldUpdate ? true : message.isCutOff
      };
    });
    
    this.updateState({
      isStreaming: false,
      isLoading: false,
      messages: updatedMessages
    });
  };

  public continueGeneration = async (): Promise<void> => {
    const lastAiMessage = this.state.messages
      .filter(msg => msg.sender === 'ai')
      .pop();
    
    if (lastAiMessage && lastAiMessage.canContinue) {
      const lastUserMessage = [...this.state.messages]
        .reverse()
        .find(msg => msg.sender === 'user');
      
      if (!lastUserMessage) return;
      
      const filteredMessages = this.state.messages.filter(msg => msg.id !== lastAiMessage.id);
      this.updateState({ messages: filteredMessages });
      
      await this.handleSendMessage(lastUserMessage.content);
    }
  };

  public regenerateResponse = async (): Promise<void> => {
    const lastUserMessage = this.state.messages
      .filter(msg => msg.sender === 'user')
      .pop();
    
    if (lastUserMessage) {
      const lastUserIndex = this.state.messages.findIndex(msg => msg.id === lastUserMessage.id);
      const messagesToKeep = this.state.messages.slice(0, lastUserIndex + 1);
      
      this.updateState({ messages: messagesToKeep });
      
      await this.handleSendMessage(lastUserMessage.content);
    }
  };

  public startEditingMessage = (messageId: string, content: string): void => {
    this.updateState({
      editingMessageId: messageId,
      editingContent: content
    });
  };

  public cancelEditingMessage = (): void => {
    this.updateState({
      editingMessageId: null,
      editingContent: ''
    });
  };

  public toggleMarkdownView = (messageId: string): void => {
    const updatedMessages = this.state.messages.map(message => {
      if (message.id === messageId) {
        return {
          ...message,
          showRawMarkdown: !message.showRawMarkdown
        };
      }
      return message;
    });
    
    this.updateState({ messages: updatedMessages });
  };

  public async saveEditedMessage(): Promise<void> {
    const { editingMessageId, editingContent } = this.state;
    
    if (!editingMessageId || !editingContent.trim()) {
      return;
    }

    const updatedMessages = this.state.messages.map(message => {
      if (message.id === editingMessageId) {
        return {
          ...message,
          content: editingContent.trim(),
          isEdited: true,
          originalContent: message.originalContent || message.content
        };
      }
      return message;
    });

    this.updateState({
      messages: updatedMessages,
      editingMessageId: null,
      editingContent: ''
    });

    const editedMessage = updatedMessages.find(msg => msg.id === editingMessageId);
    if (editedMessage) {
      const editedIndex = updatedMessages.findIndex(msg => msg.id === editingMessageId);
      const messagesToKeep = updatedMessages.slice(0, editedIndex + 1);
      
      this.updateState({ messages: messagesToKeep });
      
      await this.handleSendMessage(editedMessage.content);
    }
  }

  private addMessageToChat(message: ChatMessage): void {
    const cleanedMessage = {
      ...message,
      content: this.cleanMessageContent(message.content)
    };
    
    this.updateState({
      messages: [...this.state.messages, cleanedMessage]
    });
  }

  private cleanMessageContent(content: string): string {
    if (!content) return content;
    
    let cleanedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    cleanedContent = cleanedContent.replace(/\n\n\[WEB SEARCH CONTEXT[^]*$/, '');
    cleanedContent = cleanedContent.replace(/^Document Context:[^]*?\n\nUser Question: /, '');
    cleanedContent = cleanedContent.replace(/^[^]*?\n\nUser Question: /, '');
    
    return cleanedContent.trim();
  }

  // ============================================
  // UI STATE MANAGEMENT
  // ============================================

  public toggleConversationMenu = (conversationId: string | null): void => {
    this.updateState({
      openConversationMenu: this.state.openConversationMenu === conversationId ? null : conversationId
    });
  };

  public handleInputChange = (inputText: string): void => {
    this.updateState({ inputText });
  };

  // ============================================
  // UTILITY METHODS
  // ============================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getCurrentState(): ChatFeatureState {
    return this.state;
  }
}
