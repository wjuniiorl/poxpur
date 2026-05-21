import { ComingSoonPage } from '@/components/common/ComingSoonPage';

export default function Team() {
  return (
    <ComingSoonPage
      feature="Equipe"
      onda={4}
      bullets={[
        'Chat interno entre funcionários (sem celular ou ramal)',
        'Canais públicos (Geral, Vendas, Avisos) e mensagens diretas',
        'Status de presença em tempo real',
        'Menções @nome com notificação',
        'Compartilhar pedidos e clientes como cards embutidos',
      ]}
    />
  );
}
