import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PoxpurSpinner } from '@/components/common/PoxpurSpinner';
import type { PoxpurUserInvitation } from '@/types/database';

// ─── Password schema (same as ResetPassword) ──────────────────────────────────

const schema = z
  .object({
    nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Precisa ter ao menos uma letra maiúscula')
      .regex(/[0-9]/, 'Precisa ter ao menos um número'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'As senhas não conferem',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

// ─── AcceptInvite ─────────────────────────────────────────────────────────────

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<PoxpurUserInvitation | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', password: '', confirm: '' },
  });

  // Fetch invitation by token
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pendente')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (!cancelled) {
        setInvitation(data ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const onSubmit = async (values: FormValues) => {
    if (!invitation) return;
    setServerError(null);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: values.password,
        options: {
          data: { nome: values.nome },
        },
      });

      if (signUpError) {
        setServerError(signUpError.message);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setServerError('Erro inesperado ao criar conta.');
        return;
      }

      // Insert profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        nome: values.nome,
        email: invitation.email,
        role: invitation.role,
        ativo: true,
      });

      if (profileError) {
        // Profile may already exist if auth trigger created it — ignore duplicate
        if (!profileError.message.includes('duplicate') && !profileError.code?.includes('23505')) {
          console.warn('[accept-invite] profile insert error:', profileError);
        }
      }

      // Mark invitation accepted
      await supabase
        .from('user_invitations')
        .update({
          status: 'aceito',
          accepted_user_id: userId,
        })
        .eq('id', invitation.id);

      toast.success('Conta criada com sucesso! Faça login para continuar.');
      navigate('/login');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AuthLayout title="Verificando convite..." subtitle="">
        <div className="flex justify-center py-8">
          <PoxpurSpinner size="md" />
        </div>
      </AuthLayout>
    );
  }

  // ── Invalid / expired ──────────────────────────────────────────────────────
  if (!token || !invitation) {
    return (
      <AuthLayout title="Convite inválido" subtitle="O link pode ter expirado ou já foi usado.">
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Este convite é inválido ou expirou. Solicite um novo convite ao administrador.
            </AlertDescription>
          </Alert>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              Ir para o login
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Valid invitation form ──────────────────────────────────────────────────
  const roleLabel = invitation.role === 'admin' ? 'Administrador' : 'Vendedor';

  return (
    <AuthLayout
      title="Você foi convidado!"
      subtitle={`Poxpur Sales Hub${invitation.nome ? ` — Olá, ${invitation.nome}!` : ''}`}
    >
      <div className="space-y-5">
        {/* Info chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {invitation.email}
          </Badge>
          <Badge
            className={
              invitation.role === 'admin'
                ? 'text-xs border-transparent bg-poxpur-green/15 text-poxpur-green-dark hover:bg-poxpur-green/15'
                : 'text-xs'
            }
            variant={invitation.role === 'admin' ? 'default' : 'secondary'}
          >
            {roleLabel}
          </Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              type="text"
              autoComplete="name"
              defaultValue={invitation.nome ?? ''}
              {...register('nome')}
              aria-invalid={!!errors.nome}
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...register('confirm')}
              aria-invalid={!!errors.confirm}
            />
            {errors.confirm && (
              <p className="text-sm text-destructive">{errors.confirm.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-poxpur-navy text-white hover:bg-poxpur-navy-dark"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <PoxpurSpinner size="sm" />
                Criando conta...
              </span>
            ) : (
              'Criar minha conta'
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Já tem uma conta?{' '}
          <Link to="/login" className="underline underline-offset-2 hover:text-foreground">
            Fazer login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
