import { ComingSoonPage } from '@/components/common/ComingSoonPage';

export default function Tasks() {
  return (
    <ComingSoonPage
      feature="Tarefas"
      onda={4}
      bullets={[
        'Kanban (A fazer / Em andamento / Concluído) ou lista',
        'Atribuição admin → vendedor ou auto-atribuição',
        'Prioridades, checklists, anexos e comentários',
        'Vínculo opcional a pedido ou cliente',
        'Notificações automáticas em atribuição e conclusão',
      ]}
    />
  );
}
