import { Loader2 } from 'lucide-react';

/**
 * Content Overlay Component
 * Shows disabled overlay when services aren't ready
 */
interface ContentOverlayProps {
  isServicesReady: boolean;
  children: React.ReactNode;
}

export const ContentOverlay: React.FC<ContentOverlayProps> = ({ isServicesReady, children }) => {
  if (isServicesReady) {
    return <>{children}</>;
  }
  
  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Waiting for Services
          </h3>
          <p className="text-sm text-gray-600">
            Backend services are starting. The plugin will be functional once all services are ready.
          </p>
        </div>
      </div>
    </div>
  );
};
