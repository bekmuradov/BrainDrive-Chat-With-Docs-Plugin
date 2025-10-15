import { ServiceRuntimeStatus } from './pluginTypes';

interface RequiredService {
    name: string;
    healthcheck_url: string;
}

export class HealthCheckService {
    private requiredRuntimes: RequiredService[];

    constructor(requiredRuntimes: RequiredService[]) {
        this.requiredRuntimes = requiredRuntimes;
    }

    private checkSingleService = async (service: RequiredService): Promise<ServiceRuntimeStatus> => {
        try {
            const response = await fetch(service.healthcheck_url, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            
            if (response.ok) {
                return { name: service.name, status: 'ready', lastChecked: new Date() };
            } else {
                return { name: service.name, status: 'not-ready', lastChecked: new Date(), error: `HTTP ${response.status}` };
            }
        } catch (error: any) {
            return { name: service.name, status: 'error', lastChecked: new Date(), error: error.message || 'Connection failed' };
        }
    }

    public checkAllServices = async (): Promise<ServiceRuntimeStatus[]> => {
        return Promise.all(
            this.requiredRuntimes.map(service => this.checkSingleService(service))
        );
    }
}
