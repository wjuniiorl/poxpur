# Onda 5 — Relatórios + Settings Completo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional Reports page with 6 Recharts visualizations and expand the Settings page into 4 tabs (Empresa, Catálogo, Usuários, Auditoria).

**Architecture:** All data hooks follow the existing pattern — `useQuery`/`useMutation` from `@tanstack/react-query`, `supabase` client from `@/lib/supabase`, typed against `@/types/database`. UI follows shadcn patterns with Tailwind. The existing Settings products catalog is preserved intact inside a new `<SettingsTabs>` component; the Products tab is extracted to `ProductsCatalogSection.tsx` so Settings.tsx becomes a thin tab shell.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS, TanStack Query v5, Recharts 3.8.1, react-hook-form + zod, date-fns 4, shadcn/ui (Tabs needed — not yet installed), Tailwind CSS

---

## File Map

**New files:**
- `src/hooks/useReports.ts` — analytics query from orders + items + customers + sellers
- `src/hooks/useCompanySettings.ts` — singleton fetch + update mutation
- `src/hooks/useAdminUsers.ts` — list profiles + toggle ativo + change role
- `src/hooks/useAuditLogs.ts` — list audit_logs with filters
- `src/components/reports/ReportCard.tsx` — card wrapper for each chart
- `src/components/reports/PeriodPicker.tsx` — preset period selector
- `src/components/settings/CompanyProfileSection.tsx` — company_settings form
- `src/components/settings/UsersSection.tsx` — profiles table with role/active controls
- `src/components/settings/AuditLogSection.tsx` — audit_logs table with filters
- `src/components/settings/SettingsTabs.tsx` — tab navigator
- `src/components/settings/ProductsCatalogSection.tsx` — extracted products catalog

**Modified files:**
- `src/pages/Reports.tsx` — replace ComingSoonPage with full reports layout
- `src/pages/Settings.tsx` — refactor into tabs shell using SettingsTabs

**New shadcn component:**
- `src/components/ui/tabs.tsx` — Radix tabs (install with shadcn CLI)

---

## Task 1: Install shadcn Tabs component

**Files:**
- Create: `src/components/ui/tabs.tsx`

- [ ] **Step 1: Install via shadcn CLI**

```bash
cd "c:/Python/alex" && pnpm dlx shadcn@latest add tabs --yes
```

Expected: creates `src/components/ui/tabs.tsx`. If the CLI writes to a literal `@/components/ui/tabs.tsx` path (stray directory at repo root), copy and delete it:
```bash
# Only run if a stray @ folder was created at repo root:
cp "@/components/ui/tabs.tsx" src/components/ui/tabs.tsx && rm -rf "@"
```

- [ ] **Step 2: Verify tabs.tsx exists**

```bash
ls "c:/Python/alex/src/components/ui/tabs.tsx"
```

Expected: file found. If not found, write it manually:

```tsx
// src/components/ui/tabs.tsx
"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

- [ ] **Step 3: Install @radix-ui/react-tabs if needed**

```bash
cd "c:/Python/alex" && pnpm add @radix-ui/react-tabs
```

- [ ] **Step 4: Quick typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -20
```

Expected: no errors related to tabs.

---

## Task 2: useReports hook

