import { useLayoutEffect, useRef, useState } from 'react';
import {
  MoreVertical,
  ShoppingCart,
  Archive,
  ArchiveRestore,
  Users,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fmtDate } from '@/lib/format';
import { useMessages, useSendMessage, useSimulateIncoming } from '@/hooks/useMessages';
import { useConversation, useArchiveConversation, useUnarchiveConversation } from '@/hooks/useConversations';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { MessageBubble } from './MessageBubble';
import { ComposerInput } from './ComposerInput';
import { AssignDropdown } from './AssignDropdown';
import { NewOrderFromChatModal } from './NewOrderFromChatModal';
import type { PoxpurMessage } from '@/types/database';

// ─── Date separator ───────────────────────────────────────────────────────────

function dateSeparatorLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(d, today)) return 'Hoje';
  if (isSameDay(d, yesterday)) return 'Ontem';
  return fmtDate.format(d);
}

function getInitials(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback.slice(0, 2).toUpperCase();
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Simulate Dialog ──────────────────────────────────────────────────────────

function SimulateDialog({
  conversationId,
  open,
  onClose,
}: {
  conversationId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const simulate = useSimulateIncoming();

  const handleSend = async () => {
    if (!text.trim()) return;
    await simulate.mutateAsync({ conversationId, text: text.trim() });
    setText('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Simular mensagem do cliente</DialogTitle>
          <DialogDescription className="sr-only">
            Simule o recebimento de uma mensagem do cliente para fins de demonstração.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Para demo enquanto integração WhatsApp real não está conectada
          </Label>
          <Input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
            placeholder="Mensagem do cliente..."
            className="h-9 text-sm"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSend()}
            disabled={!text.trim() || simulate.isPending}
            className="bg-poxpur-green hover:bg-poxpur-green-dark text-white"
          >
            {simulate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Message list with date separators ───────────────────────────────────────

function MessageList({
  messages,
  conversationId,
  customerPhone,
}: {
  messages: PoxpurMessage[];
  conversationId: string;
  customerPhone: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  // Marca a conversa cujo scroll-pro-fim já foi disparado (instantâneo).
  // null = ainda não scrollou nada (estado inicial).
  const scrolledForConversationRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef(0);

  useLayoutEffect(() => {
    if (!bottomRef.current || messages.length === 0) return;

    const isFirstTimeForConversation =
      scrolledForConversationRef.current !== conversationId;

    if (isFirstTimeForConversation) {
      // Abriu conversa nova (ou recarregou) — desce direto sem animação
      bottomRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      scrolledForConversationRef.current = conversationId;
      // Repete no próximo frame pra capturar altura de imagens que
      // ainda estavam carregando.
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      });
    } else if (messages.length > lastMessageCountRef.current) {
      // Nova mensagem chegou enquanto user já estava na conversa — anima
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    lastMessageCountRef.current = messages.length;
  }, [conversationId, messages.length]);

  const elements: React.ReactNode[] = [];
  let lastDateLabel = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    const dateLabel = dateSeparatorLabel(msg.criado_em);

    if (dateLabel !== lastDateLabel) {
      lastDateLabel = dateLabel;
      elements.push(
        <div key={`sep-${msg.id}`} className="flex justify-center my-3">
          <span className="text-[10px] text-muted-foreground bg-muted/70 px-3 py-0.5 rounded-full">
            {dateLabel}
          </span>
        </div>,
      );
    }

    const prev = i > 0 ? messages[i - 1] : undefined;
    elements.push(
      <MessageBubble
        key={msg.id}
        message={msg}
        previousSenderType={prev?.sender_type}
        conversationId={conversationId}
        customerPhone={customerPhone}
      />,
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {elements}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── ChatThread ───────────────────────────────────────────────────────────────

type ChatThreadProps = {
  conversationId: string;
};

export function ChatThread({ conversationId }: ChatThreadProps) {
  const isAdmin = useIsAdmin();
  const { data: conversation, isLoading: convLoading } = useConversation(conversationId);
  const { data: messages, isLoading: msgsLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const archive = useArchiveConversation();
  const unarchive = useUnarchiveConversation();

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);

  const displayName =
    conversation?.customer?.nome ??
    conversation?.customer_nome_snapshot ??
    conversation?.customer_phone ??
    'Conversa';

  const phone =
    conversation?.customer?.telefone ??
    conversation?.customer_phone ??
    null;

  const initials = getInitials(displayName, phone ?? '??');

  const handleSend = async (text: string) => {
    await sendMessage.mutateAsync({
      conversationId,
      to: phone ?? '',
      text,
    });
  };

  const isArchived = conversation?.status === 'arquivada';

  if (convLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-14 border-b border-border p-3 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Conversa não encontrada</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="h-14 border-b border-border px-3 flex items-center gap-3 shrink-0 bg-background">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-poxpur-navy text-white text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate leading-tight">{displayName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
            {phone && <span className="text-muted-foreground/60">· {phone}</span>}
          </p>
        </div>

        {/* Criar Pedido button */}
        <Button
          size="sm"
          onClick={() => setOrderModalOpen(true)}
          className="bg-poxpur-green hover:bg-poxpur-green-dark text-white gap-1.5 h-8 text-xs shrink-0"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Criar Pedido
        </Button>

        {/* 3-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isAdmin && (
              <>
                <AssignDropdown
                  conversationId={conversationId}
                  currentAssigneeId={conversation.assigned_to}
                >
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer"
                  >
                    <Users className="mr-2 h-3.5 w-3.5" />
                    Atribuir vendedor
                  </DropdownMenuItem>
                </AssignDropdown>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() =>
                isArchived
                  ? unarchive.mutate({ id: conversationId })
                  : archive.mutate({ id: conversationId })
              }
            >
              {isArchived ? (
                <>
                  <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                  Desarquivar
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-3.5 w-3.5" />
                  Arquivar
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      {msgsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !messages || messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <MessageSquare className="h-8 w-8 opacity-30" />
          <p className="text-xs">Nenhuma mensagem ainda. Diga olá!</p>
        </div>
      ) : (
        <MessageList messages={messages} conversationId={conversationId} customerPhone={phone ?? ''} />
      )}

      {/* ── Composer ───────────────────────────────────────────────────── */}
      <div className="border-t border-border shrink-0 bg-background">
        <ComposerInput
          conversationId={conversationId}
          customerPhone={phone}
          onSend={handleSend}
          disabled={sendMessage.isPending}
        />

        {/* Dev/demo helpers */}
        <div className="flex items-center justify-end gap-2 px-3 pb-2">
          <button
            type="button"
            onClick={() => setSimulateOpen(true)}
            className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
            title="Para demo enquanto integração WhatsApp real não está conectada"
          >
            Simular resposta do cliente
          </button>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {orderModalOpen && (
        <NewOrderFromChatModal
          open={orderModalOpen}
          onOpenChange={setOrderModalOpen}
          conversation={conversation}
        />
      )}
      <SimulateDialog
        conversationId={conversationId}
        open={simulateOpen}
        onClose={() => setSimulateOpen(false)}
      />
    </div>
  );
}
