import { cn } from '@/lib/utils';
import { fmtRelativeBR } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import type { InternalMessageWithSender } from '@/hooks/useTeamChat';

// ─── Mention highlight ────────────────────────────────────────────────────────

function highlightMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="bg-poxpur-green/15 text-poxpur-green-dark rounded px-1 font-medium"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function SenderAvatar({ nome, fotoUrl }: { nome: string; fotoUrl: string | null }) {
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nome}
        className="h-8 w-8 rounded-full object-cover shrink-0"
      />
    );
  }
  const initials = nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-poxpur-green/20 text-poxpur-green-dark flex items-center justify-center text-xs font-semibold shrink-0">
      {initials}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type InternalMessageBubbleProps = {
  message: InternalMessageWithSender;
  isGroupStart: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function InternalMessageBubble({ message, isGroupStart }: InternalMessageBubbleProps) {
  const { session } = useAuth();
  const currentUserId = session?.user.id;
  const isMentioned = message.mencoes.includes(currentUserId ?? '');
  const senderName = message.sender?.nome ?? 'Usuário';
  const fotoUrl = message.sender?.foto_url ?? null;

  return (
    <div className={cn('flex gap-2 group', isGroupStart ? 'mt-4' : 'mt-0.5')}>
      {/* Avatar — only visible for first message in group */}
      <div className="w-8 shrink-0">
        {isGroupStart ? (
          <SenderAvatar nome={senderName} fotoUrl={fotoUrl} />
        ) : (
          <div className="h-8 w-8" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isGroupStart && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold">{senderName}</span>
            <time className="text-[11px] text-muted-foreground">
              {fmtRelativeBR(message.criado_em)}
            </time>
            {isMentioned && (
              <span className="text-[10px] bg-poxpur-green/15 text-poxpur-green-dark rounded px-1.5 py-0.5 font-medium">
                Você foi mencionado
              </span>
            )}
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {highlightMentions(message.conteudo)}
        </p>
      </div>
    </div>
  );
}
