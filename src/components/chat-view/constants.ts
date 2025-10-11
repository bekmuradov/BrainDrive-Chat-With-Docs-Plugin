/**
 * Maps a language model provider name to the corresponding settings ID
 * used when configuring or calling chat endpoints.
 */
export enum ProviderSettingsId {
    OLLAMA = 'ollama_servers_settings',
    OPENAI = 'openai_api_keys_settings',
    OPENROUTER = 'openrouter_api_keys_settings',
    CLAUDE = 'claude_api_keys_settings',
    GROQ = 'groq_api_keys_settings',
}

/**
 * Extracts the lowercase provider slug from enum keys
 */
export type ProviderSlug = Lowercase<keyof typeof ProviderSettingsId>;

/**
 * Type definition for the mapping.
 * The keys are dynamic strings (the provider slug), and the values 
 * MUST be one of the values from the ProviderSettingsId enum.
 */
export type ProviderSettingsMap = Record<ProviderSlug, ProviderSettingsId>;

// Provider -> settings_id mapping used when calling chat endpoints
export const PROVIDER_SETTINGS_ID_MAP: ProviderSettingsMap = {
  ollama: ProviderSettingsId.OLLAMA,
  openai: ProviderSettingsId.OPENAI,
  openrouter: ProviderSettingsId.OPENROUTER,
  claude: ProviderSettingsId.CLAUDE,
  groq: ProviderSettingsId.GROQ,
};
