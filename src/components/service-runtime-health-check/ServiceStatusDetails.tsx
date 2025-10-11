import { 
	Loader2,
	CheckCircle,
	XCircle,
} from 'lucide-react';
import type { ServiceRuntimeStatus } from './serviceRuntimeTypes';

/**
 * Service Status Details Component
 * Shows detailed status of all services in a dropdown
 */
interface ServiceStatusDetailsProps {
  serviceStatuses: ServiceRuntimeStatus[];
  onClose: () => void;
  onRefresh: () => void;
}

export const ServiceStatusDetails: React.FC<ServiceStatusDetailsProps> = ({ 
  serviceStatuses, 
  onClose, 
  onRefresh 
}) => (
  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Service Status</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-3">
        {serviceStatuses.map((service, index) => (
          <div key={index} className="flex items-start justify-between pb-3 border-b last:border-b-0">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">
                {service.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              {service.lastChecked && (
                <p className="text-xs text-gray-500 mt-1">
                  Last checked: {service.lastChecked.toLocaleTimeString()}
                </p>
              )}
              {service.error && (
                <p className="text-xs text-red-500 mt-1">{service.error}</p>
              )}
            </div>
            <div className="ml-3">
              {service.status === 'ready' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {service.status === 'checking' && (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              )}
              {(service.status === 'not-ready' || service.status === 'error') && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={onRefresh}
        className="w-full mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
      >
        Refresh Status
      </button>
    </div>
  </div>
);
