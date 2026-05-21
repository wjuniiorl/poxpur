import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  MessageCircle,
  Users,
  Building2,
  CheckSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { PoxpurLogo } from '@/components/common/PoxpurLogo';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const items: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders', label: 'Pedidos', icon: ShoppingCart },
  { to: '/chat', label: 'Chat WhatsApp', icon: MessageCircle },
  { to: '/team', label: 'Equipe', icon: Users },
  { to: '/customers', label: 'Clientes', icon: Building2 },
  { to: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { to: '/reports', label: 'Relatórios', icon: BarChart3, adminOnly: true },
  { to: '/settings', label: 'Configurações', icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  const visibleItems = items.filter((i) => !i.adminOnly || isAdmin);

  const initials = (profile?.nome ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col bg-poxpur-navy text-white transition-[width] duration-200',
        sidebarCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex items-center border-b border-white/10 px-4 py-5">
        <PoxpurLogo variant={sidebarCollapsed ? 'mark' : 'full'} size="md" inverted />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  'hover:bg-poxpur-navy-dark/60',
                  isActive
                    ? 'border-l-2 border-poxpur-green bg-poxpur-navy-dark pl-[10px] font-medium'
                    : 'text-white/80',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User dropdown */}
      <div className="border-t border-white/10 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-poxpur-navy-dark/60',
                sidebarCollapsed ? 'justify-center' : 'text-left',
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-poxpur-green text-xs font-semibold text-poxpur-navy">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{profile?.nome}</div>
                  <div className="truncate text-xs capitalize text-white/60">{profile?.role}</div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right">
            <DropdownMenuItem disabled>Meu perfil (em breve)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-white/20 bg-poxpur-navy text-white hover:bg-poxpur-navy-dark"
        aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        <ChevronLeft
          className={cn('h-3 w-3 transition-transform', sidebarCollapsed && 'rotate-180')}
        />
      </Button>
    </aside>
  );
}
