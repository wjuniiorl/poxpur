import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSendInternalMessage } from '@/hooks/useTeamChat';
import { supabase } from '@/lib/supabase';
import type { PoxpurProfile } from '@/types/database';

// ─── Props ────────────────────────────────────────────────────────────────────

type InternalComposerProps = {
  channelId: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function InternalComposer({ channelId }: InternalComposerProps) {
  const [text, setText] = useState('');
  const [profiles, setProfiles] = useState<Pick<PoxpurProfile, 'id' | 'nome'>[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useSendInternalMessage();

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('ativo', true);
      if (!active) return;
      if (error) {
        console.error('Failed to load profiles for mentions:', error);
        return;
      }
      if (data) setProfiles(data as Pick<PoxpurProfile, 'id' | 'nome'>[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const maxHeight = 8 * 24;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, [text]);

  // Parse mentions: match @word against profile names (case-insensitive)
  const parseMencoes = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const found: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const term = (match[1] ?? '').toLowerCase();
      for (const p of profiles) {
        const namePart = (p.nome.split(' ')[0] ?? '').toLowerCase();
        if (namePart === term || p.nome.toLowerCase().replace(/\s+/g, '') === term) {
          found.push(p.id);
        }
      }
    }
    return [...new Set(found)];
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;

    const mencoes = parseMencoes(trimmed);
    await sendMessage.mutateAsync({ channelId, conteudo: trimmed, mencoes });
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const canSend = text.trim().length > 0 && !sendMessage.isPending;

  return (
    <div className="flex items-end gap-2 p-3 border-t bg-background">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={sendMessage.isPending}
        placeholder="Mensagem... (Enter para enviar, Shift+Enter para nova linha)"
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
        {sendMessage.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
