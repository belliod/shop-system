import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Store,
  Users,
  DollarSign,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { label: '统计看板', path: '/dashboard', icon: LayoutDashboard },
  { label: '店铺管理', path: '/stores', icon: Store },
  { label: '收入录入', path: '/revenue', icon: DollarSign },
  { label: '用户管理', path: '/users', icon: Users, adminOnly: true },
  { label: '系统设置', path: '/settings', icon: SettingsIcon, adminOnly: true },
];

const PAGE_TITLE_MAP: Record<string, string> = {
  '/dashboard': '统计看板',
  '/stores': '店铺管理',
  '/revenue': '收入录入',
  '/users': '用户管理',
  '/settings': '系统设置',
};

const SIDEBAR_EXPANDED_WIDTH = 'w-60';
const SIDEBAR_COLLAPSED_WIDTH = 'w-16';
const APP_VERSION = 'v1.0.0';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleItems = MENU_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  const pageTitle =
    PAGE_TITLE_MAP[location.pathname] ?? '管理后台';

  const userInitial = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user?.username?.charAt(0).toUpperCase() ?? 'U';

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
          collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'h-16 flex items-center border-b border-sidebar-border px-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <BarChart3 className="size-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">
                营收管家
              </span>
            </div>
          )}
          {collapsed && (
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="size-5 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover-elevate',
                    collapsed ? 'justify-center' : '',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            'border-t border-sidebar-border py-3 px-4 text-xs text-sidebar-foreground/50',
            collapsed ? 'text-center' : ''
          )}
        >
          {collapsed ? APP_VERSION : `营收管家 ${APP_VERSION}`}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            >
              {collapsed ? (
                <ChevronRight className="size-5" />
              ) : (
                <ChevronLeft className="size-5" />
              )}
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2 pl-1 pr-3 h-9"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {user?.displayName || user?.username || '用户'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {user?.displayName || user?.username}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {user?.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="size-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
