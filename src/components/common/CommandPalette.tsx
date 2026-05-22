import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  MessageCircle,
  Users,
  Building2,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  Moon,
  Plus,
  Search,
} from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useUiStore } from '@/stores/uiStore';
import { useCommandPalette } from '@/stores/commandPaletteStore';

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const { toggleTheme } = useUiStore();

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  const run = useCallback(
    (fn: () => void) => {
      setOpen(false);
      // Small delay so dialog closes before navigation
      requestAnimationFrame(fn);
    },
    [setOpen],
  );

  const go = (path: string) => run(() => navigate(path));

  const goNew = (path: string) =>
    run(() => navigate(`${path}?new=1`));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      {/* Accessible title for screen readers */}
      <div className="sr-only" aria-live="polite">
        Paleta de comandos
      </div>

      <Command className="rounded-xl border shadow-2xl">
        <CommandInput placeholder="Buscar comando, página..." />
        <CommandList className="max-h-[420px]">
          <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
            Nenhum comando encontrado.
          </CommandEmpty>

          {/* ── Navegar ── */}
          <CommandGroup heading="Navegar">
            <CommandItem onSelect={() => go('/dashboard')}>
              <LayoutDashboard className="h-4 w-4 text-poxpur-green" />
              Ir para Dashboard
            </CommandItem>
            <CommandItem onSelect={() => go('/orders')}>
              <ShoppingCart className="h-4 w-4 text-poxpur-green" />
              Ir para Pedidos
            </CommandItem>
            <CommandItem onSelect={() => go('/chat')}>
              <MessageCircle className="h-4 w-4 text-poxpur-green" />
              Ir para Chat WhatsApp
            </CommandItem>
            <CommandItem onSelect={() => go('/team')}>
              <Users className="h-4 w-4 text-poxpur-green" />
              Ir para Equipe
            </CommandItem>
            <CommandItem onSelect={() => go('/customers')}>
              <Building2 className="h-4 w-4 text-poxpur-green" />
              Ir para Clientes
            </CommandItem>
            <CommandItem onSelect={() => go('/tasks')}>
              <CheckSquare className="h-4 w-4 text-poxpur-green" />
              Ir para Tarefas
            </CommandItem>
            {isAdmin && (
              <>
                <CommandItem onSelect={() => go('/reports')}>
                  <BarChart3 className="h-4 w-4 text-poxpur-green" />
                  Ir para Relatórios
                </CommandItem>
                <CommandItem onSelect={() => go('/settings')}>
                  <Settings className="h-4 w-4 text-poxpur-green" />
                  Ir para Configurações
                </CommandItem>
              </>
            )}
          </CommandGroup>

          <CommandSeparator />

          {/* ── Criar ── */}
          <CommandGroup heading="Criar">
            <CommandItem onSelect={() => goNew('/chat')}>
              <Plus className="h-4 w-4 text-amber-500" />
              Nova conversa WhatsApp
            </CommandItem>
            <CommandItem onSelect={() => goNew('/orders')}>
              <Plus className="h-4 w-4 text-amber-500" />
              Novo pedido
            </CommandItem>
            <CommandItem onSelect={() => goNew('/customers')}>
              <Plus className="h-4 w-4 text-amber-500" />
              Novo cliente
            </CommandItem>
            <CommandItem onSelect={() => goNew('/tasks')}>
              <Plus className="h-4 w-4 text-amber-500" />
              Nova tarefa
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* ── Ações ── */}
          <CommandGroup heading="Ações">
            <CommandItem onSelect={() => run(toggleTheme)}>
              <Moon className="h-4 w-4 text-muted-foreground" />
              Alternar tema (claro / escuro)
            </CommandItem>
            <CommandItem
              onSelect={() => run(() => void signOut())}
              className="text-destructive data-[selected=true]:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </CommandItem>
          </CommandGroup>
        </CommandList>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Search className="h-3 w-3" />
            Busca rápida
          </span>
          <span className="flex gap-2">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
            <span>navegar</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
            <span>executar</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
            <span>fechar</span>
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
