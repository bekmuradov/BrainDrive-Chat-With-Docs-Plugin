/**
 * Extract text content from various AI response data formats
 */
export function extractTextFromData(data: any): string {
  if (!data) return '';
  
  // Handle string responses
  if (typeof data === 'string') {
    return data;
  }
  
  // Handle object responses with various text fields
  if (typeof data === 'object') {
    // Priority order for text extraction - 'text' field first as it's what our API returns
    if (data.text && typeof data.text === 'string') {
      return data.text;
    }
    
    // Handle choices array format (OpenAI-style)
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      const choice = data.choices[0];
      if (choice.delta && choice.delta.content) {
        return choice.delta.content;
      }
      if (choice.message && choice.message.content) {
        return choice.message.content;
      }
      if (choice.text) {
        return choice.text;
      }
    }
    
    // Handle other common text fields
    const textFields = [
      'content',
      'message',
      'response',
      'output',
      'result',
      'answer'
    ];
    
    for (const field of textFields) {
      if (data[field] && typeof data[field] === 'string') {
        return data[field];
      }
    }
    
    // Handle streaming delta format
    if (data.delta && data.delta.content) {
      return data.delta.content;
    }
    
    // Handle message format
    if (data.message && data.message.content) {
      return data.message.content;
    }
  }
  
  return '';
}
