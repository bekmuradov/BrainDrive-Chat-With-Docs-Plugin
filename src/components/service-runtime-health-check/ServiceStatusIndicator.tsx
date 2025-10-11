import { 
	Loader2,
	CheckCircle,
	XCircle,
	Clock,
} from 'lucide-react';

import type { ServiceRuntimeStatus } from "./serviceRuntimeTypes";
import { ServiceStatusDetails } from './ServiceStatusDetails';

/**
 * Service Status Indicator Component
 * Shows overall service health with clickable details
 */
interface ServiceStatusIndicatorProps {
  serviceStatuses: ServiceRuntimeStatus[];
  showDetails: boolean;
  onToggleDetails: () => void;
  onRefresh: () => void;
}

export const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({ 
  serviceStatuses, 
  showDetails, 
  onToggleDetails,
  onRefresh 
}) => {
  const getOverallStatus = (): 'ready' | 'not-ready' | 'checking' | 'partial' => {
    if (serviceStatuses.every(s => s.status === 'ready')) {
      return 'ready';
    } else if (serviceStatuses.every(s => s.status === 'checking')) {
      return 'checking';
    } else if (serviceStatuses.some(s => s.status === 'ready')) {
      return 'partial';
    } else {
      return 'not-ready';
    }
  };

  const overallStatus = getOverallStatus();
  
  let statusIcon;
  let statusText;
  let statusColor;
  
  switch (overallStatus) {
    case 'ready':
      statusIcon = <CheckCircle className="h-5 w-5" />;
      statusText = 'Services Ready';
      statusColor = 'text-green-600';
      break;
    case 'checking':
      statusIcon = <Loader2 className="h-5 w-5 animate-spin" />;
      statusText = 'Checking Services...';
      statusColor = 'text-blue-600';
      break;
    case 'partial':
      statusIcon = <Clock className="h-5 w-5" />;
      statusText = 'Services Starting...';
      statusColor = 'text-yellow-600';
      break;
    case 'not-ready':
      statusIcon = <XCircle className="h-5 w-5" />;
      statusText = 'Services Not Ready';
      statusColor = 'text-red-600';
      break;
  }
  
  return (
    <div className="relative">
      <button
        onClick={onToggleDetails}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${statusColor}`}
        title="Click for details"
      >
        {statusIcon}
        <span className="text-sm font-medium">{statusText}</span>
      </button>
      
      {showDetails && (
        <ServiceStatusDetails
          serviceStatuses={serviceStatuses}
          onClose={onToggleDetails}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
