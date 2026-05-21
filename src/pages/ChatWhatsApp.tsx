import { ComingSoonPage } from '@/components/common/ComingSoonPage';

export default function ChatWhatsApp() {
  return (
    <ComingSoonPage
      feature="Chat WhatsApp"
      onda={3}
      bullets={[
        'Integração com WhatsApp Business Cloud API',
        'Layout 3 colunas (conversas + thread + perfil cliente)',
        'Modal especial "Criar Pedido a partir do chat"',
        'Templates Meta para mensagens iniciadas',
        'Notificações n8n para o admin (tempo real e resumo diário)',
      ]}
    />
  );
}
