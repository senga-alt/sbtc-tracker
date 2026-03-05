import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrices } from '@/hooks/usePrices';
import { fetchMarketChart } from '@/lib/coingecko';
import { ErrorState } from '@/components/ErrorState';
import type { TimeInterval } from '@/types';
import type { MarketChartPoint } from '@/lib/coingecko';
import { formatUsd } from '@/lib/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const intervals: TimeInterval[] = ['1H', '24H', '7D', '30D'];
const intervalToDays: Record<TimeInterval, number | string> = {
  '1H': 0.042,
  '24H': 1,
  '7D': 7,
  '30D': 30,
};

function formatXLabel(timestamp: number, interval: TimeInterval): string {
  const d = new Date(timestamp);
  if (interval === '1H' || interval === '24H') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function PriceChart() {
  const [interval, setInterval] = useState<TimeInterval>('24H');
  const { isLive, isStale } = usePrices();
  const [chartData, setChartData] = useState<MarketChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'api' | 'rate-limited' | null>(null);

  const loadChart = useCallback(async (intv: TimeInterval) => {
    setLoading(true);
    setError(null);
    try {
      const days = intv === '1H' ? 1 : intervalToDays[intv];
      let data = await fetchMarketChart('bitcoin', days);
      if (intv === '1H') {
        const cutoff = Date.now() - 3_600_000;
        data = data.filter(p => p.timestamp >= cutoff);
      }
      setChartData(data);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('Rate limited') ? 'rate-limited' : 'api');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChart(interval);
  }, [interval, loadChart]);

  const handleInterval = (i: TimeInterval) => setInterval(i);

  // Downsample for display (max ~60 points)
  const displayData = chartData.length > 60
    ? chartData.filter((_, idx) => idx % Math.ceil(chartData.length / 60) === 0)
    : chartData;

  return (
    <Card className="glass-card">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">sBTC Price</CardTitle>
          <Badge variant="outline" className={`text-[10px] ${isLive ? 'border-success/50 text-success' : 'border-muted-foreground/50 text-muted-foreground'}`}>
            {isLive ? '● Live' : '○ Offline'}
          </Badge>
          {isStale && (
            <Badge variant="outline" className="text-[10px] border-warning/50 text-warning">
              ⚠ May be outdated
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          {intervals.map(i => (
            <Button
              key={i}
              variant={interval === i ? 'default' : 'ghost'}
              size="sm"
              className={`text-xs h-7 px-3 ${interval === i ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => handleInterval(i)}
            >
              {i}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : error && chartData.length === 0 ? (
          <ErrorState
            variant={error}
            onRetry={() => loadChart(interval)}
          />
        ) : (
          <>
            {error && chartData.length > 0 && (
              <Badge variant="outline" className="mb-2 text-[10px] border-warning/50 text-warning">
                ⚠ Chart data may be outdated
              </Badge>
            )}
            <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={displayData}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(245, 100%, 63%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(245, 100%, 63%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v: number) => formatXLabel(v, interval)}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                width={60}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as MarketChartPoint;
                  return (
                    <div className="glass-card rounded-lg p-3 border border-border/50 shadow-lg">
                      <p className="font-mono font-bold">{formatUsd(point.price)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(point.timestamp).toLocaleString()}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="hsl(245, 100%, 63%)"
                strokeWidth={2}
                fill="url(#priceGrad)"
              />
            </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
