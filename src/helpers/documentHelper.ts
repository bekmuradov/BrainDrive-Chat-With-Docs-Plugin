/**
 * Create a temporary placeholder document for immediate UI feedback
 */
export function createPlaceholderDocument(file: File, collectionId: string): any {
  const tempId = 'temp-' + Math.random().toString(36).substring(2, 9);
  return {
    id: tempId,
    filename: '',
    original_filename: file.name,
    file_path: '',
    file_size: file.size,
    document_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
    collection_id: collectionId,
    status: 'processing',
    created_at: new Date().toISOString(),
    processed_at: null,
    metadata: {},
    chunk_count: 0,
    isPlaceholder: true
  };
}
