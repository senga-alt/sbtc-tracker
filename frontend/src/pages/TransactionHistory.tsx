import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CalendarIcon,
  Search,
  Download,
  X,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { PageTransition } from '@/components/layout/PageTransition';
import { StaggerContainer } from '@/components/layout/StaggerContainer';
import { StaggerItem } from '@/components/layout/StaggerItem';
import { useTransactions } from '@/hooks/useTransactions';
import { formatUsd, truncateAddress } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';

const TX_TYPE_CONFIG = {
  send: { label: 'Send', icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/10' },
  receive: { label: 'Receive', icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/10' },
  swap: { label: 'Swap', icon: ArrowLeftRight, color: 'text-blue-400', bg: 'bg-blue-500/10' },
} as const;

const PAGE_SIZE = 20;

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

type TypeFilter = 'all' | 'send' | 'receive' | 'swap';

function exportCsv(transactions: Transaction[]) {
  const header = 'Type,Token,Amount,Value (USD),From,To,Date,Status,Tx Hash';
  const rows = transactions.map(
    (tx) =>
      `${tx.type},${tx.token},${tx.amount},${tx.value},${tx.from},${tx.to},${format(tx.timestamp, 'yyyy-MM-dd HH:mm')},${tx.status},${tx.txHash}`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TransactionHistory() {
  const { transactions, isLoading } = useTransactions();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    let result = transactions;
    if (typeFilter !== 'all') result = result.filter((tx) => tx.type === typeFilter);
    if (dateFrom) result = result.filter((tx) => tx.timestamp >= dateFrom);
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter((tx) => tx.timestamp <= endOfDay);
    }
    if (debouncedSearch) {
      result = result.filter(
        (tx) =>
          tx.from.toLowerCase().includes(debouncedSearch) ||
          tx.to.toLowerCase().includes(debouncedSearch) ||
          tx.txHash.toLowerCase().includes(debouncedSearch)
      );
    }
    return result;
  }, [transactions, typeFilter, dateFrom, dateTo, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const showFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showTo = Math.min(safePage * PAGE_SIZE, filtered.length);

  const hasFilters = typeFilter !== 'all' || !!dateFrom || !!dateTo || !!search;

  const clearFilters = useCallback(() => {
    setTypeFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch('');
    setPage(1);
  }, []);

  // Reset page when filters change
  const setTypeAndReset = (t: TypeFilter) => { setTypeFilter(t); setPage(1); };
  const setDateFromAndReset = (d: Date | undefined) => { setDateFrom(d); setPage(1); };
  const setDateToAndReset = (d: Date | undefined) => { setDateTo(d); setPage(1); };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
          <div className="h-12 w-full bg-muted/50 rounded animate-pulse" />
          <div className="h-64 w-full bg-muted/50 rounded animate-pulse" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <StaggerItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="gap-2 w-fit"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </StaggerItem>

        {/* Filter Bar */}
        <StaggerItem>
          <Card className="glass-card">
            <CardContent className="p-4 space-y-4">
              {/* Type toggles */}
              <div className="flex flex-wrap gap-2">
                {(['all', 'send', 'receive', 'swap'] as const).map((t) => {
                  const isActive = typeFilter === t;
                  const config = t !== 'all' ? TX_TYPE_CONFIG[t] : null;
                  const Icon = config?.icon;
                  return (
                    <Button
                      key={t}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTypeAndReset(t)}
                      className="gap-1.5 capitalize"
                    >
                      {Icon && <Icon className={cn('h-3.5 w-3.5', !isActive && config.color)} />}
                      {t === 'all' ? 'All' : config!.label}
                    </Button>
                  );
                })}
              </div>

              {/* Date pickers + Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Date From */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn('justify-start text-left gap-2 min-w-[150px]', !dateFrom && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFromAndReset}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {/* Date To */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn('justify-start text-left gap-2 min-w-[150px]', !dateTo && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateToAndReset}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search address or tx hash..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-8 h-9 text-sm"
                  />
                </div>

                {/* Clear */}
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Desktop Table */}
        <StaggerItem className="hidden md:block">
          <Card className="glass-card overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>From / To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tx Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((tx) => {
                    const cfg = TX_TYPE_CONFIG[tx.type];
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn('h-7 w-7 rounded-full flex items-center justify-center', cfg.bg)}>
                              <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                            </div>
                            <span className="text-sm font-medium">{cfg.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{tx.token}</TableCell>
                        <TableCell className="text-right font-mono">{tx.amount}</TableCell>
                        <TableCell className="text-right">{formatUsd(tx.value)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {tx.type === 'swap'
                            ? truncateAddress(tx.from)
                            : tx.type === 'send'
                              ? truncateAddress(tx.to)
                              : truncateAddress(tx.from)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(tx.timestamp, 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'confirmed' ? 'secondary' : 'outline'} className="text-xs">
                            {tx.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                        <a
                            href={`https://explorer.hiro.so/txid/${tx.txHash}?chain=mainnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-mono"
                          >
                            {tx.txHash.slice(0, 10)}…
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </StaggerItem>

        {/* Mobile Cards */}
        <StaggerItem className="md:hidden space-y-3">
          {filtered.length === 0 ? (
            <Card className="glass-card"><EmptyState /></Card>
          ) : (
            paginated.map((tx) => {
              const cfg = TX_TYPE_CONFIG[tx.type];
              const Icon = cfg.icon;
              return (
                <Card key={tx.id} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center', cfg.bg)}>
                          <Icon className={cn('h-4 w-4', cfg.color)} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{cfg.label}</p>
                          <p className="text-xs text-muted-foreground">{tx.token}</p>
                        </div>
                      </div>
                      <Badge variant={tx.status === 'confirmed' ? 'secondary' : 'outline'} className="text-xs">
                        {tx.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{tx.amount} {tx.token}</span>
                      <span className="text-sm text-muted-foreground">{formatUsd(tx.value)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{format(tx.timestamp, 'MMM d, HH:mm')}</span>
                      <a
                        href={`https://explorer.hiro.so/txid/${tx.txHash}?chain=mainnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1 font-mono"
                      >
                        {tx.txHash.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </StaggerItem>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <StaggerItem className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {showFrom}–{showTo} of {filtered.length} transactions
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={cn(safePage <= 1 && 'pointer-events-none opacity-50', 'cursor-pointer')}
                  />
                </PaginationItem>
                {getPageNumbers(safePage, totalPages).map((entry, i) =>
                  entry === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={entry}>
                      <PaginationLink
                        isActive={entry === safePage}
                        onClick={() => setPage(entry)}
                        className="cursor-pointer"
                      >
                        {entry}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={cn(safePage >= totalPages && 'pointer-events-none opacity-50', 'cursor-pointer')}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </StaggerItem>
        )}
      </StaggerContainer>
    </PageTransition>
  );
}

function EmptyState() {
  return (
    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-2">No transactions found</h2>
      <p className="text-muted-foreground max-w-md">
        Try adjusting your filters or search query.
      </p>
    </CardContent>
  );
}
