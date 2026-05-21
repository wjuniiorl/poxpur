import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserPlus, ChevronDown, Copy, XCircle, Loader2 } from 'lucide-react';
import { useAdminUsers, useToggleUserAtivo, useChangeUserRole } from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';
import { useInvitations, useCancelInvitation } from '@/hooks/useInvitations';
import { inviteUser } from '@/lib/whatsappAdapter';
import { fmtDateTime, fmtDate } from '@/lib/format';
import type { UserRole } from '@/types/database';

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  return role === 'admin' ? (
    <Badge className="border-transparent bg-poxpur-green/15 text-poxpur-green-dark hover:bg-poxpur-green/15">
      Admin
    </Badge>
  ) : (
    <Badge variant="secondary">Vendedor</Badge>
  );
}

// ─── Initials ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Invite form schema ───────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().optional(),
  role: z.enum(['admin', 'vendedor'] as const),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

// ─── InviteDialog ─────────────────────────────────────────────────────────────

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', nome: '', role: 'vendedor' },
  });

  const onSubmit = async (values: InviteFormValues) => {
    try {
      const { invitation, emailSent } = await inviteUser({
        email: values.email,
        nome: values.nome || undefined,
        role: values.role,
        inviteName: values.nome || undefined,
      });

      if (emailSent) {
        toast.success(`Convite enviado para ${values.email}`);
      } else {
        const link = `${window.location.origin}/accept-invite?token=${invitation.token}`;
        toast.success('Convite criado', {
          description: (
            <span className="text-xs break-all">
              Link: <a href={link} target="_blank" rel="noreferrer" className="underline">{link}</a>
            </span>
          ),
          duration: 10000,
        });
      }

      reset();
      onClose();
    } catch (err) {
      toast.error(`Erro ao convidar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              placeholder="vendedor@empresa.com"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-nome">Nome <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input
              id="invite-nome"
              type="text"
              placeholder="Maria Silva"
              {...register('nome')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              {...register('role')}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { reset(); onClose(); }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-poxpur-green hover:bg-poxpur-green-dark text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Enviar convite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pending invitations table ────────────────────────────────────────────────

function PendingInvitations() {
  const { data: invitations, isLoading } = useInvitations();
  const cancel = useCancelInvitation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
    );
  }

  const copyToken = (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    void navigator.clipboard.writeText(link).then(() => toast.success('Link copiado'));
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expira em</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Link</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => (
            <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">{inv.email}</td>
              <td className="px-4 py-3 text-muted-foreground">{inv.nome ?? '—'}</td>
              <td className="px-4 py-3">
                <RoleBadge role={inv.role} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {fmtDateTime.format(new Date(inv.expires_at))}
              </td>
              <td className="px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Copiar link de convite"
                  onClick={() => copyToken(inv.token)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </td>
              <td className="px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Cancelar convite"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate(inv.id)}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UsersSection() {
  const { profile: currentUser } = useAuth();
  const { data: users, isLoading } = useAdminUsers();
  const toggleAtivo = useToggleUserAtivo();
  const changeRole = useChangeUserRole();
  const [inviteOpen, setInviteOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? '...' : `${users?.length ?? 0} usuário(s)`}
        </p>
        <Button
          size="sm"
          disabled={!isAdmin}
          className="gap-2"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Convidar usuário
        </Button>
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ativo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Último acesso
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Criado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : (users ?? []).map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <tr
                      key={user.id}
                      className="border-b transition-colors hover:bg-muted/30 last:border-0"
                    >
                      {/* User info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.foto_url ?? undefined} />
                            <AvatarFallback className="text-xs">
                              {initials(user.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.nome}
                              {isSelf && (
                                <span className="ml-1 text-xs text-muted-foreground">(você)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {isAdmin && !isSelf ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto gap-1 px-2 py-1"
                                disabled={changeRole.isPending}
                              >
                                <RoleBadge role={user.role} />
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() =>
                                  changeRole.mutate({ id: user.id, role: 'admin' })
                                }
                              >
                                Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  changeRole.mutate({ id: user.id, role: 'vendedor' })
                                }
                              >
                                Vendedor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <RoleBadge role={user.role} />
                        )}
                      </td>

                      {/* Ativo */}
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <Switch checked={user.ativo} disabled />
                        ) : (
                          <Switch
                            checked={user.ativo}
                            disabled={toggleAtivo.isPending}
                            onCheckedChange={(v) => toggleAtivo.mutate({ id: user.id, ativo: v })}
                          />
                        )}
                      </td>

                      {/* Último acesso */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.ultimo_acesso_em
                          ? fmtDateTime.format(new Date(user.ultimo_acesso_em))
                          : '—'}
                      </td>

                      {/* Criado */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtDate.format(new Date(user.criado_em))}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Pending invitations */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Convites pendentes</h3>
        <PendingInvitations />
      </div>

      {/* Invite dialog */}
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
