import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentOrdersMock } from '@/components/dashboard/RecentOrdersMock';
import { SellerRankingMock } from '@/components/dashboard/SellerRankingMock';
import { Card } from '@/components/ui/card';
import { mockStats } from '@/lib/mocks';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dateBR() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = useIsAdmin();
  const firstName = profile?.nome.split(' ')[0] ?? '';

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Saudação */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-poxpur-navy">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu desempenho</p>
        </div>
        <div className="text-sm text-muted-foreground">Hoje: {dateBR()}</div>
      </div>

      {/* StatsCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mockStats.map((s) => (
          <StatsCard key={s.label} stat={s} />
        ))}
      </div>

      {/* Grid principal */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-h-0 flex-col gap-4 lg:col-span-2">
          <RecentOrdersMock />
          <Card className="p-5 shadow-soft">
            <h3 className="mb-2 text-base font-semibold text-poxpur-navy">
              Próximos passos do produto
            </h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>
                • Chat WhatsApp (Onda 3) — atendimento e modal "Criar Pedido" a partir da
                conversa
              </li>
              <li>• Tarefas e Equipe (Onda 4) — gestão interna sem celular ou ramal</li>
              <li>• Relatórios e Configurações (Onda 5) — analytics + onboarding wizard</li>
            </ul>
          </Card>
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          {isAdmin && <SellerRankingMock />}
          {!isAdmin && (
            <Card className="p-5 shadow-soft">
              <h3 className="mb-2 text-base font-semibold text-poxpur-navy">Seu desempenho</h3>
              <p className="text-sm text-muted-foreground">
                Quando a Onda 2 entrar, seus pedidos e métricas pessoais aparecem aqui.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
