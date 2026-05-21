import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Loader2, Paperclip, Image, Music, Video, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { uploadMedia } from '@/lib/uploadMedia';
import { useSendMedia } from '@/hooks/useReact';
import { useQueryClient } from '@tanstack/react-query';
import { messagesKey } from '@/hooks/useMessages';

type ComposerInputProps = {
  conversationId: string;
  customerPhone: string | null;
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
};

type MediaType = 'image' | 'audio' | 'video' | 'document';

const MEDIA_OPTIONS: { type: MediaType; label: string; accept: string; Icon: React.FC<{ className?: string }> }[] = [
  { type: 'image', label: 'Imagem', accept: 'image/*', Icon: Image },
  { type: 'audio', label: 'Áudio', accept: 'audio/*', Icon: Music },
  { type: 'video', label: 'Vídeo', accept: 'video/*', Icon: Video },
  { type: 'document', label: 'Documento', accept: '*/*', Icon: FileText },
];

export function ComposerInput({ conversationId, customerPhone, onSend, disabled }: ComposerInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRefs = useRef<Record<MediaType, HTMLInputElement | null>>({
    image: null,
    audio: null,
    video: null,
    document: null,
  });

  const sendMedia = useSendMedia();
  const qc = useQueryClient();

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const maxHeight = 8 * 24; // ~8 rows
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, [text]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;
    setIsSending(true);
    try {
      await onSend(trimmed);
      setText('');
      textareaRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleMediaClick = (type: MediaType) => {
    setPopoverOpen(false);
    fileInputRefs.current[type]?.click();
  };

  const handleFileChange = async (type: MediaType, file: File) => {
    setIsSendingMedia(true);
    try {
      const { url, mime } = await uploadMedia(file, 'chat');
      const to = customerPhone ?? '';

      if (type === 'image') {
        await sendMedia.sendImage({ conversationId, to, mediaUrl: url, mimetype: mime });
      } else if (type === 'audio') {
        await sendMedia.sendAudio({ conversationId, to, mediaUrl: url, mimetype: mime });
      } else if (type === 'video') {
        await sendMedia.sendVideo({ conversationId, to, mediaUrl: url, mimetype: mime });
      } else {
        await sendMedia.sendDocument({
          conversationId,
          to,
          mediaUrl: url,
          filename: file.name,
          mimetype: mime,
        });
      }

      void qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Mídia enviada');
    } catch (err) {
      toast.error(`Erro ao enviar mídia: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSendingMedia(false);
    }
  };

  const canSend = text.trim().length > 0 && !isSending && !disabled;
  const isBusy = isSending || isSendingMedia || disabled;

  return (
    <div className="flex items-end gap-2 p-3">
      {/* Hidden file inputs for each media type */}
      {MEDIA_OPTIONS.map(({ type, accept }) => (
        <input
          key={type}
          type="file"
          accept={accept}
          className="hidden"
          ref={(el) => { fileInputRefs.current[type] = el; }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileChange(type, file);
            e.target.value = '';
          }}
        />
      ))}

      {/* Media attach popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isBusy}
            className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
            title="Enviar mídia"
          >
            {isSendingMedia ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-44 p-1">
          {MEDIA_OPTIONS.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleMediaClick(type)}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isBusy}
        placeholder="Digite uma mensagem... (Enter para enviar, Shift+Enter para nova linha)"
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2',
          'text-sm leading-6 placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'max-h-48 overflow-y-auto',
        )}
      />
      <Button
        size="icon"
        onClick={() => void handleSend()}
        disabled={!canSend}
        className="h-9 w-9 shrink-0 rounded-xl bg-poxpur-green hover:bg-poxpur-green-dark text-white"
      >
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
