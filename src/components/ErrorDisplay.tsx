import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Error Alert Component
 * Displays dismissible error messages
 */
interface ErrorAlertProps {
  error: string;
  onDismiss: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => (
  <div className="max-w-7xl mx-auto px-4 py-3">
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
      <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
      <span className="text-red-700 flex-1">{error}</span>
      <button
        onClick={onDismiss}
        className="ml-auto text-red-500 hover:text-red-700 text-xl leading-none"
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  </div>
);

// TEMPLATE: Error display component
// TODO: Customize this component for your plugin's error handling

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  className = '' 
}) => {
  return (
    <div className={`error-display ${className}`}>
      <div className="error-icon">⚠️</div>
      <p className="error-message">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          Try Again
        </button>
      )}
    </div>
  );
};
