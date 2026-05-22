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
};

export const AuthContext = createContext<AuthContextValue | null>(null);

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

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (!data.session) {
        setSession(null);
        setProfile(null);
        setStatus('unauthenticated');
        return;
      }

      setSession(data.session);
      const p = await loadProfile(data.session.user.id);
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
    }

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

  return (
    <AuthContext.Provider
      value={{ session, profile, status, signIn, signOut, requestPasswordReset, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}
