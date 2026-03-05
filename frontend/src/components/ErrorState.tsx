import { AlertTriangle, WifiOff, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ErrorVariant = 'api' | 'offline' | 'rate-limited' | 'generic';

interface ErrorStateProps {
  variant?: ErrorVariant;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const variants: Record<ErrorVariant, { icon: typeof AlertTriangle; title: string; message: string }> = {
  api: {
    icon: AlertTriangle,
    title: 'Service Unavailable',
    message: 'Unable to connect to the API. Please try again later.',
  },
  offline: {
    icon: WifiOff,
    title: "You're Offline",
    message: 'Check your internet connection and try again.',
  },
  'rate-limited': {
    icon: Clock,
    title: 'Too Many Requests',
    message: 'Please wait a moment before trying again.',
  },
  generic: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
  },
};

export function ErrorState({ variant = 'generic', title, message, onRetry }: ErrorStateProps) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert" aria-live="assertive">
      <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-destructive" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title ?? config.title}</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-sm">{message ?? config.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
