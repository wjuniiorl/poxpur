import { useState } from 'react';
import {
  Search,
  MessageSquare,
  Plus,
  Inbox,
  BellDot,
  UserCheck,
  UserX,
  Archive,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NewConversationDialog } from './NewConversationDialog';
import { cn } from '@/lib/utils';
import { fmtRelativeBR } from '@/lib/format';
import { useConversations } from '@/hooks/useConversations';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { ConversationWithRelations } from '@/types/database';

// ─── Filter Tab Types ─────────────────────────────────────────────────────────

type FilterTab = 'all' | 'nao_lidas' | 'me' | 'unassigned' | 'arquivadas';

type TabDef = {
  key: FilterTab;
  label: string;
  icon: typeof Inbox;
  adminOnly?: boolean;
};

const TABS: TabDef[] = [
  { key: 'all', label: 'Todas', icon: Inbox },
  { key: 'nao_lidas', label: 'Não lidas', icon: BellDot },
  { key: 'me', label: 'Minhas', icon: UserCheck },
  { key: 'unassigned', label: 'Sem atribuição', icon: UserX, adminOnly: true },
  { key: 'arquivadas', label: 'Arquivadas', icon: Archive },
];

// ─── Avatar Initials Helper ───────────────────────────────────────────────────

function getInitials(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback.slice(0, 2).toUpperCase();
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Conversation Item ────────────────────────────────────────────────────────

type ConvItemProps = {
  conv: ConversationWithRelations;
  isActive: boolean;
  onClick: () => void;
};

function ConvItem({ conv, isActive, onClick }: ConvItemProps) {
  const displayName =
    conv.customer?.nome ?? conv.customer_nome_snapshot ?? conv.customer_phone ?? 'Desconhecido';
  const initials = getInitials(displayName, conv.customer_phone ?? '??');

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-accent transition-colors border-b border-border/50',
        isActive && 'bg-secondary border-l-2 border-l-poxpur-green',
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-poxpur-navy text-white text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="font-medium text-sm truncate">{displayName}</span>
          {conv.ultima_mensagem_em && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {fmtRelativeBR(conv.ultima_mensagem_em)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs text-muted-foreground truncate flex-1">
            {conv.ultima_mensagem_preview ?? 'Sem mensagens'}
          </span>
          {conv.nao_lidas > 0 && (
            <span className="ml-1 shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-poxpur-green text-white text-[10px] font-bold px-1">
              {conv.nao_lidas > 99 ? '99+' : conv.nao_lidas}
            </span>
          )}
        </div>
        {conv.assignee && (
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {conv.assignee.nome}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ConversationListProps = {
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const isAdmin = useIsAdmin();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const filters = {
    status: activeTab === 'arquivadas' ? ('arquivada' as const) : activeTab === 'all' ? ('all' as const) : ('aberta' as const),
    assignedTo:
      activeTab === 'me'
        ? ('me' as const)
        : activeTab === 'unassigned'
          ? ('unassigned' as const)
          : ('all' as const),
    naoLidas: activeTab === 'nao_lidas',
    search: search || undefined,
  };

  const { data: conversations, isLoading } = useConversations(filters);

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">Conversas</h2>
            {conversations && (
              <Badge variant="secondary" className="text-xs">
                {conversations.length}
              </Badge>
            )}
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => setNewDialogOpen(true)}
                  className="h-7 w-7 bg-poxpur-green hover:bg-poxpur-green-dark text-white shrink-0"
                  aria-label="Nova conversa"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Nova conversa</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Filter Tabs — ícones em linha única, label do ativo aparece à direita */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-0.5">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Tooltip key={tab.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      aria-label={tab.label}
                      className={cn(
                        'h-7 w-7 grid place-items-center rounded-md transition-colors',
                        isActive
                          ? 'bg-poxpur-green text-white'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{tab.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <span className="text-[11px] font-medium text-poxpur-navy truncate">
            {visibleTabs.find((t) => t.key === activeTab)?.label}
          </span>
        </TooltipProvider>
      </div>

      <NewConversationDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onCreated={onSelect}
      />

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border-b border-border/50">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
            <MessageSquare className="h-8 w-8 opacity-30" />
            <p className="text-xs text-center">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              isActive={selectedId === conv.id}
              onClick={() => onSelect(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
