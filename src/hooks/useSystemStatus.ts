import { useState, useEffect } from 'react';

export interface SystemTelemetry {
  cpuUsage: number;
  totalMemoryGB: number;
  freeMemoryGB: number;
  usedMemoryGB: number;
  memoryUsagePercent: number;
  platform: string;
  uptimeHours: number;
  battery: {
    percent: number;
    charging: boolean;
    status: string;
  };
  storage: Array<{
    drive: string;
    total_gb: number;
    free_gb: number;
    used_gb: number;
    percent_used: number;
  }>;
  isOnline: boolean;
}

export function useSystemStatus(intervalMs: number = 4000) {
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    cpuUsage: 12,
    totalMemoryGB: 16,
    freeMemoryGB: 8,
    usedMemoryGB: 8,
    memoryUsagePercent: 50,
    platform: 'Windows 10/11',
    uptimeHours: 1,
    battery: {
      percent: 98,
      charging: true,
      status: 'AC Connected',
    },
    storage: [
      {
        drive: 'C:\\',
        total_gb: 256,
        free_gb: 45,
        used_gb: 211,
        percent_used: 82,
      },
    ],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const fetchStatus = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    try {
      const [metrics, battery, storage] = await Promise.all([
        window.electronAPI.getMetrics().catch(() => null),
        window.electronAPI.getBattery().catch(() => null),
        window.electronAPI.getStorage().catch(() => null),
      ]);

      setTelemetry((prev) => ({
        ...prev,
        cpuUsage: metrics?.cpuUsage ?? prev.cpuUsage,
        totalMemoryGB: metrics?.totalMemoryGB ?? prev.totalMemoryGB,
        freeMemoryGB: metrics?.freeMemoryGB ?? prev.freeMemoryGB,
        usedMemoryGB: metrics?.usedMemoryGB ?? prev.usedMemoryGB,
        memoryUsagePercent: metrics?.memoryUsagePercent ?? prev.memoryUsagePercent,
        platform: metrics?.platform ?? prev.platform,
        uptimeHours: metrics?.uptimeHours ?? prev.uptimeHours,
        battery: battery?.success
          ? {
              percent: battery.percent,
              charging: battery.charging,
              status: battery.status,
            }
          : prev.battery,
        storage: Array.isArray(storage) && storage.length > 0 ? storage : prev.storage,
        isOnline: navigator.onLine,
      }));
    } catch (e) {
      console.warn('Error fetching system telemetry', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, intervalMs);

    const handleOnline = () => setTelemetry((p) => ({ ...p, isOnline: true }));
    const handleOffline = () => setTelemetry((p) => ({ ...p, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [intervalMs]);

  return { telemetry, refresh: fetchStatus };
}
