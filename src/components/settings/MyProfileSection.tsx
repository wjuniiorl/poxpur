import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const schema = z.object({
  nome: z.string().min(2, 'Nome muito curto').max(80, 'Nome muito longo'),
  telefone: z.string().max(20).or(z.literal('')),
  foto_url: z.string().url('URL inválida').or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function MyProfileSection() {
  const { profile, refreshProfile, updatePassword } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', telefone: '', foto_url: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        nome: profile.nome,
        telefone: profile.telefone ?? '',
        foto_url: profile.foto_url ?? '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: FormValues) => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: values.nome.trim(),
          telefone: values.telefone.trim() || null,
          foto_url: values.foto_url.trim() || null,
        })
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Perfil atualizado');
    } catch (err) {
      toast.error(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const onSubmitPassword = async (values: PasswordFormValues) => {
    setSavingPassword(true);
    try {
      const { error } = await updatePassword(values.newPassword);
      if (error) {
        toast.error(`Erro ao trocar senha: ${error}`);
        return;
      }
      toast.success('Senha atualizada');
      passwordForm.reset({ newPassword: '', confirmPassword: '' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!profile) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Dados pessoais
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nome de exibição</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormDescription>
                      É esse nome que aparece no WhatsApp do cliente antes da sua mensagem.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">E-mail</label>
                <Input value={profile.email} disabled />
                <p className="text-xs text-muted-foreground">Não editável aqui.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Papel</label>
                <div className="flex h-10 items-center">
                  <Badge
                    className={
                      profile.role === 'admin'
                        ? 'border-transparent bg-poxpur-navy text-white'
                        : 'border-transparent bg-poxpur-green text-white'
                    }
                  >
                    {profile.role === 'admin' ? 'Administrador' : 'Vendedor'}
                  </Badge>
                </div>
              </div>
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="foto_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da foto</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.reset({
                  nome: profile.nome,
                  telefone: profile.telefone ?? '',
                  foto_url: profile.foto_url ?? '',
                })
              }
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Form>

      <Separator />

      <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Trocar senha
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar senha</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={savingPassword}
            className="bg-poxpur-navy text-white hover:bg-poxpur-navy/90"
          >
            {savingPassword ? 'Atualizando...' : 'Atualizar senha'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
