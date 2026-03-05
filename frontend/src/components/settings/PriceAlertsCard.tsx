import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, X, RefreshCw, Pencil, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { PriceAlert } from '@/types';

interface PriceAlertsCardProps {
  alerts: PriceAlert[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => PriceAlert | null;
  removeAlert: (id: string) => void;
  updateAlert: (id: string, updates: Partial<Pick<PriceAlert, 'symbol' | 'direction' | 'targetPrice'>>) => void;
  resetCount: (id: string) => void;
}

export default function PriceAlertsCard({ alerts, addAlert, removeAlert, updateAlert, resetCount }: PriceAlertsCardProps) {
  const [alertSymbol, setAlertSymbol] = useState<PriceAlert['symbol']>('BTC');
  const [alertDirection, setAlertDirection] = useState<PriceAlert['direction']>('above');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertRepeat, setAlertRepeat] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSymbol, setEditSymbol] = useState<PriceAlert['symbol']>('BTC');
  const [editDirection, setEditDirection] = useState<PriceAlert['direction']>('above');
  const [editPrice, setEditPrice] = useState('');

  const startEdit = (alert: PriceAlert) => {
    setEditingId(alert.id);
    setEditSymbol(alert.symbol);
    setEditDirection(alert.direction);
    setEditPrice(String(alert.targetPrice));
  };

  const saveEdit = () => {
    if (!editingId) return;
    const price = parseFloat(editPrice);
    if (!price || price <= 0) {
      toast.error('Enter a valid price greater than 0');
      return;
    }
    updateAlert(editingId, { symbol: editSymbol, direction: editDirection, targetPrice: price });
    setEditingId(null);
    toast.success('Alert updated');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-4 w-4" /> Price Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <div className="flex gap-2">
            <Select value={alertSymbol} onValueChange={(v) => setAlertSymbol(v as PriceAlert['symbol'])}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC">BTC</SelectItem>
                <SelectItem value="sBTC">sBTC</SelectItem>
                <SelectItem value="STX">STX</SelectItem>
              </SelectContent>
            </Select>
            <Select value={alertDirection} onValueChange={(v) => setAlertDirection(v as PriceAlert['direction'])}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Above</SelectItem>
                <SelectItem value="below">Below</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            type="number"
            placeholder="Price (USD)"
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
            className="flex-1 min-w-[120px]"
          />
          <div className="flex items-center gap-2 justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Repeat</Label>
              <Switch checked={alertRepeat} onCheckedChange={setAlertRepeat} />
            </div>
            <Button
              onClick={() => {
                const price = parseFloat(alertPrice);
                if (!price || price <= 0) {
                  toast.error('Enter a valid price greater than 0');
                  return;
                }
                addAlert({ symbol: alertSymbol, direction: alertDirection, targetPrice: price, repeat: alertRepeat });
                setAlertPrice('');
                setAlertRepeat(false);
                toast.success(`Alert set: ${alertSymbol} ${alertDirection} $${price.toLocaleString()}${alertRepeat ? ' (repeating)' : ''}`);
              }}
            >
              Add
            </Button>
          </div>
        </div>

        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">No price alerts set</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) =>
              editingId === alert.id ? (
                <div key={alert.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 flex-wrap">
                  <Select value={editSymbol} onValueChange={(v) => setEditSymbol(v as PriceAlert['symbol'])}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="sBTC">sBTC</SelectItem>
                      <SelectItem value="STX">STX</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={editDirection} onValueChange={(v) => setEditDirection(v as PriceAlert['direction'])}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above</SelectItem>
                      <SelectItem value="below">Below</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="flex-1 min-w-[100px]"
                  />
                  <Button size="sm" onClick={saveEdit}>
                    <Check className="h-4 w-4 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm flex items-center gap-2">
                    {alert.symbol} {alert.direction}{' '}
                    <span className="font-mono font-medium">
                      ${alert.targetPrice.toLocaleString()}
                    </span>
                    {alert.repeat && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <RefreshCw className="h-3 w-3" />
                        {(alert.fireCount || 0) > 0 && (
                          <>
                            <span className="text-xs font-mono">x{alert.fireCount}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => resetCount(alert.id)}
                              title="Reset fire count"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEdit(alert)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeAlert(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
