import { ComingSoonPage } from '@/components/common/ComingSoonPage';

export default function Orders() {
  return (
    <ComingSoonPage
      feature="Pedidos"
      onda={2}
      bullets={[
        'Kanban com drag & drop entre status',
        'Visualização em tabela com filtros e busca',
        'Fluxo de aprovação pelo admin (aprovar/recusar/editar)',
        'Verificação de estoque automática',
        'Exportação CSV e PDF',
      ]}
    />
  );
}
