import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StaggerContainer } from '@/components/layout/StaggerContainer';
import { StaggerItem } from '@/components/layout/StaggerItem';
import { formatRelativeTime } from '@/lib/formatters';
import {
  getNotifications,
  markAllRead,
  clearHistory,
  type NotificationEntry,
} from '@/lib/notificationHistory';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Bell,
  CheckCheck,
  Trash2,
} from 'lucide-react';

function iconFor(entry: NotificationEntry) {
  if (entry.type === 'price') {
    return entry.message.includes('📈') ? TrendingUp : TrendingDown;
  }
  return entry.message.toLowerCase().includes('received') ? ArrowDownLeft : ArrowUpRight;
}

export default function NotificationHistory() {
  const [entries, setEntries] = useState<NotificationEntry[]>(getNotifications);
  const unread = entries.filter(e => !e.read).length;

  const handleMarkRead = useCallback(() => {
    markAllRead();
    setEntries(getNotifications());
  }, []);

  const handleClear = useCallback(() => {
    clearHistory();
    setEntries([]);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notification History</h1>
          {unread > 0 && <Badge>{unread}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkRead} disabled={unread === 0}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear} disabled={entries.length === 0}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card className="glass-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-10 w-10 mb-3 opacity-40" />
          <p>No notifications yet</p>
        </Card>
      ) : (
        <StaggerContainer className="space-y-2">
          {entries.map(entry => {
            const Icon = iconFor(entry);
            return (
              <StaggerItem key={entry.id}>
                <Card className="glass-card flex items-start gap-3 p-4">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{entry.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(new Date(entry.timestamp))}
                    </p>
                  </div>
                  {!entry.read && (
                    <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
