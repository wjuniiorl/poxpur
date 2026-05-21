import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserPlus, ChevronDown } from 'lucide-react';
import { useAdminUsers, useToggleUserAtivo, useChangeUserRole } from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';
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

// ─── Component ───────────────────────────────────────────────────────────────

export function UsersSection() {
  const { profile: currentUser } = useAuth();
  const { data: users, isLoading } = useAdminUsers();
  const toggleAtivo = useToggleUserAtivo();
  const changeRole = useChangeUserRole();

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? '...' : `${users?.length ?? 0} usuário(s)`}
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button size="sm" disabled className="gap-2">
                <UserPlus className="h-4 w-4" />
                Convidar usuário
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Convite via dashboard Supabase — UI no roadmap</TooltipContent>
        </Tooltip>
      </div>

      {/* Table */}
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Switch checked={user.ativo} disabled />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Você não pode alterar seu próprio status
                            </TooltipContent>
                          </Tooltip>
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
    </div>
  );
}