**Files:**
- Create: `src/hooks/useReports.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useReports.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, subMonths, startOfMonth } from 'date-fns';
import type { OrderStatus } from '@/types/database';

// ─── Period type ─────────────────────────────────────────────────────────────

export type ReportPeriod = { from: Date; to: Date };

// ─── Result types ────────────────────────────────────────────────────────────

export type VendaPorVendedor = {
  seller_id: string;
  seller_nome: string;
  pedidos: number;
  faturamento: number;
};

export type PedidoPorStatus = {
  status: OrderStatus;
  count: number;
  valor: number;
};

export type FaturamentoMensal = {
  mes: string; // 'YYYY-MM'
  faturamento: number;
};

export type ProdutoMaisVendido = {
  product_id: string;
  nome: string;
  sku: string;
  quantidade_total: number;
  faturamento: number;
};

export type ClienteTop = {
  customer_id: string;
  nome: string;
  pedidos: number;
  faturamento: number;
};

export type FunilEtapa = {
  etapa: string;
  count: number;
  pct?: number; // % vs previous step
};

export type ReportTotals = {
  totalPedidos: number;
  totalFaturamento: number;
  ticketMedio: number;
  taxaConversao: number;
};

export type ReportsData = {
  isLoading: boolean;
  totals: ReportTotals;
  vendasPorVendedor: VendaPorVendedor[];
  pedidosPorStatus: PedidoPorStatus[];
  faturamentoMensal: FaturamentoMensal[];
  produtosMaisVendidos: ProdutoMaisVendido[];
  clientesTop: ClienteTop[];
  funilConversao: FunilEtapa[];
};

const EMPTY: ReportsData = {
  isLoading: false,
  totals: { totalPedidos: 0, totalFaturamento: 0, ticketMedio: 0, taxaConversao: 0 },
  vendasPorVendedor: [],
  pedidosPorStatus: [],
  faturamentoMensal: [],
  produtosMaisVendidos: [],
  clientesTop: [],
  funilConversao: [],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReports(period: ReportPeriod): ReportsData {
  const { from, to } = period;

  const query = useQuery({
    queryKey: ['reports', from.toISOString(), to.toISOString()],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch orders in period with items + products + seller + customer
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(
          `id, status, valor_total, seller_id, customer_id, criado_em,
          seller:profiles!orders_seller_id_fkey(id, nome),
          customer:customers!orders_customer_id_fkey(id, nome),
          items:order_items(id, product_id, quantidade, valor_total,
            product:products!order_items_product_id_fkey(id, nome, sku))`,
        )
        .gte('criado_em', from.toISOString())
        .lte('criado_em', to.toISOString())
        .order('criado_em', { ascending: false });

      if (ordersError) throw ordersError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = (orders ?? []) as any[];

      // ── Totals ──────────────────────────────────────────────────────────────
      const active = o.filter((x) => x.status !== 'recusado' && x.status !== 'cancelado');
      const totalFaturamento = active.reduce((s: number, x: any) => s + (x.valor_total ?? 0), 0);
      const totalPedidos = o.length;
      const ticketMedio = active.length > 0 ? totalFaturamento / active.length : 0;
      const aprovados = o.filter((x: any) => x.status === 'aprovado').length;
      const recusados = o.filter((x: any) => x.status === 'recusado').length;
      const taxaConversao =
        aprovados + recusados > 0 ? (aprovados / (aprovados + recusados)) * 100 : 0;

      // ── Vendas por vendedor ──────────────────────────────────────────────────
      const sellerMap = new Map<string, VendaPorVendedor>();
      for (const order of active) {
        if (!order.seller) continue;
        const sid = order.seller.id as string;
        const entry = sellerMap.get(sid) ?? {
          seller_id: sid,
          seller_nome: order.seller.nome as string,
          pedidos: 0,
          faturamento: 0,
        };
        entry.pedidos += 1;
        entry.faturamento += order.valor_total ?? 0;
        sellerMap.set(sid, entry);
      }
      const vendasPorVendedor = [...sellerMap.values()].sort(
        (a, b) => b.faturamento - a.faturamento,
      );

      // ── Pedidos por status ───────────────────────────────────────────────────
      const statusMap = new Map<OrderStatus, PedidoPorStatus>();
      for (const order of o) {
        const s = order.status as OrderStatus;
        const entry = statusMap.get(s) ?? { status: s, count: 0, valor: 0 };
        entry.count += 1;
        entry.valor += order.valor_total ?? 0;
        statusMap.set(s, entry);
      }
      const pedidosPorStatus = [...statusMap.values()];

      // ── Faturamento mensal (last 6 months including current) ────────────────
      const monthMap = new Map<string, number>();
      // Pre-populate last 6 months with zero
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(startOfMonth(new Date()), i);
        monthMap.set(format(d, 'yyyy-MM'), 0);
      }
      for (const order of active) {
        const mes = format(new Date(order.criado_em as string), 'yyyy-MM');
        if (monthMap.has(mes)) {
          monthMap.set(mes, (monthMap.get(mes) ?? 0) + (order.valor_total ?? 0));
        }
      }
      const faturamentoMensal: FaturamentoMensal[] = [...monthMap.entries()].map(
        ([mes, faturamento]) => ({ mes, faturamento }),
      );

      // ── Produtos mais vendidos (top 10) ─────────────────────────────────────
      const prodMap = new Map<string, ProdutoMaisVendido>();
      for (const order of active) {
        for (const item of order.items ?? []) {
          if (!item.product) continue;
          const pid = item.product.id as string;
          const entry = prodMap.get(pid) ?? {
            product_id: pid,
            nome: item.product.nome as string,
            sku: item.product.sku as string,
            quantidade_total: 0,
            faturamento: 0,
          };
          entry.quantidade_total += item.quantidade ?? 0;
          entry.faturamento += item.valor_total ?? 0;
          prodMap.set(pid, entry);
        }
      }
      const produtosMaisVendidos = [...prodMap.values()]
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 10);

      // ── Clientes top (top 10) ────────────────────────────────────────────────
      const custMap = new Map<string, ClienteTop>();
      for (const order of active) {
        if (!order.customer) continue;
        const cid = order.customer.id as string;
        const entry = custMap.get(cid) ?? {
          customer_id: cid,
          nome: order.customer.nome as string,
          pedidos: 0,
          faturamento: 0,
        };
        entry.pedidos += 1;
        entry.faturamento += order.valor_total ?? 0;
        custMap.set(cid, entry);
      }
      const clientesTop = [...custMap.values()]
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 10);

      // ── Funil de conversão ───────────────────────────────────────────────────
      const etapas = [
        { etapa: 'Criados', count: o.length },
        {
          etapa: 'Aprovados',
          count: o.filter((x: any) =>
            ['aprovado', 'aguardando_fabrica', 'enviado', 'concluido'].includes(x.status),
          ).length,
        },
        {
          etapa: 'Enviados',
          count: o.filter((x: any) => ['enviado', 'concluido'].includes(x.status)).length,
        },
        {
          etapa: 'Concluídos',
          count: o.filter((x: any) => x.status === 'concluido').length,
        },
      ];
      const funilConversao: FunilEtapa[] = etapas.map((e, i) => ({
        ...e,
        pct:
          i === 0
            ? 100
            : etapas[0].count > 0
              ? Math.round((e.count / etapas[0].count) * 100)
              : 0,
      }));

      return {
        totals: { totalPedidos, totalFaturamento, ticketMedio, taxaConversao },
        vendasPorVendedor,
        pedidosPorStatus,
        faturamentoMensal,
        produtosMaisVendidos,
        clientesTop,
        funilConversao,
      };
    },
  });

  if (query.isLoading || !query.data) {
    return { ...EMPTY, isLoading: query.isLoading };
  }

  return { isLoading: false, ...query.data };
}
```

