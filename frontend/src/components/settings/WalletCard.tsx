import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Copy, LogOut, Check } from 'lucide-react';
import type { WalletState } from '@/types';

interface WalletCardProps {
  wallet: WalletState;
  connect: () => void;
  disconnect: () => void;
  isConnecting?: boolean;
}

export default function WalletCard({ wallet, connect, disconnect, isConnecting }: WalletCardProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {wallet.isConnected && wallet.address ? (
          <>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Connected Address</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                <code className="font-mono text-sm flex-1 truncate">{wallet.address}</code>
                <Button variant="ghost" size="icon" onClick={copyAddress} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button variant="destructive" onClick={disconnect} className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> Disconnect Wallet
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-3">No wallet connected</p>
            <Button onClick={connect} disabled={isConnecting} className="w-full">
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
