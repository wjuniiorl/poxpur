import { ComingSoonPage } from '@/components/common/ComingSoonPage';

export default function Reports() {
  return (
    <ComingSoonPage
      feature="Relatórios"
      onda={5}
      bullets={[
        'Vendas por vendedor (ranking)',
        'Faturamento mensal com comparativo ano anterior',
        'Funil de conversão (chat → pedido → aprovado → entregue)',
        'Produtos mais vendidos e clientes top',
        'Exportação PDF/Excel de cada relatório',
      ]}
    />
  );
}
