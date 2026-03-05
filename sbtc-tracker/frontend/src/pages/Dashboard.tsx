import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useSbtcBalance } from '@/hooks/useSbtcBalance';
import { usePrices } from '@/hooks/usePrices';
import { useTransactions } from '@/hooks/useTransactions';
import { usePriceFlash } from '@/hooks/usePriceFlash';
import { formatUsd, formatTokenAmount, formatChangePercent, formatRelativeTime, truncateAddress } from '@/lib/formatters';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { PriceChart } from '@/components/dashboard/PriceChart';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';
import { StaggerContainer } from '@/components/layout/StaggerContainer';
import { StaggerItem } from '@/components/layout/StaggerItem';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Clock, ExternalLink, ArrowUpDown, AlertTriangle, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { ErrorState } from '@/components/ErrorState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function StatSkeleton() {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <Skeleton className="h-4 w-20 mb-3" />
        <Skeleton className="h-8 w-36 mb-2" />
        <Skeleton className="h-5 w-24" />
      </CardContent>
    </Card>
  );
}

const txIcon = {
  send: ArrowUpRight,
  receive: ArrowDownLeft,
  swap: ArrowLeftRight,
};
const txColor = {
  send: 'text-destructive',
  receive: 'text-success',
  swap: 'text-primary',
};

const TOKEN_ICONS: Record<string, string> = {
  sBTC: '₿',
  STX: 'Ⓢ',
  BTC: '₿',
};

type SortColumn = 'token' | 'balance' | 'value' | 'change';
type SortDir = 'asc' | 'desc';

const txContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const txItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function Dashboard() {
  const { portfolio, isLoading: portLoading } = usePortfolio();
  const { sbtcBalance, isLoading: sbtcLoading } = useSbtcBalance();
  const { prices, isLoading: priceLoading, isStale, hasError, retry } = usePrices();
  const { transactions, isLoading: txLoading } = useTransactions();
  const { getFlashClass, getFlashKey } = usePriceFlash(prices);

  const [sortCol, setSortCol] = useState<SortColumn>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const btc = prices.find(p => p.symbol === 'BTC');
  const stx = prices.find(p => p.symbol === 'STX');
  const isLoading = portLoading || sbtcLoading || priceLoading;

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const sortedHoldings = useMemo(() => {
    if (!portfolio?.holdings) return [];
    const holdings = [...portfolio.holdings];
    const mul = sortDir === 'asc' ? 1 : -1;
    holdings.sort((a, b) => {
      switch (sortCol) {
        case 'token': return mul * a.token.localeCompare(b.token);
        case 'balance': return mul * (a.balance - b.balance);
        case 'value': return mul * (a.value - b.value);
        case 'change': return mul * (a.changePercent24h - b.changePercent24h);
        default: return 0;
      }
    });
    return holdings;
  }, [portfolio?.holdings, sortCol, sortDir]);

  const SortHeader = ({ col, label }: { col: SortColumn; label: string }) => (
    <TableHead
      className="text-right cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => handleSort(col)}
      role="columnheader"
      aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      aria-label={`Sort by ${label}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortCol === col ? 'text-primary' : 'text-muted-foreground/50'}`} />
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <NotificationProvider prices={prices} />
      <h1 className="text-2xl font-bold">Portfolio</h1>

      {/* Stale price warning */}
      {isStale && (
        <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 text-warning rounded-lg px-4 py-2 text-sm" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Prices may be outdated. Data hasn't been updated in over 5 minutes.
        </div>
      )}

      {/* API error state */}
      {!isLoading && hasError && prices.length === 0 && (
        <ErrorState variant="api" onRetry={retry} />
      )}

      {/* Top stat cards */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <StaggerItem enableHover>
          {isLoading || !portfolio ? (
            <StatSkeleton />
          ) : (
            <Card className="glass-card gradient-card sm:col-span-2 lg:col-span-1 h-full">
              <CardContent className="p-6" aria-live="polite" aria-busy={isLoading}>
                <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                <p className="text-3xl font-bold font-mono">
                  <AnimatedNumber value={portfolio.totalValue} formatter={formatUsd} />
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={portfolio.changePercent24h >= 0 ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'}>
                    {portfolio.changePercent24h >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                    {formatChangePercent(portfolio.changePercent24h)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatUsd(portfolio.change24h)} 24h</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Updated {formatRelativeTime(portfolio.lastUpdated)}
                </p>
              </CardContent>
            </Card>
          )}
        </StaggerItem>

        {/* sBTC Balance */}
        <StaggerItem enableHover>
          {isLoading || !sbtcBalance ? (
            <StatSkeleton />
          ) : (
            <Card className="glass-card h-full">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">sBTC Balance</p>
                <p className="text-2xl font-bold font-mono">{formatTokenAmount(sbtcBalance.balance)}</p>
                <p key={getFlashKey('sBTC')} className={`text-sm text-muted-foreground ${getFlashClass('sBTC')}`}>
                  {formatUsd(sbtcBalance.balanceUsd)}
                </p>
                <Badge className={sbtcBalance.changePercent24h >= 0 ? 'bg-success/15 text-success border-success/30 mt-2' : 'bg-destructive/15 text-destructive border-destructive/30 mt-2'}>
                  {formatChangePercent(sbtcBalance.changePercent24h)}
                </Badge>
              </CardContent>
            </Card>
          )}
        </StaggerItem>

        {/* BTC Price */}
        <StaggerItem enableHover>
          {isLoading || !btc ? (
            <StatSkeleton />
          ) : (
            <Card className="glass-card h-full">
              <CardContent className="p-6" aria-live="polite">
                <p className="text-sm text-muted-foreground mb-1">Bitcoin</p>
                <p key={getFlashKey('BTC')} className={`text-2xl font-bold font-mono ${getFlashClass('BTC')}`}>
                  {formatUsd(btc.price)}
                </p>
                <Badge className={btc.changePercent24h >= 0 ? 'bg-success/15 text-success border-success/30 mt-2' : 'bg-destructive/15 text-destructive border-destructive/30 mt-2'}>
                  {formatChangePercent(btc.changePercent24h)}
                </Badge>
              </CardContent>
            </Card>
          )}
        </StaggerItem>

        {/* STX Price */}
        <StaggerItem enableHover>
          {isLoading || !stx ? (
            <StatSkeleton />
          ) : (
            <Card className="glass-card h-full">
              <CardContent className="p-6" aria-live="polite">
                <p className="text-sm text-muted-foreground mb-1">Stacks</p>
                <p key={getFlashKey('STX')} className={`text-2xl font-bold font-mono ${getFlashClass('STX')}`}>
                  {formatUsd(stx.price)}
                </p>
                <Badge className={stx.changePercent24h >= 0 ? 'bg-success/15 text-success border-success/30 mt-2' : 'bg-destructive/15 text-destructive border-destructive/30 mt-2'}>
                  {formatChangePercent(stx.changePercent24h)}
                </Badge>
              </CardContent>
            </Card>
          )}
        </StaggerItem>
      </StaggerContainer>

      {/* Price Chart */}
      <StaggerContainer staggerDelay={0.1}>
        <StaggerItem>
          <PriceChart />
        </StaggerItem>
      </StaggerContainer>

      {/* Portfolio Performance Chart */}
      <StaggerContainer staggerDelay={0.1}>
        <StaggerItem>
          <PortfolioChart />
        </StaggerItem>
      </StaggerContainer>

      {/* Holdings Table */}
      <StaggerContainer staggerDelay={0.1}>
        <StaggerItem>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading || !portfolio ? (
                <div className="space-y-3" aria-busy="true">
                  {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : sortedHoldings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Coins className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">No sBTC yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Bridge your BTC to get started with sBTC.</p>
                  <Button asChild variant="outline" size="sm">
                    <a href="https://app.stacks.co/bridge" target="_blank" rel="noopener noreferrer">
                      Go to Bridge
                    </a>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer select-none hover:text-foreground transition-colors"
                            onClick={() => handleSort('token')}
                            role="columnheader"
                            aria-sort={sortCol === 'token' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                            aria-label="Sort by Token"
                          >
                            <span className="inline-flex items-center gap-1">
                              Token
                              <ArrowUpDown className={`h-3 w-3 ${sortCol === 'token' ? 'text-primary' : 'text-muted-foreground/50'}`} />
                            </span>
                          </TableHead>
                          <SortHeader col="balance" label="Balance" />
                          <SortHeader col="value" label="Value" />
                          <SortHeader col="change" label="24h Change" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedHoldings.map(h => (
                          <TableRow key={h.symbol}>
                            <TableCell className="font-medium">
                              <span className="inline-flex items-center gap-2">
                                <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                                  {TOKEN_ICONS[h.symbol] ?? h.symbol[0]}
                                </span>
                                {h.token} <span className="text-muted-foreground text-xs">({h.symbol})</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatTokenAmount(h.balance, h.symbol === 'STX' ? 2 : 8)}</TableCell>
                            <TableCell className="text-right font-mono">{formatUsd(h.value)}</TableCell>
                            <TableCell className="text-right">
                              <Badge className={h.changePercent24h >= 0 ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'}>
                                {formatChangePercent(h.changePercent24h)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-3">
                    {sortedHoldings.map(h => (
                      <div key={h.symbol} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                            {TOKEN_ICONS[h.symbol] ?? h.symbol[0]}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{h.token}</p>
                            <p className="text-xs text-muted-foreground font-mono">{formatTokenAmount(h.balance, h.symbol === 'STX' ? 2 : 8)} {h.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm">{formatUsd(h.value)}</p>
                          <Badge className={`text-[10px] ${h.changePercent24h >= 0 ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                            {formatChangePercent(h.changePercent24h)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Recent Transactions */}
      <StaggerContainer staggerDelay={0.06}>
        <StaggerItem>
          <Card className="glass-card">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <Link to="/dashboard/history" className="text-sm text-primary hover:underline flex items-center gap-1">
                View All <ExternalLink className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {txLoading ? (
                <div className="space-y-3" aria-busy="true">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (
                <motion.div
                  className="space-y-2"
                  variants={txContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {transactions.slice(0, 10).map(tx => {
                    const Icon = txIcon[tx.type];
                    return (
                      <motion.div
                        key={tx.id}
                        variants={txItemVariants}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${txColor[tx.type]} bg-current/10`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm capitalize">{tx.type}</span>
                            <Badge variant={tx.status === 'confirmed' ? 'secondary' : 'outline'} className="text-[10px]">
                              {tx.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {tx.type === 'send' ? `To: ${truncateAddress(tx.to)}` : `From: ${truncateAddress(tx.from)}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-mono ${tx.type === 'receive' ? 'text-success' : ''}`}>
                            {tx.type === 'receive' ? '+' : tx.type === 'send' ? '-' : ''}{formatTokenAmount(tx.amount, tx.token === 'STX' ? 2 : 8)} {tx.token}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.timestamp)}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
