import { cn } from '@/lib/utils';
import { fmtDateTime } from '@/lib/format';
import type { PoxpurMessage, MessageSenderType } from '@/types/database';

type MessageBubbleProps = {
  message: PoxpurMessage;
  previousSenderType?: MessageSenderType;
};

export function MessageBubble({ message, previousSenderType }: MessageBubbleProps) {
  const { sender_type, conteudo, criado_em } = message;
  const isContinuation = previousSenderType === sender_type;

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

  return (
    <div
      className={cn(
        'flex',
        isVendedor ? 'justify-end' : 'justify-start',
        isContinuation ? 'mt-0.5' : 'mt-3',
      )}
    >
      <div
        className={cn(
          'relative max-w-[70%] px-3 py-2 text-sm shadow-sm',
          isVendedor
            ? 'bg-poxpur-green/15 text-foreground rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
            : 'bg-white border border-border text-foreground rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl',
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{conteudo}</p>
        <time className="block text-[10px] text-muted-foreground mt-1 text-right">
          {fmtDateTime.format(new Date(criado_em))}
        </time>
      </div>
    </div>
  );
}
