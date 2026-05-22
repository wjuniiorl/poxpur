/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { PoxpurProfile } from '@/types/database';
import { toast } from 'sonner';

export type AuthStatus = 'loading' | 'unauthenticated' | 'no_profile' | 'authenticated';

export type AuthContextValue = {
  session: Session | null;
  profile: PoxpurProfile | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

// Detecta token salvo com formato incompatível com as keys atuais do Supabase
// (ex: JWT legacy quando o projeto já migrou pra sb_secret_*/sb_publishable_*).
// Sessão stale faz auth.getSession() travar tentando refresh contra o token novo.
function purgeStaleAuthStorage(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) keys.push(k);
    }
    let purged = false;
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        localStorage.removeItem(k);
        purged = true;
        continue;
      }
      const token = (parsed as { access_token?: unknown })?.access_token;
      if (typeof token !== 'string' || token.length < 20) {
        localStorage.removeItem(k);
        purged = true;
      }
    }
    return purged;
  } catch {
    return false;
  }
}

async function loadProfile(userId: string): Promise<PoxpurProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[AuthContext] erro carregando profile:', error);
    return null;
  }
  return data;
}

async function logAudit(
  userId: string,
  userEmail: string | undefined,
  acao: string,
  recurso?: string,
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    user_email: userEmail ?? null,
    acao,
    recurso: recurso ?? null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PoxpurProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
      return Promise.race([
        p,
        new Promise<T>((_, rej) =>
          setTimeout(() => rej(new Error(`bootstrap timeout: ${label}`)), ms),
        ),
      ]);
    }

    async function bootstrap() {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 5000, 'getSession');
        if (!active) return;

        if (!data.session) {
          setSession(null);
          setProfile(null);
          setStatus('unauthenticated');
          return;
        }

        setSession(data.session);
        const p = await withTimeout(loadProfile(data.session.user.id), 5000, 'loadProfile');
        if (!active) return;

        if (!p || !p.ativo) {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setStatus('no_profile');
          toast.error('Esta conta não tem acesso ao Sales Hub. Procure o administrador.');
        } else {
          setProfile(p);
          setStatus('authenticated');
        }
      } catch (err) {
        console.warn('[AuthContext] bootstrap falhou, limpando sessao:', err);
        if (!active) return;
        // Limpa qualquer token sb-*-auth-token do localStorage (mais agressivo
        // que signOut, que tambem chama API e pode travar de novo).
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const toRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('sb-')) toRemove.push(k);
            }
            for (const k of toRemove) localStorage.removeItem(k);
          }
        } catch {
          /* ignore */
        }
        setSession(null);
        setProfile(null);
        setStatus('unauthenticated');
      }
    }

    purgeStaleAuthStorage();
    void bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return;
      setSession(newSession);

      if (!newSession) {
        setProfile(null);
        setStatus('unauthenticated');
        lastUserIdRef.current = null;
        return;
      }

      if (lastUserIdRef.current === newSession.user.id) return;
      lastUserIdRef.current = newSession.user.id;

      const p = await loadProfile(newSession.user.id);
      if (!active) return;

      if (!p || !p.ativo) {
        await supabase.auth.signOut();
        setProfile(null);
        setStatus('no_profile');
        toast.error('Esta conta não tem acesso ao Sales Hub.');
      } else {
        setProfile(p);
        setStatus('authenticated');
        if (event === 'SIGNED_IN') {
          await logAudit(p.id, p.email, 'login');
          await supabase
            .from('profiles')
            .update({ ultimo_acesso_em: new Date().toISOString() })
            .eq('id', p.id);
        }
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    if (profile) await logAudit(profile.id, profile.email, 'logout');
    await supabase.auth.signOut();
  };

  const requestPasswordReset: AuthContextValue['requestPasswordReset'] = async (email) => {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { error: error.message };
    return {};
  };

  const updatePassword: AuthContextValue['updatePassword'] = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  };

  const refreshProfile: AuthContextValue['refreshProfile'] = async () => {
    if (!session) return;
    const p = await loadProfile(session.user.id);
    if (p) setProfile(p);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        status,
        signIn,
        signOut,
        requestPasswordReset,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
