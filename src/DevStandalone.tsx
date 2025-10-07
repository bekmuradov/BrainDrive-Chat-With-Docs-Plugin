import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatCollectionsPlugin from './BrainDriveChatWithDocs';
import './BrainDriveChatWithDocs.css';
import type { Services, TemplateTheme, SettingsService } from './types';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_BASE } from './config';

// Hot Module Replacement (HMR) setup - this must be at the top level
if (module.hot) {
  console.log('🔥 Hot Module Replacement is enabled');
  
  // Add visual feedback for hot reloads
  module.hot.addStatusHandler(function(status) {
    if (status === 'apply') {
      const indicator = document.querySelector('.hot-reload-indicator');
      if (indicator) {
        (indicator as HTMLElement).style.background = '#ffa500';
        indicator.textContent = '🔄 Reloading...';
        setTimeout(() => {
          (indicator as HTMLElement).style.background = '#00d4aa';
          indicator.textContent = '🔥 Hot Reload Active';
        }, 1000);
      }
    }
  });
}

// Mock services for standalone development
const mockServices: Services = {
  api: {
    get: async (url: string): Promise<any> => {
      console.log('Mock API GET:', url);
      
      // Mock different endpoints
      if (url.includes('/collections/')) {
        return [
          {
            id: '1',
            name: 'Sample Collection 1',
            description: 'A sample collection for testing',
            created_at: new Date().toISOString(),
            document_count: 5
          },
          {
            id: '2',
            name: 'Sample Collection 2',
            description: 'Another sample collection',
            created_at: new Date().toISOString(),
            document_count: 3
          }
        ];
      }
      
      if (url.includes('/documents/')) {
        return [
          {
            id: '1',
            name: 'Sample Document 1.pdf',
            collection_id: '1',
            size: 1024000,
            type: 'pdf',
            uploaded_at: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Sample Document 2.docx',
            collection_id: '1',
            size: 512000,
            type: 'docx',
            uploaded_at: new Date().toISOString()
          }
        ];
      }
      
      if (url.includes('/chat/sessions')) {
        return [
          {
            id: '1',
            name: 'Chat Session 1',
            collection_id: '1',
            created_at: new Date().toISOString(),
            message_count: 10
          }
        ];
      }
      
      if (url.includes('/chat/messages')) {
        return [
          {
            id: '1',
            session_id: '1',
            role: 'user',
            content: 'Hello, can you help me with this document?',
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            session_id: '1',
            role: 'assistant',
            content: 'Of course! I can help you analyze the documents in your collection. What would you like to know?',
            timestamp: new Date().toISOString()
          }
        ];
      }
      
      return [];
    },
    
    post: async (url: string, data?: any): Promise<any> => {
      console.log('Mock API POST:', url, data);
      return { success: true, id: Math.random().toString(36) };
    },
    
    put: async (url: string, data?: any): Promise<any> => {
      console.log('Mock API PUT:', url, data);
      return { success: true };
    },
    
    delete: async (url: string): Promise<any> => {
      console.log('Mock API DELETE:', url);
      return { success: true };
    }
  },
  
  theme: {
    getCurrentTheme: () => 'light' as const,
    addThemeChangeListener: (listener: (theme: 'dark' | 'light') => void) => {
      console.log('Mock Theme Listener Added');
      // Simulate theme changes for testing
      setTimeout(() => listener('dark'), 5000);
      setTimeout(() => listener('light'), 10000);
    },
    removeThemeChangeListener: (listener: (theme: 'dark' | 'light') => void) => {
      console.log('Mock Theme Listener Removed');
    }
  },
  
  settings: {
    getSetting: async (key: string) => {
      console.log('Mock Settings Get:', key);
      return null;
    },
    setSetting: async (key: string, value: any) => {
      console.log('Mock Settings Set:', key, value);
    }
  },
  
  pageContext: {
    getCurrentPageContext: () => ({
      pageId: 'dev-page',
      pageName: 'Development Page',
      pageRoute: '/dev',
      isStudioPage: false
    }),
    onPageContextChange: (handler: (context: any) => void) => {
      console.log('Mock Page Context Listener Added');
      return () => console.log('Mock Page Context Listener Removed');
    }
  }
};

function isDOMException(error: unknown): error is DOMException {
  return error instanceof DOMException;
}

function isTypeError(error: unknown): error is TypeError {
  return error instanceof TypeError;
}

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

