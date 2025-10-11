// Model information
export interface ModelInfo {
  name: string;
  provider: string;
  providerId: string;
  serverName: string;
  serverId: string;
  isTemporary?: boolean;
}

// Persona information
export interface PersonaInfo {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
  model_settings?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    // Additional model settings can be added here
  };
  avatar?: string;
  tags?: string[];
  sample_greeting?: string;
}

// Conversation information
export interface ConversationInfo {
  id: string;
  title?: string;
  user_id: string;
  model?: string;
  server?: string;
  persona_id?: string;
  conversation_type: string;
  created_at: string;
  updated_at?: string;
}
