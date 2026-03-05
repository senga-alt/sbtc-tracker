import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchMarketChart } from '@/lib/coingecko';
import { ErrorState } from '@/components/ErrorState';
import { formatUsd } from '@/lib/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const SBTC_BALANCE = 0.128567;
const STX_BALANCE = 2450.50;
const SBTC_RATIO = 0.9995;

type PortfolioInterval = '7D' | '30D';
const intervals: PortfolioInterval[] = ['7D', '30D'];
const intervalToDays: Record<PortfolioInterval, number> = { '7D': 7, '30D': 30 };

interface PortfolioPoint {
  timestamp: number;
  value: number;
}

function generateMockData(days: number): PortfolioPoint[] {
  const points: PortfolioPoint[] = [];
  const now = Date.now();
  const totalMs = days * 24 * 60 * 60 * 1000;
  const step = totalMs / 59;
  let value = 9200;

  for (let i = 0; i < 60; i++) {
    value += (Math.random() - 0.48) * 40; // slight upward bias
    value = Math.max(value, 8500);
    points.push({ timestamp: now - totalMs + i * step, value });
  }
  return points;
}

function alignAndMerge(
  btcData: { timestamp: number; price: number }[],
  stxData: { timestamp: number; price: number }[]
): PortfolioPoint[] {
  if (!btcData.length || !stxData.length) return [];

  // Use BTC timestamps as the reference, find nearest STX price for each
  const points: PortfolioPoint[] = [];
  let stxIdx = 0;

  for (const btcPoint of btcData) {
    // Advance stxIdx to nearest match
    while (
      stxIdx < stxData.length - 1 &&
      Math.abs(stxData[stxIdx + 1].timestamp - btcPoint.timestamp) <
        Math.abs(stxData[stxIdx].timestamp - btcPoint.timestamp)
    ) {
      stxIdx++;
    }

    const stxPrice = stxData[stxIdx].price;
    const value =
      SBTC_BALANCE * btcPoint.price * SBTC_RATIO + STX_BALANCE * stxPrice;

    points.push({ timestamp: btcPoint.timestamp, value });
  }

  return points;
}

function formatXLabel(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function PortfolioChart() {
  const [interval, setInterval] = useState<PortfolioInterval>('7D');
  const [data, setData] = useState<PortfolioPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'api' | 'rate-limited' | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const { demoMode } = useDemoMode();

  const loadChart = useCallback(async (intv: PortfolioInterval) => {
    const days = intervalToDays[intv];

    if (demoMode) {
      setData(generateMockData(days));
      setIsUsingMockData(true);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [btcData, stxData] = await Promise.all([
        fetchMarketChart('bitcoin', days),
        fetchMarketChart('blockstack', days),
      ]);
      const merged = alignAndMerge(btcData, stxData);
      setData(merged);
      setIsUsingMockData(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('Rate limited') ? 'rate-limited' : 'api');
      setData(generateMockData(days));
      setIsUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    loadChart(interval);
  }, [interval, loadChart]);

  // Demo mode jitter
  useEffect(() => {
    if (!demoMode || data.length === 0) return;
    const id = window.setInterval(() => {
      setData(prev =>
        prev.map(p => ({
          ...p,
          value: p.value * (1 + (Math.random() - 0.5) * 0.01),
        }))
      );
    }, 3000);
    return () => clearInterval(id);
  }, [demoMode, data.length]);

  // Downsample to ~60 points
  const displayData = useMemo(() => {
    if (data.length <= 60) return data;
    const step = Math.ceil(data.length / 60);
    return data.filter((_, i) => i % step === 0);
  }, [data]);

  const { gainLoss, gainLossPercent, isPositive } = useMemo(() => {
    if (displayData.length < 2)
      return { gainLoss: 0, gainLossPercent: 0, isPositive: true };
    const start = displayData[0].value;
    const end = displayData[displayData.length - 1].value;
    const gl = end - start;
    const glp = (gl / start) * 100;
    return { gainLoss: gl, gainLossPercent: glp, isPositive: gl >= 0 };
  }, [displayData]);

  const gradientId = 'portfolioGrad';
  const strokeColor = isPositive
    ? 'hsl(var(--success))'
    : 'hsl(var(--destructive))';

  return (
    <Card className="glass-card">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-lg">Portfolio Value</CardTitle>
          {isUsingMockData && !loading && (
            <Badge
              variant="outline"
              className="text-[10px] border-warning/50 text-warning"
            >
              Simulated History
            </Badge>
          )}
          {!loading && displayData.length >= 2 && !isUsingMockData && (
            <Badge
              className={
                isPositive
                  ? 'bg-success/15 text-success border-success/30'
                  : 'bg-destructive/15 text-destructive border-destructive/30'
              }
            >
              {isPositive ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {isPositive ? '+' : ''}
              {formatUsd(gainLoss)} ({gainLossPercent >= 0 ? '+' : ''}
              {gainLossPercent.toFixed(2)}%)
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          {intervals.map((i) => (
            <Button
              key={i}
              variant={interval === i ? 'default' : 'ghost'}
              size="sm"
              className={`text-xs h-7 px-3 ${interval === i ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setInterval(i)}
            >
              {i}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : error && data.length === 0 ? (
          <ErrorState variant={error} onRetry={() => loadChart(interval)} />
        ) : (
          <>
            {error && !isUsingMockData && data.length > 0 && (
              <Badge
                variant="outline"
                className="mb-2 text-[10px] border-warning/50 text-warning"
              >
                ⚠ Chart data may be outdated
              </Badge>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXLabel}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
                  }
                  width={65}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload as PortfolioPoint;
                    return (
                      <div className="glass-card rounded-lg p-3 border border-border/50 shadow-lg">
                        <p className="font-mono font-bold">{formatUsd(point.value)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(point.timestamp).toLocaleString()}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
