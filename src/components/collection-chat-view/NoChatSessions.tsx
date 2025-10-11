import React from "react";
import {MessageSquare} from 'lucide-react';

export const NoChatSessions: React.FC = () => {
    return (
        <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No chat sessions</h3>
            <p className="text-xs text-gray-600">Create a session to start chatting</p>
        </div>
    )
}
