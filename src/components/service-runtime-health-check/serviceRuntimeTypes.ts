export interface ServiceRuntimeStatus {
  name: string;
  status: 'checking' | 'ready' | 'not-ready' | 'error';
  lastChecked?: Date;
  error?: string;
}