- [ ] **Step 2: Typecheck hook**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -30
```

Expected: no errors in `useReports.ts`.

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/hooks/useReports.ts && git commit -m "feat(data): add useReports analytics hook"
```

---

## Task 3: useCompanySettings hook

**Files:**
- Create: `src/hooks/useCompanySettings.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useCompanySettings.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { PoxpurCompanySettings, PoxpurCompanySettingsInsert } from '@/types/database';

const SINGLETON_ID = '50000000-0000-0000-0000-000000000001';

export function useCompanySettings() {
  return useQuery<PoxpurCompanySettings | null>({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', SINGLETON_ID)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<PoxpurCompanySettingsInsert>) => {
      const { data, error } = await supabase
        .from('company_settings')
        .update(patch)
        .eq('id', SINGLETON_ID)
        .select()
        .single();
      if (error) throw error;
      return data as PoxpurCompanySettings;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Configurações salvas com sucesso');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | grep useCompanySettings || echo "OK"
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/hooks/useCompanySettings.ts && git commit -m "feat(data): add useCompanySettings hook"
```

---

## Task 4: useAdminUsers hook

**Files:**
- Create: `src/hooks/useAdminUsers.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useAdminUsers.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { PoxpurProfile } from '@/types/database';

export function useAdminUsers() {
  return useQuery<PoxpurProfile[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleUserAtivo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('profiles').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { ativo }) => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(ativo ? 'Usuário ativado' : 'Usuário desativado');
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'admin' | 'vendedor' }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { role }) => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`Role alterado para ${role}`);
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | grep useAdminUsers || echo "OK"
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/hooks/useAdminUsers.ts && git commit -m "feat(data): add useAdminUsers hook"
```

---

## Task 5: useAuditLogs hook

**Files:**
- Create: `src/hooks/useAuditLogs.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useAuditLogs.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PoxpurAuditLog } from '@/types/database';

export type AuditLogFilters = {
  acao?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery<PoxpurAuditLog[]>({
    queryKey: ['audit-logs', filters ?? {}],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(filters?.limit ?? 200);

      if (filters?.userId) {
        q = q.eq('user_id', filters.userId);
      }
      if (filters?.from) {
        q = q.gte('criado_em', filters.from.toISOString());
      }
      if (filters?.to) {
        q = q.lte('criado_em', filters.to.toISOString());
      }
      if (filters?.acao) {
        q = q.ilike('acao', `%${filters.acao}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | grep useAuditLogs || echo "OK"
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/hooks/useAuditLogs.ts && git commit -m "feat(data): add useAuditLogs hook"
```

---

## Task 6: ReportCard component

**Files:**
- Create: `src/components/reports/ReportCard.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/reports/ReportCard.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReactNode } from 'react';

type ReportCardProps = {
  title: string;
  description?: string;
  isLoading?: boolean;
  children: ReactNode;
  minHeight?: string;
};

