import { Loader2 } from 'lucide-react';

interface ActionButtonProps {
    onClick: () => void;
    text: string;
    icon: React.ReactNode;
    isProcessing?: boolean;
    disabled?: boolean;
    processingText?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
    onClick,
    text,
    icon,
    isProcessing = false,
    disabled = false,
    processingText,
}) => {
    const isDisabled = disabled || isProcessing;

    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-all duration-200
                ${isDisabled
                    ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                    : 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer'}
            `}
        >
            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {icon}
            <span className="ml-1">
                {isProcessing && processingText ? processingText : text}
            </span>
        </button>
    );
};
