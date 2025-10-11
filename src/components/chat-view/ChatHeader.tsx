import React from "react";

interface ChatHeaderProps {
    sessionName: string;
    messagesLenght: string | number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    sessionName,
    messagesLenght,
}) => {
    return (
        <div className="p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">{sessionName}</h3>
            <p className="text-sm text-gray-500">{messagesLenght} messages</p>
        </div>
    )
}