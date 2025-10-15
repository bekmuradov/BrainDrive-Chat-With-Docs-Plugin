import type { Services } from '../types';
import type { Collection, Document, ChatSession, ChatMessage } from './pluginTypes';

// Utility for making API calls, handling the switch between props.services.api and raw fetch
const apiCall = async (servicesApi: Services['api'], baseUrl: string, endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: any) => {
    const url = `${baseUrl}${endpoint}`;
    
    if (servicesApi) {
        // Use provided service API
        switch (method) {
            case 'GET': return servicesApi.get(url);
            case 'POST': return servicesApi.post(url, data);
            case 'PUT': return servicesApi.put(url, data);
            case 'DELETE': return servicesApi.delete(url);
        }
    } else {
        // Fallback to raw fetch
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : undefined,
            signal: method === 'GET' ? AbortSignal.timeout(10000) : undefined, // Timeout for GETs
        };

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }
        // Handle no-content responses (e.g., DELETE)
        return response.status === 204 ? {} : response.json();
    }
}

export class DataRepository {
    private apiService: Services['api'];
    private apiBaseUrl: string;

    constructor(apiService: Services['api'], apiBaseUrl: string) {
        this.apiService = apiService;
        this.apiBaseUrl = apiBaseUrl;
    }

    public getCollections = (): Promise<Collection[]> => {
        return apiCall(this.apiService, this.apiBaseUrl, '/collections/', 'GET');
    }

    public getDocuments = async (collectionId: string): Promise<Document[]> => {
        return apiCall(this.apiService, this.apiBaseUrl, `/documents/?collection_id=${collectionId}`, 'GET');
    }

    public getChatSessions = async (): Promise<ChatSession[]> => {
        return apiCall(this.apiService, this.apiBaseUrl, '/chat/sessions', 'GET');
    }

    public getChatMessages = async (sessionId: string): Promise<ChatMessage[]> => {
        return apiCall(this.apiService, this.apiBaseUrl, `/chat/messages?session_id=${sessionId}`, 'GET');
    }
    
    // Add other methods like createCollection, uploadDocument, createChatSession here...
}