const defaultComponentSettings = {
  "id": "chat_with_document_processor_settings",
  "name": "Chat with Document Processor Settings",
  "description": "Configure the Chat with Document Processor services.",
  "category": "LLM and Embeddings",
  "type": "object",
  "default_value": {
    "LLM_PROVIDER": "ollama",
    "EMBEDDING_PROVIDER": "ollama",
    "ENABLE_CONTEXTUAL_RETRIEVAL": true,
    "OLLAMA_CONTEXTUAL_LLM_BASE_URL": "http://localhost:11434",
    "OLLAMA_CONTEXTUAL_LLM_MODEL": "llama3.2:8b",
    "OLLAMA_LLM_BASE_URL": "http://localhost:11434",
    "OLLAMA_LLM_MODEL": "qwen3:8b",
    "OLLAMA_EMBEDDING_BASE_URL": "http://localhost:11434",
    "OLLAMA_EMBEDDING_MODEL": "mxbai-embed-large",
    "DOCUMENT_PROCESSOR_API_URL": "http://localhost:8080/documents/",
    "DOCUMENT_PROCESSOR_API_KEY": "default_api_key",
    "DOCUMENT_PROCESSOR_TIMEOUT": 600,
    "DOCUMENT_PROCESSOR_MAX_RETRIES": 3
  },
  "allowed_scopes": [
    "user"
  ],
  "validation": {},
  "is_multiple": false,
  "tags": [
    "ollama",
    "document-processor",
    "settings"
  ],
  "created_at": "2025-09-16 15:53:32",
  "updated_at": "2025-09-16 15:53:32"
}

const componentSettings: SettingsService = {};

const componentServices: Services = {
  api: {
    get: async (url) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✓ API GET response received: ${JSON.stringify(data).substring(0, 100)}...`);
        return data;
      } catch (error) {
        clearTimeout(timeoutId);

        // Handle fetch timeout/abort errors (DOMException)
        if (isDOMException(error) && error.name === 'AbortError') {
          console.error('❌ API request timed out:', url);
          throw new Error('Request timed out after 10 seconds');
        }
        // Handle network/fetch errors (TypeError)
        else if (isTypeError(error)) {
          console.error('❌ Network error:', error);
          throw new Error(`Network error: ${error.message}`);
        }
        // Handle other known Error types
        else if (isError(error)) {
          console.error('❌ API GET error:', error);
          throw error; // Re-throw original error to preserve stack trace
        }
        // Fallback for unknown error types
        else {
          console.error('❌ Unknown error type:', error);
          throw new Error(`An unknown error occurred: ${String(error)}`);
        }
      }
    },
    post: async (url, data) => {
      console.log(`Making API POST request to: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    },
    put: async (url: string, data: any): Promise<any> => {
      console.log('Mock API PUT:', url, data);
      return {
        data: { success: true },
        status: 200,
        responseTime: Math.floor(Math.random() * 100) + 50,
        timestamp: new Date().toISOString()
      };
    },
    delete: async (url: string): Promise<any> => {
      console.log('Mock API DELETE:', url);
      return {
        data: { success: true },
        status: 200,
        responseTime: Math.floor(Math.random() * 100) + 50,
        timestamp: new Date().toISOString()
      };
    },
    postStreaming: async<T = any>(
      url: string,
      data?: any,
      onChunk?: (chunk: string) => void,
      config?: AxiosRequestConfig
    ): Promise<T> => {
      // const url = `${API_BASE}${path}`;
      const token = localStorage.getItem('accessToken');
      let accumulated = '';
    
      const payload = data;  // ✅ Use full payload structure expected by backend
    
      // console.log('Connecting to streaming endpoint:', url);
      // console.log('Payload sent:', payload);
    
      return new Promise<T>((resolve, reject) => {
        fetchEventSource(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload),
          openWhenHidden: true,
    
          async onopen(response: Response): Promise<void> {
            const type = response.headers.get('content-type') || '';
            if (!response.ok || !type.includes('text/event-stream')) {
              reject(new Error(`Unexpected response: ${response.status} ${type}`));
              return Promise.resolve();
            } else {
              // console.log('✅ SSE connection established');
              return Promise.resolve();
            }
          },
    
          onmessage(event) {
            if (event.data === '[DONE]') {
              // console.log('✅ Streaming completed');
              resolve(accumulated as unknown as T);
              return;
            }
    
            try {
              // console.log('Received chunk:', event.data);
              accumulated += event.data;
              onChunk?.(event.data);
            } catch (err) {
              console.warn('⚠️ Error handling streamed chunk:', event.data, err);
            }
          },
    
          onerror(err) {
            console.error('❌ Stream error:', err);
            reject(err);
          }
        });
      });
    }
  },
  settings: {
    // get: (key: string) => {
    //   console.log('Mock settings get:', key);
    //   return null;
    // },
    // set: async (key: string, value: any) => {
    //   console.log('Mock settings set:', key, value);
    // },
    getSetting: async (id: string) => {
      console.log('Mock getSetting:', id);
      return null;
    },
    setSetting: async (id: string, value: any) => {
      console.log('Mock setSetting:', id, value);
    },
    getSettingDefinitions: async (filters) => {
      return [defaultComponentSettings]
    }
  },
  theme: {
    getCurrentTheme: () => {
      const currentTheme = (localStorage.getItem('mock-theme') || 'light') as TemplateTheme;
      return currentTheme;
    },
    // setTheme: (theme: string) => {
    //   console.log('Mock setTheme:', theme);
    //   localStorage.setItem('mock-theme', theme);
    //   // Trigger theme change listeners
    //   const event = new CustomEvent('mock-theme-change', { detail: theme });
    //   window.dispatchEvent(event);
    // },
    // toggleTheme: () => {
    //   const currentTheme = localStorage.getItem('mock-theme') || 'light';
    //   const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    //   console.log('Mock toggleTheme:', currentTheme, '->', newTheme);
    //   localStorage.setItem('mock-theme', newTheme);
    //   // Trigger theme change listeners
    //   const event = new CustomEvent('mock-theme-change', { detail: newTheme });
    //   window.dispatchEvent(event);
    // },
    addThemeChangeListener: (callback: (theme: TemplateTheme) => void) => {
      console.log('Mock theme listener added');
      const handler = (event: CustomEvent) => callback(event.detail);
      window.addEventListener('mock-theme-change', handler as EventListener);
      // Simulate theme change after 5 seconds for testing
      // setTimeout(() => callback('dark'), 5000);
    },
    removeThemeChangeListener: (callback: (theme: TemplateTheme) => void) => {
      console.log('Mock theme listener removed');
      // In a real implementation, you'd need to track and remove the specific listener
    }
  },
  pageContext: {
    getCurrentPageContext: () => ({
      pageId: 'dev-page',
      pageName: 'Development Page',
      pageRoute: '/dev',
      isStudioPage: false
    }),
    onPageContextChange: (callback: (context: any) => void) => {
      console.log('Mock page context listener added');
      return () => console.log('Mock page context listener removed');
    }
  }
}

