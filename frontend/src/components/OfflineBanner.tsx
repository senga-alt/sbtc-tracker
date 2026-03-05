import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="bg-warning/15 border-b border-warning/30 text-warning px-4 py-2 text-center text-sm flex items-center justify-center gap-2"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="h-4 w-4" />
      You're offline. Showing cached data.
    </div>
  );
}