export function ReportCard({
  title,
  description,
  isLoading,
  children,
  minHeight = '280px',
}: ReportCardProps) {
  return (
    <Card className="flex flex-col shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 pt-0" style={{ minHeight }}>
        {isLoading ? (
          <div className="flex h-full flex-col gap-3 pt-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Python/alex" && git add src/components/reports/ReportCard.tsx && git commit -m "feat(reports): add ReportCard wrapper component"
```

---

## Task 7: PeriodPicker component

**Files:**
- Create: `src/components/reports/PeriodPicker.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/reports/PeriodPicker.tsx
import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfDay,
  startOfDay,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export type Period = {
  from: Date;
  to: Date;
  label: string;
};

type PeriodPickerProps = {
  value: Period;
  onChange: (period: Period) => void;
};

export function buildPresets(): Period[] {
  const now = new Date();
  return [
    {
      label: 'Hoje',
      from: startOfDay(now),
      to: endOfDay(now),
    },
    {
      label: 'Últimos 7 dias',
      from: startOfDay(subDays(now, 6)),
      to: endOfDay(now),
    },
    {
      label: 'Últimos 30 dias',
      from: startOfDay(subDays(now, 29)),
      to: endOfDay(now),
    },
    {
      label: 'Este mês',
      from: startOfMonth(now),
      to: endOfDay(now),
    },
    {
      label: 'Mês passado',
      from: startOfMonth(subMonths(now, 1)),
      to: endOfMonth(subMonths(now, 1)),
    },
    {
      label: 'Este ano',
      from: startOfYear(now),
      to: endOfDay(now),
    },
  ];
}

export function defaultPeriod(): Period {
  return buildPresets()[2]; // Últimos 30 dias
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const presets = buildPresets();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {value.label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {presets.map((p) => (
          <DropdownMenuItem
            key={p.label}
            onClick={() => onChange(p)}
            className={value.label === p.label ? 'font-medium text-poxpur-green-dark' : ''}
          >
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/components/reports/PeriodPicker.tsx && git commit -m "feat(reports): add PeriodPicker component"
```

---

## Task 8: Reports page

**Files:**
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: Replace with full Reports page**

```tsx
// src/pages/Reports.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ReportCard } from '@/components/reports/ReportCard';
import { PeriodPicker, defaultPeriod } from '@/components/reports/PeriodPicker';
import { useReports } from '@/hooks/useReports';
import { fmtBRL } from '@/lib/format';
import type { OrderStatus } from '@/types/database';
import type { Period } from '@/components/reports/PeriodPicker';

// ─── Color maps ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<OrderStatus, string> = {
  pendente_aprovacao: '#f59e0b',
  aprovado: '#22c55e',
  recusado: '#ef4444',
  aguardando_fabrica: '#3b82f6',
  enviado: '#a855f7',
  concluido: '#10b981',
  cancelado: '#71717a',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pendente_aprovacao: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  aguardando_fabrica: 'Ag. Fábrica',
  enviado: 'Enviado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtMes(mes: string): string {
  // mes = 'YYYY-MM'
  const [year, month] = mes.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return format(d, 'MMM/yy', { locale: ptBR });
}

function fmtBRLShort(value: number): string {
  if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$${(value / 1_000).toFixed(0)}k`;
  return fmtBRL.format(value);
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm font-medium text-muted-foreground">
        Nenhum pedido no período selecionado
      </p>
      <p className="text-xs text-muted-foreground">
        Ajuste o período para visualizar os dados
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const data = useReports(period);

  const hasData = data.totals.totalPedidos > 0;

  const stats = [
    {
      label: 'Total de Pedidos',
      value: String(data.totals.totalPedidos),
    },
    {
      label: 'Faturamento',
      value: fmtBRL.format(data.totals.totalFaturamento),
    },
    {
      label: 'Ticket Médio',
      value: fmtBRL.format(data.totals.ticketMedio),
    },
    {
      label: 'Taxa de Conversão',
      value: `${data.totals.taxaConversao.toFixed(1)}%`,
    },
  ];

  // Top 5 sellers for bar chart
  const topSellers = data.vendasPorVendedor.slice(0, 5);

  const pieData = data.pedidosPorStatus.map((p) => ({
    name: STATUS_LABELS[p.status] ?? p.status,
    value: p.count,
    fill: STATUS_COLORS[p.status] ?? '#71717a',
  }));

  const lineData = data.faturamentoMensal.map((m) => ({
    mes: fmtMes(m.mes),
    faturamento: m.faturamento,
  }));

  const topProdutos = data.produtosMaisVendidos.slice(0, 10).map((p) => ({
    nome: p.nome.length > 20 ? p.nome.slice(0, 18) + '…' : p.nome,
    faturamento: p.faturamento,
    quantidade: p.quantidade_total,
  }));

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-poxpur-navy">Relatórios</h1>
            <p className="text-sm text-muted-foreground">
              Análise de vendas e performance da equipe
            </p>
          </div>
          <div className="flex items-center gap-2">
            <UITooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" disabled className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Exportar PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </UITooltip>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" disabled className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Exportar Excel
                </Button>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </UITooltip>
            <PeriodPicker value={period} onChange={setPeriod} />
          </div>
        </div>

        {/* Top metrics */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <StatsCard key={s.label} stat={s} isLoading={data.isLoading} />
          ))}
        </div>

        {/* No data empty state */}
        {!data.isLoading && !hasData && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum pedido no período selecionado
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste o período para visualizar os dados
            </p>
          </div>
        )}

        {/* Charts */}
        {(data.isLoading || hasData) && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 1. Vendas por Vendedor */}
            <ReportCard
              title="Vendas por Vendedor"
              description="Top 5 por faturamento"
              isLoading={data.isLoading}
            >
              {topSellers.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={topSellers}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={fmtBRLShort}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="seller_nome"
                      tick={{ fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(val: any) => [fmtBRL.format(val), 'Faturamento']}
                    />
                    <Bar dataKey="faturamento" fill="hsl(var(--poxpur-green))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ReportCard>

            {/* 2. Pedidos por Status */}
            <ReportCard
              title="Pedidos por Status"
              description="Distribuição no período"
              isLoading={data.isLoading}
            >
              {pieData.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: any) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [val, 'Pedidos']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ReportCard>

            {/* 3. Faturamento Mensal */}
            <ReportCard
              title="Faturamento Mensal"
              description="Últimos 6 meses"
              isLoading={data.isLoading}
            >
              {lineData.every((d) => d.faturamento === 0) ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={lineData}
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtBRLShort} tick={{ fontSize: 11 }} width={60} />
                    <Tooltip formatter={(val: any) => [fmtBRL.format(val), 'Faturamento']} />
                    <Line
                      type="monotone"
                      dataKey="faturamento"
                      stroke="hsl(var(--poxpur-green))"
                      strokeWidth={2}
                      dot={{ r: 4, fill: 'hsl(var(--poxpur-green))' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ReportCard>

            {/* 4. Funil de Conversão */}
            <ReportCard
              title="Funil de Conversão"
              description="Pedidos criados → concluídos"
              isLoading={data.isLoading}
            >
              {data.funilConversao[0]?.count === 0 ? (
                <EmptyState />
              ) : (
                <div className="flex flex-col gap-3 pt-4">
                  {data.funilConversao.map((etapa, i) => {
                    const maxCount = data.funilConversao[0]?.count ?? 1;
                    const barWidth = maxCount > 0 ? (etapa.count / maxCount) * 100 : 0;
                    const colors = [
                      'bg-blue-500',
                      'bg-poxpur-green',
                      'bg-purple-500',
                      'bg-emerald-600',
                    ];
                    return (
                      <div key={etapa.etapa} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{etapa.etapa}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{etapa.count}</span>
                            {i > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {etapa.pct}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${colors[i]}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ReportCard>

            {/* 5. Produtos mais vendidos */}
            <ReportCard
              title="Produtos Mais Vendidos"
              description="Top 10 por faturamento"
              isLoading={data.isLoading}
            >
              {topProdutos.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={topProdutos}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={fmtBRLShort}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      tick={{ fontSize: 10 }}
                      width={90}
                    />
                    <Tooltip
                      formatter={(val: any) => [fmtBRL.format(val), 'Faturamento']}
                    />
                    <Bar dataKey="faturamento" fill="hsl(var(--poxpur-green))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ReportCard>

            {/* 6. Clientes Top */}
            <ReportCard
              title="Clientes Top"
              description="Top 10 por faturamento"
              isLoading={data.isLoading}
              minHeight="300px"
            >
              {data.clientesTop.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left font-medium text-muted-foreground">
                          Cliente
                        </th>
                        <th className="py-2 text-right font-medium text-muted-foreground">
                          Pedidos
                        </th>
                        <th className="py-2 text-right font-medium text-muted-foreground">
                          Faturamento
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.clientesTop.map((c) => (
                        <tr
                          key={c.customer_id}
                          className="border-b transition-colors hover:bg-muted/30"
                        >
                          <td className="py-2 font-medium">
                            <a
                              href="/customers"
                              className="hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.href = '/customers';
                              }}
                            >
                              {c.nome}
                            </a>
                          </td>
                          <td className="py-2 text-right">{c.pedidos}</td>
                          <td className="py-2 text-right font-medium">
                            {fmtBRL.format(c.faturamento)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportCard>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -40
```

Expected: no errors in Reports.tsx.

- [ ] **Step 3: Lint**

```bash
cd "c:/Python/alex" && pnpm lint 2>&1 | head -30
```

If lint complains about `react-refresh/only-export-components`, add disable comment above the export default.

- [ ] **Step 4: Commit**

```bash
cd "c:/Python/alex" && git add src/pages/Reports.tsx && git commit -m "feat(reports): functional Reports page with 6 charts (Recharts)"
```

---

## Task 9: CompanyProfileSection

**Files:**
- Create: `src/components/settings/CompanyProfileSection.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/settings/CompanyProfileSection.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';

const schema = z.object({
  razao_social: z.string().nullable().optional(),
  nome_fantasia: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  inscricao_estadual: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  email: z.string().email('Email inválido').or(z.literal('')).nullable().optional(),
  logo_url: z.string().nullable().optional(),
  whatsapp_phone: z.string().nullable().optional(),
  n8n_webhook_url: z.string().nullable().optional(),
  recebe_resumo_diario: z.boolean().optional(),
  hora_resumo_diario: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

function toStringOrEmpty(v: string | null | undefined): string {
  return v ?? '';
}

export function CompanyProfileSection() {
  const { data: settings, isLoading } = useCompanySettings();
  const update = useUpdateCompanySettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      inscricao_estadual: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: '',
      email: '',
      logo_url: '',
      whatsapp_phone: '',
      n8n_webhook_url: '',
      recebe_resumo_diario: false,
      hora_resumo_diario: '08:00',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        razao_social: toStringOrEmpty(settings.razao_social),
        nome_fantasia: toStringOrEmpty(settings.nome_fantasia),
        cnpj: toStringOrEmpty(settings.cnpj),
        inscricao_estadual: toStringOrEmpty(settings.inscricao_estadual),
        endereco: toStringOrEmpty(settings.endereco),
        cidade: toStringOrEmpty(settings.cidade),
        estado: toStringOrEmpty(settings.estado),
        cep: toStringOrEmpty(settings.cep),
        telefone: toStringOrEmpty(settings.telefone),
        email: toStringOrEmpty(settings.email),
        logo_url: toStringOrEmpty(settings.logo_url),
        whatsapp_phone: toStringOrEmpty(settings.whatsapp_phone),
        n8n_webhook_url: toStringOrEmpty(settings.n8n_webhook_url),
        recebe_resumo_diario: settings.recebe_resumo_diario ?? false,
        hora_resumo_diario: toStringOrEmpty(settings.hora_resumo_diario) || '08:00',
      });
    }
  }, [settings, form]);

  const onSubmit = (values: FormValues) => {
    const patch = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? null : v]),
    );
    update.mutate(patch as Parameters<typeof update.mutate>[0]);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados da empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da empresa</CardTitle>
            <CardDescription>Informações fiscais e cadastrais</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="razao_social"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão social</FormLabel>
                  <FormControl>
                    <Input placeholder="Poxpur Tintas Ltda" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nome_fantasia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome fantasia</FormLabel>
                  <FormControl>
                    <Input placeholder="Poxpur" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input placeholder="00.000.000/0000-00" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inscricao_estadual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inscrição estadual</FormLabel>
                  <FormControl>
                    <Input placeholder="000.000.000.000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endereço</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Logradouro</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua, número, complemento" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="São Paulo" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="SP" maxLength={2} {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input placeholder="00000-000" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de contato</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contato@poxpur.com.br" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logo_url"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>URL do logotipo</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Integrações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrações</CardTitle>
            <CardDescription>WhatsApp e automações</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="whatsapp_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+5511999999999" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">WhatsApp Token</span>
              {settings?.whatsapp_token_configured ? (
                <Badge className="w-fit border-transparent bg-emerald-100 text-emerald-700">
                  Configurado
                </Badge>
              ) : (
                <Badge variant="secondary" className="w-fit text-muted-foreground">
                  Não configurado
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">
                Token gerenciado via Edge Function
              </p>
            </div>
            <FormField
              control={form.control}
              name="n8n_webhook_url"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>n8n Webhook URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://n8n.seuservidor.com/webhook/..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notificações</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="recebe_resumo_diario"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                  <div>
                    <FormLabel className="text-sm font-medium">Resumo diário</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Receber resumo de vendas por WhatsApp
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hora_resumo_diario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora do resumo</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} value={field.value ?? '08:00'} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={update.isPending}
            className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
          >
            {update.isPending ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/components/settings/CompanyProfileSection.tsx && git commit -m "feat(settings): add CompanyProfileSection form"
```

---

## Task 10: UsersSection

**Files:**
- Create: `src/components/settings/UsersSection.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/settings/UsersSection.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminUsers, useChangeUserRole, useToggleUserAtivo } from '@/hooks/useAdminUsers';
import { useAuth } from '@/hooks/useAuth';
import { fmtDateTime, fmtRelativeBR } from '@/lib/format';
import { ChevronDown, ShieldAlert, UserPlus } from 'lucide-react';
import type { PoxpurProfile } from '@/types/database';

function RoleBadge({ role }: { role: PoxpurProfile['role'] }) {
  return role === 'admin' ? (
    <Badge className="border-transparent bg-poxpur-green/15 text-poxpur-green-dark">Admin</Badge>
  ) : (
    <Badge variant="secondary">Vendedor</Badge>
  );
}

export function UsersSection() {
  const { data: users, isLoading } = useAdminUsers();
  const { profile: currentUser } = useAuth();
  const toggleAtivo = useToggleUserAtivo();
  const changeRole = useChangeUserRole();

  const isSelf = (userId: string) => userId === currentUser?.id;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Usuários</CardTitle>
            <CardDescription>Gerencie perfis, papéis e acesso</CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Convidar usuário
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-center">
              Convites gerenciados via painel Supabase. UI completa em update futuro.
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Papel</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Último acesso
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => {
                const self = isSelf(user.id);
                return (
                  <tr key={user.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-poxpur-green/20 text-xs font-bold text-poxpur-green-dark">
                          {user.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.nome}</span>
                        {self && (
                          <Badge variant="secondary" className="text-xs">
                            Você
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      {self ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <RoleBadge role={user.role} />
                          </TooltipTrigger>
                          <TooltipContent>
                            Não é possível alterar o próprio papel
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 rounded px-1 hover:bg-muted">
                              <RoleBadge role={user.role} />
                              <ChevronDown className="h-3 w-3 opacity-60" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => changeRole.mutate({ id: user.id, role: 'admin' })}
                              disabled={user.role === 'admin'}
                            >
                              <ShieldAlert className="mr-2 h-3.5 w-3.5" />
                              Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                changeRole.mutate({ id: user.id, role: 'vendedor' })
                              }
                              disabled={user.role === 'vendedor'}
                            >
                              Vendedor
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.ultimo_acesso_em
                        ? fmtRelativeBR(user.ultimo_acesso_em)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {self ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Switch checked={user.ativo} disabled />
                          </TooltipTrigger>
                          <TooltipContent>
                            Não é possível desativar a própria conta
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Switch
                          checked={user.ativo}
                          onCheckedChange={(v) => toggleAtivo.mutate({ id: user.id, ativo: v })}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/components/settings/UsersSection.tsx && git commit -m "feat(settings): add UsersSection component"
```

---

## Task 11: AuditLogSection

**Files:**
- Create: `src/components/settings/AuditLogSection.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/settings/AuditLogSection.tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { fmtDateTime } from '@/lib/format';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function AuditLogSection() {
  const [acaoFilter, setAcaoFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: users } = useAdminUsers();

  const { data: logs, isLoading } = useAuditLogs({
    acao: acaoFilter || undefined,
    userId: userFilter || undefined,
    limit: 200,
  });

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Auditoria</CardTitle>
              {logs && (
                <Badge variant="secondary" className="text-xs">
                  {logs.length} registros
                </Badge>
              )}
            </div>
            <CardDescription>Últimas 200 ações no sistema</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Filtrar por ação..."
              value={acaoFilter}
              onChange={(e) => setAcaoFilter(e.target.value)}
              className="w-40 text-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  {userFilter
                    ? users?.find((u) => u.id === userFilter)?.nome ?? 'Usuário'
                    : 'Todos os usuários'}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setUserFilter('')}>
                  Todos os usuários
                </DropdownMenuItem>
                {(users ?? []).map((u) => (
                  <DropdownMenuItem key={u.id} onClick={() => setUserFilter(u.id)}>
                    {u.nome}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quando</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Usuário
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ação</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Recurso
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Payload
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expanded.has(log.id);
                  const hasPayload =
                    log.payload && Object.keys(log.payload).length > 0;
                  return (
                    <tr key={log.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {fmtDateTime.format(new Date(log.criado_em))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {log.user_email ?? '—'}
                        </span>
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
                        {hasPayload ? (
                          <button
                            onClick={() => toggleExpanded(log.id)}
                            className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-mono hover:bg-muted/80"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            {isExpanded
                              ? JSON.stringify(log.payload, null, 2)
                              : JSON.stringify(log.payload).slice(0, 60) + '…'}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/components/settings/AuditLogSection.tsx && git commit -m "feat(settings): add AuditLogSection component"
```

---

## Task 12: Extract ProductsCatalogSection

The existing products catalog code lives inside `Settings.tsx`. Extract it to its own file so `Settings.tsx` can become a thin shell.

**Files:**
- Create: `src/components/settings/ProductsCatalogSection.tsx`
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Create ProductsCatalogSection.tsx**

Copy exactly the following from Settings.tsx — the helper components (`StockBadge`, `StatusBadge`, `SkeletonRows`, `DeactivateConfirmDialog`) and the `ProductsCatalog` function — into a new file, exporting `ProductsCatalog` as `ProductsCatalogSection`:

```tsx
// src/components/settings/ProductsCatalogSection.tsx
import { useState } from 'react';
import { Plus, Search, Pencil, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import { fmtBRL } from '@/lib/format';
import { ProductFormModal } from '@/components/settings/ProductFormModal';
import type { PoxpurProduct } from '@/types/database';
import { cn } from '@/lib/utils';

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0) {
    return (
      <Badge className="border-transparent bg-rose-100 text-rose-700 hover:bg-rose-100">
        Sem estoque
      </Badge>
    );
  }
  if (qty < 10) {
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100">
        {qty} un
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
      {qty} un
    </Badge>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="border-transparent bg-poxpur-green/15 text-poxpur-green-dark hover:bg-poxpur-green/15">
      Ativo
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-muted-foreground">
      Inativo
    </Badge>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function DeactivateConfirmDialog({
  product,
  open,
  onOpenChange,
}: {
  product: PoxpurProduct | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const deleteProduct = useDeleteProduct();

  const handleConfirm = async () => {
    if (!product) return;
    await deleteProduct.mutateAsync(product.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar produto</DialogTitle>
          <DialogDescription>
            <strong>{product?.nome}</strong> será desativado e não aparecerá mais no catálogo.
            Pedidos existentes com este produto não serão afetados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={deleteProduct.isPending}
            onClick={handleConfirm}
          >
            {deleteProduct.isPending ? 'Desativando...' : 'Desativar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsCatalogSection() {
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<PoxpurProduct | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<PoxpurProduct | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const { data: products, isLoading } = useProducts(showInactive);

  const filtered = (products ?? []).filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const handleNew = () => {
    setEditProduct(null);
    setFormOpen(true);
  };

  const handleEdit = (p: PoxpurProduct) => {
    setEditProduct(p);
    setFormOpen(true);
  };

  const handleDeactivate = (p: PoxpurProduct) => {
    setDeactivateTarget(p);
    setDeactivateOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Catálogo de produtos</CardTitle>
            <CardDescription>Gerencie os produtos disponíveis para pedidos</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
                className="scale-90"
              />
              <Label htmlFor="show-inactive" className="cursor-pointer text-xs text-muted-foreground">
                Mostrar inativos
              </Label>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar SKU ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 sm:w-52"
              />
            </div>
            <Button
              onClick={handleNew}
              className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
            >
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {!isLoading && filtered.length === 0 ? (
          <div className={cn('grid place-items-center py-12')}>
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {search ? `Nenhum resultado para "${search}"` : 'Nenhum produto cadastrado'}
              </p>
              {!search && (
                <Button variant="outline" size="sm" onClick={handleNew}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar primeiro produto
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Preço</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estoque</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonRows />
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.id}
                      className={cn(
                        'border-b transition-colors hover:bg-muted/30',
                        !p.ativo && 'opacity-60',
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="px-4 py-3 font-medium">{p.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.categoria ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmtBRL.format(p.preco)}</td>
                      <td className="px-4 py-3"><StockBadge qty={p.estoque} /></td>
                      <td className="px-4 py-3"><StatusBadge active={p.ativo} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleEdit(p)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {p.ativo && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeactivate(p)}
                              title="Desativar"
                            >
                              <PackageX className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ProductFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editProduct}
      />

      <DeactivateConfirmDialog
        product={deactivateTarget}
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/components/settings/ProductsCatalogSection.tsx && git commit -m "refactor(settings): extract ProductsCatalogSection component"
```

---

## Task 13: SettingsTabs component

**Files:**
- Create: `src/components/settings/SettingsTabs.tsx`

- [ ] **Step 1: Create SettingsTabs**

```tsx
// src/components/settings/SettingsTabs.tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyProfileSection } from './CompanyProfileSection';
import { ProductsCatalogSection } from './ProductsCatalogSection';
import { UsersSection } from './UsersSection';
import { AuditLogSection } from './AuditLogSection';

type TabValue = 'empresa' | 'catalogo' | 'usuarios' | 'auditoria';

const VALID_TABS: TabValue[] = ['empresa', 'catalogo', 'usuarios', 'auditoria'];

function isValidTab(v: string | null): v is TabValue {
  return VALID_TABS.includes(v as TabValue);
}

export function SettingsTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabValue = isValidTab(tabParam) ? tabParam : 'empresa';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  // Sync default tab to URL on first load
  useEffect(() => {
    if (!isValidTab(tabParam)) {
      setSearchParams({ tab: 'empresa' }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
      <TabsList className="mb-6">
        <TabsTrigger value="empresa">Empresa</TabsTrigger>
        <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
        <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
      </TabsList>
      <TabsContent value="empresa">
        <CompanyProfileSection />
      </TabsContent>
      <TabsContent value="catalogo">
        <ProductsCatalogSection />
      </TabsContent>
      <TabsContent value="usuarios">
        <UsersSection />
      </TabsContent>
      <TabsContent value="auditoria">
        <AuditLogSection />
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Python/alex" && git add src/components/settings/SettingsTabs.tsx && git commit -m "feat(settings): add SettingsTabs component"
```

---

## Task 14: Refactor Settings.tsx

Replace the entire existing Settings.tsx with a thin shell that uses SettingsTabs.

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Rewrite Settings.tsx**

```tsx
// src/pages/Settings.tsx
import { SettingsTabs } from '@/components/settings/SettingsTabs';

export default function Settings() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-poxpur-navy">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie empresa, catálogo, usuários e auditoria
        </p>
      </div>

      <SettingsTabs />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Python/alex" && pnpm typecheck 2>&1 | head -30
```

- [ ] **Step 3: Lint**

```bash
cd "c:/Python/alex" && pnpm lint 2>&1 | head -30
```

- [ ] **Step 4: Build**

```bash
cd "c:/Python/alex" && pnpm build 2>&1 | tail -20
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
cd "c:/Python/alex" && git add src/pages/Settings.tsx && git commit -m "feat(settings): expand Settings into tabs (Empresa / Catálogo / Usuários / Auditoria)"
```

---

## Task 15: Final checks, staged commits, and tag

- [ ] **Step 1: Full typecheck + lint + build**

```bash
cd "c:/Python/alex" && pnpm typecheck && pnpm lint && pnpm build
```

Expected: all green, no errors.

If lint warns about `react-refresh/only-export-components` in PeriodPicker (because of `buildPresets` export), add a disable comment at the top of `src/components/reports/PeriodPicker.tsx`:
```tsx
/* eslint-disable react-refresh/only-export-components */
```

If lint warns about `@typescript-eslint/no-explicit-any` in Reports.tsx, the disable comment at the top of that file covers it:
```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
```

- [ ] **Step 2: Create consolidated commits for hooks**

```bash
cd "c:/Python/alex" && git log --oneline | head -20
```

If individual hook commits were made, proceed. Otherwise commit all hooks together:
```bash
cd "c:/Python/alex" && git add src/hooks/useReports.ts src/hooks/useCompanySettings.ts src/hooks/useAdminUsers.ts src/hooks/useAuditLogs.ts
git commit -m "feat(data): add useReports, useCompanySettings, useAdminUsers, useAuditLogs hooks"
```

- [ ] **Step 3: Tag the release**

```bash
cd "c:/Python/alex" && git tag -a v0.5.0-onda5 -m "Onda 5 — Relatórios (Recharts) + Settings completo (empresa, usuários, auditoria)"
```

- [ ] **Step 4: Verify tag**

```bash
cd "c:/Python/alex" && git tag --list && git log --oneline | head -20
```

Expected: `v0.5.0-onda5` appears in tag list.

---

## Spec Coverage Self-Check

| Requirement | Task |
|---|---|
| useReports hook with all aggregates | Task 2 |
| PeriodPicker with all presets | Task 7 |
| Reports page replacing ComingSoonPage | Task 8 |
| 4 top metric cards | Task 8 |
| Vendas por vendedor bar chart | Task 8 |
| Pedidos por status pie chart | Task 8 |
| Faturamento mensal line chart | Task 8 |
| Funil de conversão | Task 8 |
| Produtos mais vendidos bar chart | Task 8 |
| Clientes top table | Task 8 |
| Export buttons (disabled) | Task 8 |
| Empty state for no data | Task 8 |
| useCompanySettings hook | Task 3 |
| useAdminUsers hook | Task 4 |
| useAuditLogs hook | Task 5 |
| CompanyProfileSection form | Task 9 |
| UsersSection with role/active controls | Task 10 |
| Self-protection (can't deactivate/demote self) | Task 10 |
| AuditLogSection with filters | Task 11 |
| SettingsTabs with URL deep-link | Task 13 |
| Settings.tsx refactored to tabs | Task 14 |
| shadcn Tabs installed | Task 1 |
| Typecheck + lint + build green | Task 15 |
| v0.5.0-onda5 tag | Task 15 |
