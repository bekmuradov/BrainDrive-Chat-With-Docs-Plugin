import React from "react";

import type { ChatSession } from '../../braindrive-plugin/pluginTypes';
import { ChatSessionsListItem } from "./ChatSessionsListItem";

interface ComponentProps {
    chatSessions: ChatSession[];
    onChatSessionSelect: (session: ChatSession) => void;
    maxHeight?: string;
    onChatSessionDelete: (sessionId: string, sessionName: string) => void;
}

export const ChatSessionsList: React.FC<ComponentProps> = ({
    chatSessions,
    onChatSessionSelect,
    onChatSessionDelete,
    maxHeight = "max-h-96",
}) => {
    return (
        <div className={`overflow-y-auto ${maxHeight}`}>
            <ul className="divide-y divide-gray-200">
                {chatSessions.map((session) => (
                    <li key={session.id}>
                        <ChatSessionsListItem
                            chatSession={session}
                            onChatSessionSelect={onChatSessionSelect}
                            onChatSessionDelete={onChatSessionDelete}
                        />
                        {/* Alternative list item */}
                        <div 
                            className="p-3 hover:bg-gray-50 cursor-pointer hidden"
                            onClick={() => onChatSessionSelect(session)}
                        >
                            <h4 className="text-sm font-medium text-gray-900">{session.name}</h4>
                            <p className="text-xs text-gray-500">
                                {session.message_count} messages • {new Date(session.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
