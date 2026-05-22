import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Loader2, Paperclip, Image, Music, Video, FileText, X } from 'lucide-react';
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

type StagedMedia = {
  type: MediaType;
  url: string;
  mime: string;
  filename: string;
  previewUrl: string;
};

const MEDIA_OPTIONS: {
  type: MediaType;
  label: string;
  accept: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  { type: 'image', label: 'Imagem', accept: 'image/*', Icon: Image },
  { type: 'audio', label: 'Áudio', accept: 'audio/*', Icon: Music },
  { type: 'video', label: 'Vídeo', accept: 'video/*', Icon: Video },
  { type: 'document', label: 'Documento', accept: '*/*', Icon: FileText },
];

const MEDIA_LABEL: Record<MediaType, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
};

export function ComposerInput({
  conversationId,
  customerPhone,
  onSend,
  disabled,
}: ComposerInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [staged, setStaged] = useState<StagedMedia | null>(null);
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
    const maxHeight = 8 * 24;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, [text]);

  // Revoke ObjectURL preview when staged changes/unmounts
  useEffect(() => {
    const previewUrl = staged?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [staged?.previewUrl]);

  const clearStaged = () => setStaged(null);

  const sendStagedMedia = async (caption: string) => {
    if (!staged) return;
    const to = customerPhone ?? '';
    const { type, url, mime, filename } = staged;

    if (type === 'image') {
      await sendMedia.sendImage({ conversationId, to, mediaUrl: url, caption, mimetype: mime });
    } else if (type === 'audio') {
      await sendMedia.sendAudio({ conversationId, to, mediaUrl: url, mimetype: mime });
    } else if (type === 'video') {
      await sendMedia.sendVideo({ conversationId, to, mediaUrl: url, caption, mimetype: mime });
    } else {
      await sendMedia.sendDocument({
        conversationId,
        to,
        mediaUrl: url,
        filename,
        caption,
        mimetype: mime,
      });
    }
  };

  const handleSend = async () => {
    if (isSending || isUploading || disabled) return;
    const trimmed = text.trim();

    if (staged) {
      setIsSending(true);
      try {
        await sendStagedMedia(trimmed);
        void qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
        void qc.invalidateQueries({ queryKey: ['conversations'] });
        toast.success('Mídia enviada');
        setText('');
        clearStaged();
        textareaRef.current?.focus();
      } catch (err) {
        toast.error(`Erro ao enviar mídia: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (!trimmed) return;
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
    if (staged?.previewUrl) URL.revokeObjectURL(staged.previewUrl);
    setIsUploading(true);
    try {
      const { url, mime } = await uploadMedia(file, 'chat');
      setStaged({
        type,
        url,
        mime,
        filename: file.name,
        previewUrl: URL.createObjectURL(file),
      });
      textareaRef.current?.focus();
    } catch (err) {
      toast.error(`Erro ao enviar mídia: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const canSend = (text.trim().length > 0 || !!staged) && !isSending && !isUploading && !disabled;
  const isBusy = isSending || isUploading || disabled;
  const placeholder = staged
    ? 'Adicione uma legenda (opcional)...'
    : 'Digite uma mensagem... (Enter para enviar, Shift+Enter para nova linha)';

  return (
    <div className="flex flex-col gap-2 p-3">
      {MEDIA_OPTIONS.map(({ type, accept }) => (
        <input
          key={type}
          type="file"
          accept={accept}
          className="hidden"
          ref={(el) => {
            fileInputRefs.current[type] = el;
          }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileChange(type, file);
            e.target.value = '';
          }}
        />
      ))}

      {staged && <StagedPreview staged={staged} onRemove={clearStaged} disabled={isSending} />}

      <div className="flex items-end gap-2">
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
              {isUploading ? (
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
          placeholder={placeholder}
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
    </div>
  );
}

function StagedPreview({
  staged,
  onRemove,
  disabled,
}: {
  staged: StagedMedia;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-input bg-muted/40 p-2 pr-9">
      {staged.type === 'image' ? (
        <img
          src={staged.previewUrl}
          alt={staged.filename}
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : staged.type === 'video' ? (
        <video
          src={staged.previewUrl}
          className="h-16 w-16 shrink-0 rounded-lg object-cover bg-black"
          muted
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
          {staged.type === 'audio' ? (
            <Music className="h-6 w-6 text-muted-foreground" />
          ) : (
            <FileText className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{staged.filename}</span>
        <span className="text-xs text-muted-foreground">{MEDIA_LABEL[staged.type]}</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        title="Remover anexo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
