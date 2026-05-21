// TODO Onda 2: substituir tudo aqui por queries TanStack Query reais

export type MockStat = {
  label: string;
  value: string;
  delta: number;
  deltaLabel: string;
};

export type MockOrder = {
  id: string;
  customer: string;
  seller: string;
  amount: string;
  status: 'novo' | 'em_negociacao' | 'aprovado' | 'enviado' | 'concluido' | 'cancelado';
  timeAgo: string;
};

export type MockRanking = {
  rank: number;
  seller: string;
  orders: number;
  revenue: string;
  progress: number;
};

export const mockStats: MockStat[] = [
  { label: 'Pedidos hoje', value: '12', delta: 18, deltaLabel: 'vs ontem' },
  { label: 'Faturamento do mês', value: 'R$ 24.5k', delta: 12, deltaLabel: 'vs mês anterior' },
  { label: 'Ticket médio', value: 'R$ 2.040', delta: -5, deltaLabel: 'vs mês anterior' },
  { label: 'Taxa de conversão', value: '34%', delta: 8, deltaLabel: 'vs mês anterior' },
];

export const mockRecentOrders: MockOrder[] = [
  { id: '#1234', customer: 'Distribuidora Sul Ltda', seller: 'João Silva', amount: 'R$ 1.250', status: 'novo', timeAgo: 'há 12min' },
  { id: '#1233', customer: 'Comércio Paulista', seller: 'Maria Souza', amount: 'R$ 850', status: 'aprovado', timeAgo: 'há 1h' },
  { id: '#1232', customer: 'Supermercado Bom Preço', seller: 'João Silva', amount: 'R$ 3.420', status: 'em_negociacao', timeAgo: 'há 2h' },
  { id: '#1231', customer: 'Atacado Central', seller: 'Maria Souza', amount: 'R$ 5.890', status: 'enviado', timeAgo: 'há 4h' },
  { id: '#1230', customer: 'Mercearia da Vila', seller: 'João Silva', amount: 'R$ 420', status: 'concluido', timeAgo: 'há 6h' },
];

export const mockRanking: MockRanking[] = [
  { rank: 1, seller: 'Maria Souza', orders: 18, revenue: 'R$ 8.420', progress: 100 },
  { rank: 2, seller: 'João Silva', orders: 12, revenue: 'R$ 5.150', progress: 61 },
];

export const statusLabels: Record<MockOrder['status'], { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-blue-100 text-blue-700' },
  em_negociacao: { label: 'Em negociação', color: 'bg-amber-100 text-amber-700' },
  aprovado: { label: 'Aprovado', color: 'bg-poxpur-green/10 text-poxpur-green-dark' },
  enviado: { label: 'Enviado', color: 'bg-purple-100 text-purple-700' },
  concluido: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
  cancelado: { label: 'Cancelado', color: 'bg-rose-100 text-rose-700' },
};
