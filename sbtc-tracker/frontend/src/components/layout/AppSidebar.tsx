import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Clock, Bell, Settings, Home } from 'lucide-react';
import { getUnreadCount } from '@/lib/notificationHistory';

const items = [
  { title: 'Portfolio', url: '/dashboard', icon: LayoutDashboard },
  { title: 'History', url: '/dashboard/history', icon: Clock },
  { title: 'Notifications', url: '/dashboard/notifications', icon: Bell },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [unread, setUnread] = useState(getUnreadCount);

  useEffect(() => {
    const sync = () => setUnread(getUnreadCount());
    window.addEventListener('notification-change', sync);
    return () => window.removeEventListener('notification-change', sync);
  }, []);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <Link 
        to="/" 
        className="h-16 flex items-center px-4 gap-2 border-b border-border/50 hover:bg-muted/50 transition-colors"
        title="Back to Home"
      >
        <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary-foreground">₿</span>
        </div>
        {!collapsed && <span className="font-bold text-lg">sBTC Tracker</span>}
      </Link>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.title === 'Notifications' && unread > 0 && !collapsed && (
                        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
