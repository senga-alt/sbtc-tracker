import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/useTheme';
import { useNetwork } from '@/hooks/useNetwork';
import { useWallet } from '@/hooks/useWallet';
import { truncateAddress } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import {
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Sun,
  Moon,
  Wallet,
  LayoutDashboard,
  Clock,
  Bell,
  Settings,
  FlaskConical,
  Copy,
  ExternalLink,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';

// Bottom nav items for mobile
const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'History', url: '/dashboard/history', icon: Clock },
  { title: 'Alerts', url: '/dashboard/notifications', icon: Bell },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const { theme, setTheme } = useTheme();
  const { network } = useNetwork();
  const { wallet, connect, disconnect, isConnecting } = useWallet();
  const { demoMode } = useDemoMode();
  const location = useLocation();
  const { toast } = useToast();

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      toast({
        title: 'Address copied',
        description: 'Wallet address copied to clipboard',
      });
    }
  };

  const viewOnExplorer = () => {
    if (wallet.address) {
      const baseUrl = network === 'mainnet' 
        ? 'https://explorer.stacks.co/address' 
        : 'https://explorer.stacks.co/address';
      const networkParam = network === 'testnet' ? '?chain=testnet' : '';
      window.open(`${baseUrl}/${wallet.address}${networkParam}`, '_blank');
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Skip to content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Offline Banner */}
          <OfflineBanner />

          {/* Header */}
          <header className="sticky top-0 z-40 h-16 glass-card border-b border-border/50 flex items-center px-4 gap-3">
            <SidebarTrigger className="hidden md:inline-flex" aria-label="Toggle sidebar" />
            <Link to="/" className="flex items-center gap-2 md:hidden hover:opacity-80 transition-opacity" title="Back to Home">
              <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">₿</span>
              </div>
              <span className="font-bold">sBTC</span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  network === 'mainnet'
                    ? 'border-success/40 text-success text-xs'
                    : 'border-warning/40 text-warning text-xs'
                }
              >
                {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
              </Badge>

              {demoMode && (
                <Badge
                  variant="outline"
                  className="border-warning/40 text-warning text-xs animate-pulse-glow"
                >
                  <FlaskConical className="mr-1 h-3 w-3" />
                  Demo Mode
                </Badge>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {wallet.isConnected && wallet.address ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="font-mono text-xs gap-2 hidden sm:inline-flex">
                      <Wallet className="h-3 w-3" />
                      {truncateAddress(wallet.address)}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">Connected Wallet</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {wallet.address}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={copyAddress}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Address
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={viewOnExplorer}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on Explorer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={disconnect} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={connect}
                  disabled={isConnecting}
                  className="gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          </header>

          {/* Main content */}
          <main id="main-content" className="flex-1 p-4 md:p-6 pb-20 md:pb-6" role="main">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>

          {/* Mobile Bottom Nav */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 glass-card border-t border-border/50 flex items-center justify-around z-40" aria-label="Mobile navigation">
            {navItems.map(item => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px] ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={item.title}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </SidebarProvider>
  );
}
