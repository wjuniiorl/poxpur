import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { fmtDateTime } from '@/lib/format';
import { useState as useToggleState } from 'react';

// ─── Expandable payload cell ──────────────────────────────────────────────────

function PayloadCell({ payload }: { payload: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useToggleState(false);

  if (!payload || Object.keys(payload).length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto gap-1 px-1 py-0.5 text-xs"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Ver payload
      </Button>
      {expanded && (
        <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AuditLogSection() {
  const [acaoFilter, setAcaoFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState<string | undefined>(undefined);

  const { data: logs, isLoading } = useAuditLogs({
    acao: acaoFilter || undefined,
    userId: userIdFilter,
    limit: 200,
  });

  const { data: users } = useAdminUsers();

  const selectedUserName =
    userIdFilter
      ? (users ?? []).find((u) => u.id === userIdFilter)?.nome ?? 'Usuário'
      : 'Todos os usuários';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por ação..."
            value={acaoFilter}
            onChange={(e) => setAcaoFilter(e.target.value)}
            className="pl-8 sm:w-52"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {selectedUserName}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setUserIdFilter(undefined)}>
              Todos os usuários
            </DropdownMenuItem>
            {(users ?? []).map((u) => (
              <DropdownMenuItem key={u.id} onClick={() => setUserIdFilter(u.id)}>
                {u.nome}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-xs text-muted-foreground">
          {isLoading ? '...' : `${logs?.length ?? 0} registros (máx 200)`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quando</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ação</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recurso</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payload</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : (logs ?? []).map((log) => (
                  <tr
                    key={log.id}
                    className="border-b transition-colors hover:bg-muted/30 last:border-0"
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {fmtDateTime.format(new Date(log.criado_em))}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">
                          {(users ?? []).find((u) => u.id === log.user_id)?.nome ??
                            log.user_email ??
                            '—'}
                        </p>
                        {log.user_email && (
                          <p className="text-xs text-muted-foreground">{log.user_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.acao}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.recurso ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <PayloadCell payload={log.payload} />
                    </td>
                  </tr>
                ))}
            {!isLoading && (logs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
