import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FlaskConical } from 'lucide-react';

interface DemoModeCardProps {
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
}

export default function DemoModeCard({ demoMode, setDemoMode }: DemoModeCardProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FlaskConical className="h-4 w-4" /> Demo Mode
          {demoMode && <Badge className="text-[10px] font-normal ml-1">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Simulate price changes</Label>
            <p className="text-xs text-muted-foreground">
              Random ±0.5% jitter every 3s to preview flash animations and count-up effects
            </p>
          </div>
          <Switch checked={demoMode} onCheckedChange={setDemoMode} />
        </div>
      </CardContent>
    </Card>
  );
}
