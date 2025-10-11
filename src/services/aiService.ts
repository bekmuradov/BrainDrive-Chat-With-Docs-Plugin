import { ModelInfo, PersonaInfo } from '../components/chat-header/types';
import { ApiService } from '../types';
import { extractTextFromData } from '../utils';

// Define the user object expected from /api/v1/auth/me
export interface CurrentUserResponse {
    id: string;
    // Add other expected fields from the user response if needed (e.g., name, email)
    name?: string; 
    email?: string;
}

// Define the conversation object expected from /api/v1/conversations/{id}/with-persona
export interface ConversationWithPersona {
    conversation_id: string;
    persona_id: string | null;
    // Add other conversation-related fields
    messages: any[]; // Use a more specific Message[] type if possible
    // ...
}

// Define the response object from a non-streaming chat POST.
// The successful response is the text output/conversation ID.
// Note: For non-streaming, your current code expects `response.data` or `response`
// to contain the response fields (like `conversation_id`).
export interface ChatPostResponse {
    conversation_id?: string;
    // The actual response content fields will depend on the backend's structure, 
    // often nested under 'data' or similar if the API wrapper is adding outer keys.
    data?: any; 
    // We'll rely on the dynamic type T here, but this is a minimum structure.
}

export class AIService {
  private apiService?: ApiService;
  private currentUserId: string | null = null;

  constructor(apiService?: ApiService) {
    this.apiService = apiService;
    this.initializeUserId();
  }

  /**
   * Initialize current user ID
   */
  private async initializeUserId() {
    try {
      if (this.apiService) {
        const response = await this.apiService.get<CurrentUserResponse>('/api/v1/auth/me');
        if (response && response.id) {
          this.currentUserId = response.id;
        }
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
  }

  /**
   * Send prompt to AI provider and handle response
   */
  async sendPrompt(
    prompt: string,
    selectedModel: ModelInfo,
    useStreaming: boolean,
    conversationId: string | null,
    conversationType: string = "chat", // New parameter
    onChunk: (chunk: string) => void,
    onConversationId: (id: string) => void,
    pageContext?: any, // New parameter for page context
    selectedPersona?: PersonaInfo,  // Add persona parameter
    abortController?: AbortController // Add abort controller for cancellation
  ): Promise<boolean> {
    if (!this.apiService) {
      throw new Error('API service not available');
    }

    // Create chat messages array with user's prompt
    const messages = [
      { role: "user", content: prompt }
    ];

    // Use only the production endpoint
    const endpoint = '/api/v1/ai/providers/chat';

    // Create request params for production endpoint
    const requestParams: any = {
      provider: selectedModel.provider || 'ollama',
      settings_id: selectedModel.providerId || 'ollama_servers_settings',
      server_id: selectedModel.serverId,
      model: selectedModel.name,
      messages: messages.map(msg => ({
        role: msg.role || 'user',
        content: msg.content
      })),
      params: {
        temperature: 0.7,
        max_tokens: 2048
      },
      stream: useStreaming,
      user_id: this.currentUserId || 'current',
      conversation_id: conversationId,
      conversation_type: conversationType // New field
    };
    
    console.log(`📤 AIService sending request with conversation_id: ${conversationId || 'null'}`);

    // Add page context if available
    if (pageContext) {
      requestParams.page_id = pageContext.pageId;
      requestParams.page_context = JSON.stringify({
        pageName: pageContext.pageName,
        pageRoute: pageContext.pageRoute,
        isStudioPage: pageContext.isStudioPage
      });
    }

    // Add persona data if available
    if (selectedPersona) {
      requestParams.persona_id = selectedPersona.id;
      requestParams.persona_system_prompt = selectedPersona.system_prompt;
      requestParams.persona_model_settings = selectedPersona.model_settings;
      requestParams.persona_sample_greeting = selectedPersona.sample_greeting;

      // Apply persona model settings to params if available
      if (selectedPersona.model_settings) {
        requestParams.params = {
          ...requestParams.params,
          ...selectedPersona.model_settings
        };
      }
    }

    try {
      let success = false;

      if (useStreaming && typeof this.apiService?.postStreaming === 'function') {
        // Handle streaming
        try {
          await this.apiService.postStreaming(
            endpoint,
            requestParams,
            (chunk: string) => {
              try {
                // Check if request was aborted
                if (abortController?.signal.aborted) {
                  return;
                }
                
                // Handle Server-Sent Events format - remove 'data: ' prefix if present
                let jsonString = chunk;
                if (chunk.startsWith('data: ')) {
                  jsonString = chunk.substring(6); // Remove 'data: ' prefix
                }
                
                // Skip empty chunks or [DONE] markers
                if (!jsonString.trim() || jsonString.trim() === '[DONE]') {
                  return;
                }

                const data = JSON.parse(jsonString);

                // Store the conversation_id if it's in the response
                if (data.conversation_id && !conversationId) {
                  onConversationId(data.conversation_id);
                }

                const chunkText = extractTextFromData(data);
                if (chunkText) {
                  onChunk(chunkText);
                }
              } catch (error) {
                console.error('Error processing streaming chunk:', error);
              }
            },
            {
              timeout: 120000,
              signal: abortController?.signal
            }
          );
          success = true;
        } catch (error) {
          console.error('Streaming error:', error);
          // Don't throw AbortError as it's expected when canceling
          if (error instanceof Error && error.name !== 'AbortError') {
            throw error;
          }
        }
      } else {
        // Handle non-streaming
        try {
          const response = await this.apiService.post<ChatPostResponse>(endpoint, requestParams, { timeout: 60000 });
          const responseData = response.data || response;

          // Store the conversation_id if it's in the response
          if (responseData.conversation_id && !conversationId) {
            onConversationId(responseData.conversation_id);
          }

          const responseText = extractTextFromData(responseData);
          if (responseText) {
            onChunk(responseText);
            success = true;
          } else {
            throw new Error('No response text received');
          }
        } catch (error) {
          console.error('Non-streaming error:', error);
          throw error;
        }
      }

      return success;
    } catch (error) {
      console.error('Error in sendPrompt:', error);
      onChunk(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
      return false;
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Load conversation with persona details
   */
  async loadConversationWithPersona(conversationId: string): Promise<ConversationWithPersona> {
    if (!this.apiService) {
      throw new Error('API service not available');
    }

    try {
      const response = await this.apiService.get<ConversationWithPersona>(
        `/api/v1/conversations/${conversationId}/with-persona`
      );
      return response;
    } catch (error) {
      console.error('Error loading conversation with persona:', error);
      throw error;
    }
  }

  /**
   * Update conversation's persona
   */
  async updateConversationPersona(conversationId: string, personaId: string | null): Promise<void> {
    if (!this.apiService) {
      throw new Error('API service not available');
    }

    try {
      await this.apiService.put(
        `/api/v1/conversations/${conversationId}/persona`,
        { persona_id: personaId }
      );
    } catch (error) {
      console.error('Error updating conversation persona:', error);
      throw error;
    }
  }

  async cancelGeneration(conversationId: string | null): Promise<void> {
    if (!this.apiService || !conversationId) {
      return;
    }

    try {
      await this.apiService.post(
        `/api/v1/ai/providers/cancel`,
        { conversation_id: conversationId }
      );
    } catch (error) {
      console.error('Error canceling generation:', error);
    }
  }
}
