import { useState, useCallback } from 'react';
// Assuming 'types' contains ConversationInfo, ChatMessage, Services, and ApiService
import { ConversationInfo, ChatMessage, Services } from '../types'; 
import { generateId } from '../utils';

// 🚀 Helper type to handle unpredictable API response wrappers
// Assuming T is the expected final data structure (e.g., ConversationInfo[])
type ApiResponse<T> = T | { data: T } | any; // 'any' for the API response containing user ID

// Helper type for the user object from /api/v1/auth/me
interface CurrentUserResponse {
    id: string;
    [key: string]: any; // Allow for other unpredictable fields
}

/**
 * Utility function to safely extract data from an unpredictable API response.
 * @param response The raw response object from the ApiService.
 * @returns The expected data T, whether it was direct or nested under 'data'.
 */
function extractData<T>(response: ApiResponse<T>): T {
    // Return the 'data' property if it exists and is not undefined, otherwise return the response itself.
    // We use a type assertion to allow checking the 'data' property on the generic response.
    return (response as { data: T }).data !== undefined ? (response as { data: T }).data : (response as T);
}


export const useConversationHistory = (services?: Services) => {
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationInfo | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  /**
   * Fetch conversations from the API
   */
  const fetchConversations = useCallback(async () => {
    if (!services?.api) {
      setIsLoadingHistory(false);
      return;
    }
    
    try {
      setIsLoadingHistory(true);
      
      // 1. Fetch current user ID
      // 🚀 Apply ApiResponse<CurrentUserResponse> for type safety
      const userResponse = await services.api.get<ApiResponse<CurrentUserResponse>>('/api/v1/auth/me');
      
      // 🚀 Safely extract user data
      const userData = extractData<CurrentUserResponse>(userResponse);
      let userId = userData.id;
      
      if (!userId) {
        throw new Error('Could not get current user ID');
      }
      
      // 2. Fetch conversations
      // 🚀 Apply ApiResponse<ConversationInfo[]> for type safety
      const conversationResponse = await services.api.get<ApiResponse<ConversationInfo[]>>(
        `/api/v1/users/${userId}/conversations`,
        {
          params: {
            skip: 0,
            limit: 50 // Fetch up to 50 conversations
          }
        }
      );

       // 🚀 Safely extract conversation list (will be ConversationInfo[] or an object if extraction failed)
      let rawConversationData = extractData<ConversationInfo[]>(conversationResponse);
      
      let finalConversations: ConversationInfo[] = [];
      
      if (Array.isArray(rawConversationData)) {
         finalConversations = rawConversationData;
      } else {
        // 🚀 FIX: Apply a type assertion (as any) here to allow accessing
        // the potentially existing 'conversations' property on the object,
        // which TypeScript couldn't infer from the generic type.
        const unpredictableResponse = rawConversationData as any;
        
        console.warn('Conversation response was not an array, checking for nested array.');
        
        if (Array.isArray(unpredictableResponse.conversations)) {
             finalConversations = unpredictableResponse.conversations;
        } else if (unpredictableResponse.id && unpredictableResponse.user_id) {
             // Handle case where a single conversation object was returned, not an array
             finalConversations = [unpredictableResponse];
        }
      }
      
      if (finalConversations.length === 0) {
        setConversations([]);
        setIsLoadingHistory(false);
        return;
      }
      
      // Validate conversation objects
      const validConversations = finalConversations.filter(conv => {
        return conv && typeof conv === 'object' && conv.id && conv.user_id;
      });
      
      // Sort conversations by most recently updated or created
      validConversations.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      });
      
      // Auto-select the most recent conversation if available
      const mostRecentConversation = validConversations.length > 0 ? validConversations[0] : null;
      
      setConversations(validConversations);
      setSelectedConversation(mostRecentConversation);
      setIsLoadingHistory(false);
      
      return { conversations: validConversations, mostRecent: mostRecentConversation };
    } catch (error: any) {
      // Handle error statuses
      const status = error.status || (error.response && error.response.status);
      if (status === 403 || status === 404) {
        setIsLoadingHistory(false);
        setConversations([]);
      } else {
        setIsLoadingHistory(false);
        console.error('Error loading conversations:', error);
      }
      return null;
    }
  }, [services?.api]);

  /**
   * Load conversation history from the API
   */
  // Interface for the conversation history response (assumed structure)
  interface ConversationHistoryResponse {
      messages: { 
          id?: string;
          sender: 'llm' | 'user';
          message: string;
          created_at: string;
          [key: string]: any;
      }[];
      [key: string]: any;
  }
  
  const loadConversationHistory = useCallback(async (conversationIdToLoad: string): Promise<ChatMessage[]> => {
    if (!services?.api) {
      return [];
    }
    
    try {
      setIsLoadingHistory(true);
      
      // Fetch conversation with messages
      // 🚀 Apply ApiResponse<ConversationHistoryResponse> for type safety
      const response = await services.api.get<ApiResponse<ConversationHistoryResponse>>(
        `/api/v1/conversations/${conversationIdToLoad}/with-messages`
      );
      
      // 🚀 Safely extract history data
      const historyData = extractData<ConversationHistoryResponse>(response);
      
      // Process messages
      const messages: ChatMessage[] = [];
      
      if (historyData && historyData.messages && Array.isArray(historyData.messages)) {
        // Convert API message format to ChatMessage format
        messages.push(...historyData.messages.map((msg: any) => ({
          id: msg.id || generateId('history'),
          sender: msg.sender === 'llm' ? 'ai' : 'user' as 'ai' | 'user',
          content: msg.message,
          timestamp: msg.created_at
        })));
      }
      
      setConversationId(conversationIdToLoad);
      setIsLoadingHistory(false);
      
      return messages;
    } catch (error) {
      // Error loading conversation history
      setIsLoadingHistory(false);
      console.error('Error loading conversation history:', error);
      return [];
    }
  }, [services?.api]);

  /**
   * Handle conversation selection (UI handler)
   */
  const handleConversationSelect = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedConversationId = event.target.value;
    
    if (!selectedConversationId) {
      // New chat selected
      return { conversationId: null, conversation: null };
    }
    
    const conversation = conversations.find(
      conv => conv.id === selectedConversationId
    );
    
    if (conversation) {
      setSelectedConversation(conversation);
      return { conversationId: selectedConversationId, conversation };
    }
    
    return { conversationId: null, conversation: null };
  }, [conversations]);

  /**
   * Handle new chat (UI handler)
   */
  const handleNewChat = useCallback(() => {
    setSelectedConversation(null);
    setConversationId(null);
    return { conversationId: null, conversation: null };
  }, []);

  return {
    conversations,
    selectedConversation,
    isLoadingHistory,
    conversationId,
    fetchConversations,
    loadConversationHistory,
    handleConversationSelect,
    handleNewChat,
    setConversationId,
    setSelectedConversation
  };
};
