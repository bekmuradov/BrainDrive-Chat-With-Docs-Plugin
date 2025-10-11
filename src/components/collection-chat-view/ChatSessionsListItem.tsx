import React from "react";
import { Trash2 } from 'lucide-react';
import { formatDate } from "../../utils";
import type { ChatSession } from '../../braindrive-plugin/pluginTypes';

interface ComponentProps {
    chatSession: ChatSession;
    onChatSessionSelect: (session: ChatSession) => void;
    onChatSessionDelete: (sessionId: string, sessionName: string) => void;
}

export const ChatSessionsListItem: React.FC<ComponentProps> = ({chatSession, onChatSessionSelect, onChatSessionDelete}) => {

    const getMessageCountElement = () => {
        if ((chatSession.message_count || 0) > 0) {
            return (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    {chatSession.message_count}
                </span>
            );
        }
        return null;
    };
    return (
        <div className="chat-session-item group p-3 hover:bg-gray-50 cursor-pointer border-l-4 transition-colors border-transparent"
                onClick={() => onChatSessionSelect(chatSession)}>
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <p
                        className="text-sm font-medium text-gray-900 truncate"
                        title={chatSession.name}
                    >{chatSession.name}</p>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">{formatDate(chatSession.updated_at)}</p>
                    </div>
                </div>
                <div className="ml-2 flex flex-col items-center">
                    {/* <MessageCircle className="h-4 w-4" /> */}
                    {getMessageCountElement()}
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            onChatSessionDelete(chatSession.id, chatSession.name)
                        }}
                        className="delete-session-btn mt-1 p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title={`Delete ${chatSession.name}`}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
