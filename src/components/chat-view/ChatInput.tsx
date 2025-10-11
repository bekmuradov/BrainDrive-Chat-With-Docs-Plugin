import React from "react";
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
    sending: boolean;
    newMessage: string;
    onChange: (newMessage: string) => void;
    onMessageSend: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    newMessage,
    sending,
    onChange,
    onMessageSend,
}) => {
    return (
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onMessageSend();
                }
              }}
            />
            <button
              onClick={onMessageSend}
              disabled={sending || !newMessage.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
    )
}
