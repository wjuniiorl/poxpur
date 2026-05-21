import { ComingSoonPage } from '@/components/common/ComingSoonPage';

export default function Customers() {
  return (
    <ComingSoonPage
      feature="Clientes"
      onda={2}
      bullets={[
        'Lista e grid de clientes com filtros',
        'Página de detalhes com timeline (pedidos + conversas)',
        'Gráfico de compras por mês',
        'Tags customizáveis',
        'Importação e exportação CSV',
      ]}
    />
  );
}
