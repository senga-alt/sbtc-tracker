import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Bell } from 'lucide-react';
import type { NotificationPreferences } from '@/hooks/useNotificationPreferences';

interface NotificationsCardProps {
  prefs: NotificationPreferences;
  updatePrefs: (patch: Partial<NotificationPreferences>) => void;
  supportsPush: boolean;
  pushPermission: NotificationPermission;
  onPushToggle: (checked: boolean) => void;
}

export default function NotificationsCard({ prefs, updatePrefs, supportsPush, pushPermission, onPushToggle }: NotificationsCardProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Price movement alerts</Label>
            <p className="text-xs text-muted-foreground">Get notified when prices move significantly</p>
          </div>
          <Switch
            checked={prefs.priceAlerts}
            onCheckedChange={(checked) => updatePrefs({ priceAlerts: checked })}
          />
        </div>
        {prefs.priceAlerts && (
          <div>
            <Label className="text-sm text-muted-foreground mb-3 block">
              Price threshold: {prefs.priceThreshold}%
            </Label>
            <Slider
              value={[prefs.priceThreshold]}
              onValueChange={([v]) => updatePrefs({ priceThreshold: v })}
              min={1}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1%</span>
              <span>20%</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Transaction confirmations</Label>
            <p className="text-xs text-muted-foreground">Alert when transactions are confirmed</p>
          </div>
          <Switch
            checked={prefs.transactionAlerts}
            onCheckedChange={(checked) => updatePrefs({ transactionAlerts: checked })}
          />
        </div>
        {supportsPush && (
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm flex items-center gap-2">
                Browser notifications
                <Badge variant="outline" className="text-[10px] font-normal">
                  {pushPermission === 'granted' ? 'Granted' : pushPermission === 'denied' ? 'Denied' : 'Not asked'}
                </Badge>
              </Label>
              <p className="text-xs text-muted-foreground">Receive alerts even when this tab is in the background</p>
            </div>
            <Switch
              checked={prefs.pushNotifications}
              onCheckedChange={onPushToggle}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
