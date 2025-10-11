/**
 * Document Processing Service
 * * This service handles document uploads and text extraction for chat context.
 * It provides methods to process various file types and extract text content.
 */

import { ApiService } from '../types';

// Helper type to handle unpredictable API response wrappers
type ApiResponse<T> = T | { data: T };

export interface DocumentProcessingResult {
  filename: string;
  file_type: string;
  content_type: string;
  file_size: number;
  extracted_text: string;
  text_length: number;
  processing_success: boolean;
  error?: string;
}

export interface MultipleDocumentProcessingResult {
  results: DocumentProcessingResult[];
  total_files: number;
  successful_files: number;
  failed_files: number;
}

export interface SupportedFileTypes {
  supported_types: Record<string, string>;
  max_file_size_mb: number;
  max_files_per_request: number;
}

export class DocumentService {
  private apiService: ApiService | null;

  constructor(apiService?: ApiService) {
    this.apiService = apiService || null;
  }

  // --- Utility Method for Robust Data Extraction ---
  private extractData<T>(response: ApiResponse<T>): T {
      // If 'data' exists and is not null/undefined, return it.
      // Otherwise, assume the entire response is the expected data T.
      return (response as { data: T }).data !== undefined ? (response as { data: T }).data : (response as T);
  }

  /**
   * Set API service for authenticated requests
   */
  setApiService(apiService: ApiService): void {
    this.apiService = apiService;
  }

  /**
   * Get current API service
   */
  getApiService(): ApiService | null {
    return this.apiService;
  }

  /**
   * Get supported file types and limits
   */
  async getSupportedFileTypes(): Promise<SupportedFileTypes> {
    if (!this.apiService) {
      throw new Error('API service not available');
    }

    try {
      // 🚀 Using ApiResponse<SupportedFileTypes> for the generic type
      const response = await this.apiService.get<ApiResponse<SupportedFileTypes>>('/api/v1/documents/supported-types');
      // 🚀 Using the new extractData method to safely retrieve the data
      return this.extractData(response);
    } catch (error) {
      console.error('Error getting supported file types:', error);
      throw error;
    }
  }

  /**
   * Process a single document and extract text
   */
  async processDocument(file: File): Promise<DocumentProcessingResult> {
    if (!this.apiService) {
      throw new Error('API service not available');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`📄 Processing document: ${file.name} (${file.type}, ${file.size} bytes)`);

      // 🚀 Using ApiResponse<DocumentProcessingResult> for the generic type
      const response = await this.apiService.post<ApiResponse<DocumentProcessingResult>>('/api/v1/documents/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log(`✅ Document processed successfully: ${file.name}`);
      // 🚀 Using the new extractData method
      return this.extractData(response);
    } catch (error) {
      console.error(`❌ Error processing document ${file.name}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple documents and extract text
   */
  async processMultipleDocuments(files: File[]): Promise<MultipleDocumentProcessingResult> {
    if (!this.apiService) {
      throw new Error('API service not available');
    }

    if (files.length === 0) {
      throw new Error('No files provided');
    }

    if (files.length > 10) {
      throw new Error('Too many files. Maximum is 10 files');
    }

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      console.log(`📄 Processing ${files.length} documents`);

      // 🚀 Using ApiResponse<MultipleDocumentProcessingResult> for the generic type
      const response = await this.apiService.post<ApiResponse<MultipleDocumentProcessingResult>>('/api/v1/documents/process-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 🚀 Using the new extractData method
      const result = this.extractData(response);
      console.log(`✅ Documents processed: ${result.successful_files}/${result.total_files} successful`);
      return result;
    } catch (error) {
      console.error('❌ Error processing multiple documents:', error);
      throw error;
    }
  }

  // --- Rest of the class methods remain the same ---

  /**
   * Check if a file type is supported
   */
  async isFileTypeSupported(file: File): Promise<boolean> {
    try {
      const supportedTypes = await this.getSupportedFileTypes();
      return file.type in supportedTypes.supported_types;
    } catch (error) {
      console.error('Error checking file type support:', error);
      return false;
    }
  }

  /**
   * Check if file size is within limits
   */
  async isFileSizeValid(file: File): Promise<boolean> {
    try {
      const supportedTypes = await this.getSupportedFileTypes();
      const maxSizeBytes = supportedTypes.max_file_size_mb * 1024 * 1024;
      return file.size <= maxSizeBytes;
    } catch (error) {
      console.error('Error checking file size:', error);
      return false;
    }
  }

  /**
   * Validate file before processing
   */
  async validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check file type
      const typeSupported = await this.isFileTypeSupported(file);
      if (!typeSupported) {
        const supportedTypes = await this.getSupportedFileTypes();
        const supportedTypesList = Object.keys(supportedTypes.supported_types).join(', ');
        return {
          valid: false,
          error: `Unsupported file type. Supported types: ${supportedTypesList}`
        };
      }

      // Check file size
      const sizeValid = await this.isFileSizeValid(file);
      if (!sizeValid) {
        const supportedTypes = await this.getSupportedFileTypes();
        return {
          valid: false,
          error: `File too large. Maximum size is ${supportedTypes.max_file_size_mb}MB`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Error validating file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Format extracted text for chat context
   */
  formatTextForChatContext(result: DocumentProcessingResult): string {
    const { filename, file_type, extracted_text, text_length } = result;

    let context = `[DOCUMENT CONTEXT - ${filename.toUpperCase()}]\n`;
    context += `File Type: ${file_type}\n`;
    context += `Text Length: ${text_length} characters\n`;
    context += `Content:\n\n${extracted_text}\n\n`;
    context += `[END DOCUMENT CONTEXT]`;

    return context;
  }

  /**
   * Format multiple document results for chat context
   */
  formatMultipleTextsForChatContext(results: DocumentProcessingResult[]): string {
    let context = `[MULTIPLE DOCUMENTS CONTEXT]\n`;
    context += `Total Documents: ${results.length}\n\n`;

    results.forEach((result, index) => {
      context += `--- Document ${index + 1}: ${result.filename} ---\n`;
      context += `Type: ${result.file_type}\n`;
      context += `Length: ${result.text_length} characters\n`;
      context += `Content:\n${result.extracted_text}\n\n`;
    });

    context += `[END MULTIPLE DOCUMENTS CONTEXT]`;

    return context;
  }
}
