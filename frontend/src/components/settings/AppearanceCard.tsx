import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { Theme } from '@/types';

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

interface AppearanceCardProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export default function AppearanceCard({ theme, setTheme }: AppearanceCardProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Appearance</CardTitle>
      </CardHeader>
      <CardContent>
        <Label className="text-sm text-muted-foreground mb-3 block">Theme</Label>
        <div className="flex gap-2">
          {themeOptions.map(opt => (
            <Button
              key={opt.value}
              variant={theme === opt.value ? 'default' : 'outline'}
              className={`flex-1 ${theme === opt.value ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setTheme(opt.value)}
            >
              <opt.icon className="mr-2 h-4 w-4" />
              {opt.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
