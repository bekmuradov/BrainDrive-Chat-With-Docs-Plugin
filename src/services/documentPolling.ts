import { showToast } from '../helpers';

export interface PollingOptions {
  apiBase?: string;
  pollInterval?: number;
  maxAttempts?: number;
  onComplete?: (document: any) => void;
  onError?: (error: string) => void;
}

const activePollingIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Poll document status until processing is complete
 */
export function pollDocumentStatus(
  documentId: string,
  onStatusUpdate: (document: any) => void,
  options: PollingOptions = {}
): void {
  const {
    apiBase = '/api',
    pollInterval = 2000,
    maxAttempts = 60,
    onComplete,
    onError
  } = options;
  
  // Clear any existing polling for this document
  stopPollingDocument(documentId);
  
  let attempts = 0;
  
  const intervalId = setInterval(async () => {
    attempts++;
    
    try {
      const response = await fetch(`${apiBase}/documents/${documentId}`);
      
      if (!response.ok) {
        console.warn(`Polling document ${documentId} failed: ${response.status}`);
        if (response.status === 404) {
          stopPollingDocument(documentId);
          onError?.('Document not found');
          return;
        }
        return;
      }
      
      const updatedDocument = await response.json();
      
      // Call the status update callback
      onStatusUpdate(updatedDocument);
      
      // Check if processing is complete
      if (updatedDocument.status !== 'processing' && updatedDocument.status !== 'uploaded') {
        stopPollingDocument(documentId);
        
        if (updatedDocument.status === 'processed') {
          showToast(`Document "${updatedDocument.original_filename}" processed and ready.`, 'success');
        } else if (updatedDocument.status === 'failed') {
          showToast(`Document "${updatedDocument.original_filename}" processing failed.`, 'error');
        }
        
        onComplete?.(updatedDocument);
        return;
      }
    } catch (error) {
      console.error(`Error polling document status: ${error}`);
      
      // After too many errors, stop polling
      if (attempts >= 5) {
        stopPollingDocument(documentId);
        onError?.(`Failed to poll document status: ${error}`);
        return;
      }
    }
    
    // Stop after max attempts
    if (attempts >= maxAttempts) {
      stopPollingDocument(documentId);
      console.warn(`Stopped polling status for document ${documentId} after ${attempts} attempts.`);
      onError?.('Polling timeout - document may still be processing');
    }
  }, pollInterval);
  
  // Store the interval ID for potential cleanup
  activePollingIntervals.set(documentId, intervalId);
}

/**
 * Stop polling for a specific document
 */
export function stopPollingDocument(documentId: string): void {
  const intervalId = activePollingIntervals.get(documentId);
  if (intervalId) {
    clearInterval(intervalId);
    activePollingIntervals.delete(documentId);
  }
}

/**
 * Stop all active polling
 */
export function stopAllPolling(): void {
  activePollingIntervals.forEach((intervalId) => {
    clearInterval(intervalId);
  });
  activePollingIntervals.clear();
}
