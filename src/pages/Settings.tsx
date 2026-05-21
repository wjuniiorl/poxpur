import { ComingSoonPage } from '@/components/common/ComingSoonPage';

export default function Settings() {
  return (
    <ComingSoonPage
      feature="Configurações"
      onda={5}
      bullets={[
        'Perfil da empresa (logo, CNPJ, contatos)',
        'Convidar e gerenciar funcionários',
        'Catálogo de produtos CRUD',
        'Templates de mensagens WhatsApp',
        'Integrações n8n e Meta API',
        'Log de auditoria',
      ]}
    />
  );
}
