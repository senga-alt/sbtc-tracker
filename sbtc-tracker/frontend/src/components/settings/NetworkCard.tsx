import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface NetworkCardProps {
  network: 'mainnet' | 'testnet';
  setNetwork: (n: 'mainnet' | 'testnet') => void;
}

export default function NetworkCard({ network, setNetwork }: NetworkCardProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Network</CardTitle>
      </CardHeader>
      <CardContent>
        <Label className="text-sm text-muted-foreground mb-3 block">Select Network</Label>
        <div className="flex gap-2">
          {(['mainnet', 'testnet'] as const).map(n => (
            <Button
              key={n}
              variant={network === n ? 'default' : 'outline'}
              className={`flex-1 capitalize ${network === n ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setNetwork(n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
