import { Clock } from 'lucide-react';
import type { ServiceRuntimeStatus } from './serviceRuntimeTypes';

/**
 * Service Warning Banner Component
 * Shows when services are not ready
 */
interface ServiceWarningBannerProps {
  serviceStatuses: ServiceRuntimeStatus[];
}

export const ServiceWarningBanner: React.FC<ServiceWarningBannerProps> = ({ serviceStatuses }) => {
  const overallStatus = serviceStatuses.every(s => s.status === 'ready') ? 'ready' :
                        serviceStatuses.every(s => s.status === 'checking') ? 'checking' :
                        'not-ready';
  
  if (overallStatus === 'ready' || overallStatus === 'checking') {
    return null;
  }
  
  const notReadyServices = serviceStatuses.filter(s => s.status !== 'ready');
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-3">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <Clock className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-800 mb-1">
              Plugin Starting Services
            </h4>
            <p className="text-sm text-yellow-700">
              The plugin is installing or starting required services ({notReadyServices.map(s => s.name).join(', ')}) 
              and might take a few minutes (1 to 15 minutes). Please wait, the plugin will be ready to use 
              when all services are up and running.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