// Development wrapper component
const DevWrapper: React.FC = () => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    // Update mock theme service
    // mockServices.theme.getCurrentTheme = () => theme === 'light' ? 'dark' : 'light';
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
      padding: '20px'
    }}>
      {/* Development Controls */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: theme === 'dark' ? '#333' : '#f5f5f5',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>
          Dev Controls
        </h3>
        <button
          onClick={toggleTheme}
          style={{
            padding: '5px 10px',
            backgroundColor: theme === 'dark' ? '#555' : '#e0e0e0',
            color: theme === 'dark' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Toggle Theme: {theme}
        </button>
        <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
          <div>✅ Mock API Active</div>
          <div>✅ Hot Reload Enabled</div>
        </div>
      </div>

      {/* Plugin Component */}
      <ChatCollectionsPlugin
        // title="Chat Collections Plugin - Development Mode"
        // description="Testing plugin in standalone mode"
        // pluginId="chat-collections-dev"
        moduleId="dev-module"
        // instanceId="dev-instance"
        // config={{
        //   apiBaseUrl: 'http://localhost:8000',
        //   refreshInterval: 30,
        //   showAdvancedOptions: true,
        //   maxDocuments: 100,
        //   chatSettings: {
        //     maxMessages: 100,
        //     autoSave: true
        //   }
        // }}
        services={componentServices}
      />
    </div>
  );
};

// Mount the development version
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<DevWrapper />);

// Add some global styles for development
const style = document.createElement('style');
style.textContent = `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  /* Development-specific styles */
  .plugin-template {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
    border-radius: 8px;
    overflow: hidden;
  }
`;
document.head.appendChild(style);

// HMR acceptance for this module
if (module.hot) {
  module.hot.accept('./BrainDriveChatWithDocs', () => {
    console.log('🔄 BrainDriveChatWithDocs updated via HMR');
  });
}
