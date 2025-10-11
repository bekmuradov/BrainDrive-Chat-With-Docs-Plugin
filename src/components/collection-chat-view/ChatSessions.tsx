import React from 'react';

import type { ChatSession } from '../../braindrive-plugin/pluginTypes';
import { NoChatSessions } from './NoChatSessions';
import { ChatSessionsList } from './ChatSessionsList';

interface ComponentProps {
    chatSessions: ChatSession[];
    onChatSessionSelect: (session: ChatSession) => void;
    onChatSessionDelete: (sessionId: string, sessionName: string) => void;
}

export const ChatSessions: React.FC<ComponentProps> = ({
    chatSessions,
    onChatSessionSelect,
    onChatSessionDelete,
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm">
            {chatSessions.length === 0 ? (
                <NoChatSessions />
            ) : (
                <ChatSessionsList
                    chatSessions={chatSessions}
                    onChatSessionSelect={onChatSessionSelect}
                    onChatSessionDelete={onChatSessionDelete}
                />
            )}
        </div>
    )
}
