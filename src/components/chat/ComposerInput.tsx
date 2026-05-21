import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ComposerInputProps = {
  conversationId: string;
  customerPhone: string | null;
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
};

export function ComposerInput({ onSend, disabled }: ComposerInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const canSend = text.trim().length > 0 && !isSending && !disabled;

  return (
    <div className="flex items-end gap-2 p-3">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSending}
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
