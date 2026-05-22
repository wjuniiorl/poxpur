import { useState } from 'react';
import { Paperclip, Download, Trash2, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fmtDateTime } from '@/lib/format';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useReact, useDeleteMessage } from '@/hooks/useReact';
import { useQueryClient } from '@tanstack/react-query';
import { messagesKey } from '@/hooks/useMessages';
import type { PoxpurMessage, MessageSenderType } from '@/types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// ─── Reaction pills ───────────────────────────────────────────────────────────

type ReactionGroup = { emoji: string; count: number };

function groupReactions(reactions: PoxpurMessage['reactions']): ReactionGroup[] {
  const map: Record<string, number> = {};
  for (const r of reactions) {
    map[r.emoji] = (map[r.emoji] ?? 0) + 1;
  }
  return Object.entries(map).map(([emoji, count]) => ({ emoji, count }));
}

// ─── Media renderers ──────────────────────────────────────────────────────────

function MediaContent({
  message,
  isVendedor,
}: {
  message: PoxpurMessage;
  isVendedor: boolean;
}) {
  const { tipo, anexo_url, media_filename, conteudo } = message;

  if (!anexo_url) return null;

  if (tipo === 'imagem') {
    return (
      <div
        className={cn(
          '-mx-3 -mt-2 mb-1 overflow-hidden',
          isVendedor ? 'rounded-tl-2xl rounded-tr-sm' : 'rounded-tl-sm rounded-tr-2xl',
        )}
      >
        <img
          src={anexo_url}
          alt={media_filename ?? 'imagem'}
          className="block w-full max-h-80 cursor-pointer object-cover"
          onClick={() => window.open(anexo_url, '_blank')}
        />
      </div>
    );
  }

  if (tipo === 'audio') {
    return (
      <div className="mb-1 -mx-1">
        <audio
          controls
          preload="metadata"
          src={anexo_url}
          className="block h-10 w-[280px] max-w-full"
        />
      </div>
    );
  }

  if (tipo === 'documento') {
    const filename = media_filename || 'arquivo';
    return (
      <div className="mb-1 flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 max-w-xs">
        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-xs font-medium">{filename}</span>
        <a
          href={anexo_url}
          download={filename}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title="Baixar"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  if (tipo === 'localizacao') {
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(conteudo)}`;
    return (
      <div className="mb-1">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline underline-offset-2 text-blue-600 hover:text-blue-800"
        >
          Abrir no Maps
        </a>
      </div>
    );
  }

  return null;
}

// ─── Hover actions (reaction + delete) ───────────────────────────────────────

type HoverActionsProps = {
  message: PoxpurMessage;
  conversationId: string;
  customerPhone: string;
  onDelete: () => void;
};

function HoverActions({ message, conversationId, customerPhone, onDelete }: HoverActionsProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const sendReaction = useReact();
  const qc = useQueryClient();

  const handleReact = async (emoji: string) => {
    setEmojiOpen(false);
    if (!message.whatsapp_message_id) return;
    try {
      await sendReaction({
        conversationId,
        to: customerPhone,
        whatsappMessageId: message.whatsapp_message_id,
        emoji,
      });
      void qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
    } catch (err) {
      toast.error(`Erro ao reagir: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="absolute -top-7 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-lg shadow-md px-1 py-0.5">
      {/* Emoji picker */}
      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Reagir"
          >
            <Smile className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-auto p-1.5">
          <div className="flex gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => void handleReact(emoji)}
                className="text-base hover:scale-125 transition-transform rounded p-0.5"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
        title="Apagar mensagem"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

type MessageBubbleProps = {
  message: PoxpurMessage;
  previousSenderType?: MessageSenderType;
  conversationId?: string;
  customerPhone?: string;
};

export function MessageBubble({
  message,
  previousSenderType,
  conversationId = '',
  customerPhone = '',
}: MessageBubbleProps) {
  const { sender_type, conteudo, criado_em, reactions, metadata } = message;
  const isContinuation = previousSenderType === sender_type;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMessage = useDeleteMessage();
  const qc = useQueryClient();

  const isDeleted = metadata?.deleted === true;

  // ── Sistema ────────────────────────────────────────────────────────────────
  if (sender_type === 'sistema') {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-muted-foreground italic bg-muted/50 px-3 py-1 rounded-full max-w-[80%] text-center">
          {conteudo}
        </span>
      </div>
    );
  }

  const isVendedor = sender_type === 'vendedor';
  const reactionGroups = groupReactions(reactions ?? []);
  const hasMedia = !!message.anexo_url;
  const hasHoverActions = isVendedor && !!message.whatsapp_message_id;

  const handleConfirmDelete = async () => {
    if (!message.whatsapp_message_id) return;
    try {
      await deleteMessage({
        conversationId,
        to: customerPhone,
        whatsappMessageId: message.whatsapp_message_id,
      });
      void qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      toast.success('Mensagem apagada');
    } catch (err) {
      toast.error(`Erro ao apagar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex',
          isVendedor ? 'justify-end' : 'justify-start',
          isContinuation ? 'mt-0.5' : 'mt-3',
        )}
      >
        <div className={cn('relative group', isVendedor ? 'items-end' : 'items-start')}>
          {/* Hover actions (only vendedor messages with whatsapp_message_id) */}
          {hasHoverActions && !isDeleted && (
            <HoverActions
              message={message}
              conversationId={conversationId}
              customerPhone={customerPhone}
              onDelete={() => setDeleteOpen(true)}
            />
          )}

          <div
            className={cn(
              'relative max-w-[70%] px-3 py-2 text-sm shadow-sm',
              isVendedor
                ? 'bg-poxpur-green/15 text-foreground rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                : 'bg-white border border-border text-foreground rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl',
            )}
          >
            {/* Deleted state */}
            {isDeleted ? (
              <p className="italic text-muted-foreground whitespace-pre-wrap leading-relaxed">
                Mensagem apagada
              </p>
            ) : (
              <>
                {/* Media content */}
                {hasMedia && <MediaContent message={message} isVendedor={isVendedor} />}

                {/* Text content — skip if media-only with no meaningful caption */}
                {(!hasMedia ||
                  (conteudo &&
                    conteudo !== '[imagem]' &&
                    conteudo !== '[áudio]' &&
                    conteudo !== '[vídeo]' &&
                    conteudo !== '[documento]')) && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{conteudo}</p>
                )}
              </>
            )}

            <time className="block text-[10px] text-muted-foreground mt-1 text-right">
              {fmtDateTime.format(new Date(criado_em))}
            </time>
          </div>

          {/* Reaction pills */}
          {reactionGroups.length > 0 && (
            <div
              className={cn(
                'flex flex-wrap gap-1 mt-0.5',
                isVendedor ? 'justify-end' : 'justify-start',
              )}
            >
              {reactionGroups.map(({ emoji, count }) => (
                <span
                  key={emoji}
                  className="inline-flex items-center gap-0.5 bg-white/80 backdrop-blur rounded-full px-1.5 py-0.5 text-xs shadow-sm border border-border"
                >
                  {emoji}
                  {count > 1 && <span className="text-muted-foreground">{count}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              A mensagem será marcada como apagada. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
