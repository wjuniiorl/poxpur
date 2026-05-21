import { useLocation } from 'react-router-dom';
import { Bell, Moon, Sun, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Pedidos',
  '/chat': 'Chat WhatsApp',
  '/team': 'Equipe',
  '/customers': 'Clientes',
  '/tasks': 'Tarefas',
  '/reports': 'Relatórios',
  '/settings': 'Configurações',
};

export function Header() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useUiStore();
  const location = useLocation();
  const pageTitle = routeLabels[location.pathname] ?? 'Sales Hub';

  const initials = (profile?.nome ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">Sales Hub</div>
        <h1 className="truncate text-base font-semibold leading-tight text-foreground">
          {pageTitle}
        </h1>
      </div>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge
                variant="secondary"
                className="absolute -right-1 -top-1 h-4 min-w-4 bg-muted px-1 text-[10px] text-muted-foreground"
              >
                0
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notificações (em breve)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-poxpur-green text-xs font-semibold text-poxpur-navy">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left md:block">
              <div className="text-sm font-medium leading-tight">{profile?.nome}</div>
              <div className="text-[11px] capitalize leading-tight text-muted-foreground">
                {profile?.role}
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{profile?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserCircle className="mr-2 h-4 w-4" />
            Meu perfil (em breve)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signOut()} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
