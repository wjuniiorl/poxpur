export type Database = {
  poxpur: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          email: string;
          foto_url: string | null;
          telefone: string | null;
          role: 'admin' | 'vendedor';
          presence: 'online' | 'ocupado' | 'ausente' | 'offline';
          ativo: boolean;
          ultimo_acesso_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          foto_url?: string | null;
          telefone?: string | null;
          role?: 'admin' | 'vendedor';
          presence?: 'online' | 'ocupado' | 'ausente' | 'offline';
          ativo?: boolean;
          ultimo_acesso_em?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          user_email: string | null;
          acao: string;
          recurso: string | null;
          payload: Record<string, unknown> | null;
          ip: string | null;
          user_agent: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_email?: string | null;
          acao: string;
          recurso?: string | null;
          payload?: Record<string, unknown> | null;
          ip?: string | null;
          user_agent?: string | null;
          criado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          nome: string;
          telefone: string | null;
          email: string | null;
          cidade: string | null;
          estado: string | null;
          tags: string[];
          observacoes: string | null;
          criado_por: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          telefone?: string | null;
          email?: string | null;
          cidade?: string | null;
          estado?: string | null;
          tags?: string[];
          observacoes?: string | null;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['customers']['Insert']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          sku: string;
          nome: string;
          descricao: string | null;
          preco: number;
          estoque: number;
          categoria: string | null;
          foto_url: string | null;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          sku: string;
          nome: string;
          descricao?: string | null;
          preco: number;
          estoque?: number;
          categoria?: string | null;
          foto_url?: string | null;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          numero: number;
          customer_id: string;
          seller_id: string;
          status:
            | 'pendente_aprovacao'
            | 'aprovado'
            | 'recusado'
            | 'aguardando_fabrica'
            | 'enviado'
            | 'concluido'
            | 'cancelado';
          valor_subtotal: number;
          valor_desconto: number;
          valor_frete: number;
          valor_total: number;
          forma_pagamento:
            | 'pix'
            | 'boleto'
            | 'cartao'
            | 'transferencia'
            | 'a_combinar'
            | null;
          prazo_entrega: string | null;
          observacoes: string | null;
          motivo_recusa: string | null;
          aprovado_por: string | null;
          aprovado_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          numero?: number;
          customer_id: string;
          seller_id: string;
          status?: Database['poxpur']['Tables']['orders']['Row']['status'];
          valor_subtotal?: number;
          valor_desconto?: number;
          valor_frete?: number;
          valor_total?: number;
          forma_pagamento?: Database['poxpur']['Tables']['orders']['Row']['forma_pagamento'];
          prazo_entrega?: string | null;
          observacoes?: string | null;
          motivo_recusa?: string | null;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['orders']['Insert']>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantidade: number;
          valor_unitario: number;
          valor_total: number;
          criado_em: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantidade: number;
          valor_unitario: number;
          criado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['order_items']['Insert']>;
        Relationships: [];
      };
      company_settings: {
        Row: {
          id: string;
          singleton: boolean;
          razao_social: string | null;
          nome_fantasia: string | null;
          cnpj: string | null;
          inscricao_estadual: string | null;
          endereco: string | null;
          cidade: string | null;
          estado: string | null;
          cep: string | null;
          telefone: string | null;
          email: string | null;
          logo_url: string | null;
          whatsapp_phone: string | null;
          whatsapp_token_configured: boolean;
          n8n_webhook_url: string | null;
          recebe_resumo_diario: boolean;
          hora_resumo_diario: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          singleton?: boolean;
          razao_social?: string | null;
          nome_fantasia?: string | null;
          cnpj?: string | null;
          inscricao_estadual?: string | null;
          endereco?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          telefone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          whatsapp_phone?: string | null;
          whatsapp_token_configured?: boolean;
          n8n_webhook_url?: string | null;
          recebe_resumo_diario?: boolean;
          hora_resumo_diario?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['company_settings']['Insert']>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          titulo: string;
          descricao: string | null;
          status: 'a_fazer' | 'em_andamento' | 'concluido' | 'cancelado';
          prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
          assigned_to: string | null;
          criado_por: string;
          prazo: string | null;
          vinculo_order_id: string | null;
          vinculo_customer_id: string | null;
          concluido_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          descricao?: string | null;
          status?: Database['poxpur']['Tables']['tasks']['Row']['status'];
          prioridade?: Database['poxpur']['Tables']['tasks']['Row']['prioridade'];
          assigned_to?: string | null;
          criado_por: string;
          prazo?: string | null;
          vinculo_order_id?: string | null;
          vinculo_customer_id?: string | null;
          concluido_em?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['tasks']['Insert']>;
        Relationships: [];
      };
      internal_channels: {
        Row: {
          id: string;
          nome: string | null;
          tipo: 'publico' | 'dm';
          criado_por: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          nome?: string | null;
          tipo?: 'publico' | 'dm';
          criado_por: string;
          criado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['internal_channels']['Insert']>;
        Relationships: [];
      };
      internal_channel_members: {
        Row: {
          channel_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          channel_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['internal_channel_members']['Insert']>;
        Relationships: [];
      };
      internal_messages: {
        Row: {
          id: string;
          channel_id: string;
          sender_id: string;
          conteudo: string;
          mencoes: string[];
          anexo_url: string | null;
          metadata: Record<string, unknown> | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          sender_id: string;
          conteudo: string;
          mencoes?: string[];
          anexo_url?: string | null;
          metadata?: Record<string, unknown> | null;
          criado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['internal_messages']['Insert']>;
        Relationships: [];
      };
      user_invitations: {
        Row: {
          id: string;
          email: string;
          nome: string | null;
          role: 'admin' | 'vendedor';
          token: string;
          status: 'pendente' | 'aceito' | 'expirado' | 'cancelado';
          invited_by: string;
          accepted_user_id: string | null;
          expires_at: string;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          email: string;
          nome?: string | null;
          role?: 'admin' | 'vendedor';
          token?: string;
          status?: 'pendente' | 'aceito' | 'expirado' | 'cancelado';
          invited_by: string;
          accepted_user_id?: string | null;
          expires_at?: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['user_invitations']['Insert']>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          customer_id: string | null;
          customer_phone: string | null;
          customer_nome_snapshot: string | null;
          canal: 'whatsapp' | 'manual';
          status: 'aberta' | 'arquivada';
          assigned_to: string | null;
          ultima_mensagem_em: string | null;
          ultima_mensagem_preview: string | null;
          nao_lidas: number;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          customer_phone?: string | null;
          customer_nome_snapshot?: string | null;
          canal?: 'whatsapp' | 'manual';
          status?: 'aberta' | 'arquivada';
          assigned_to?: string | null;
          ultima_mensagem_em?: string | null;
          ultima_mensagem_preview?: string | null;
          nao_lidas?: number;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['conversations']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_type: 'cliente' | 'vendedor' | 'sistema';
          sender_id: string | null;
          tipo: 'texto' | 'imagem' | 'audio' | 'documento' | 'localizacao' | 'template';
          conteudo: string;
          anexo_url: string | null;
          media_mime: string | null;
          media_filename: string | null;
          reactions: Array<{ by: string; emoji: string; at: string }>;
          metadata: Record<string, unknown> | null;
          whatsapp_message_id: string | null;
          lida: boolean;
          criado_em: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_type: 'cliente' | 'vendedor' | 'sistema';
          sender_id?: string | null;
          tipo?: 'texto' | 'imagem' | 'audio' | 'documento' | 'localizacao' | 'template';
          conteudo: string;
          anexo_url?: string | null;
          media_mime?: string | null;
          media_filename?: string | null;
          reactions?: Array<{ by: string; emoji: string; at: string }>;
          metadata?: Record<string, unknown> | null;
          whatsapp_message_id?: string | null;
          lida?: boolean;
          criado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          tipo:
            | 'pedido_pendente_aprovacao'
            | 'pedido_aprovado'
            | 'pedido_recusado'
            | 'pedido_aguardando_fabrica'
            | 'pedido_enviado'
            | 'pedido_concluido';
          titulo: string;
          mensagem: string;
          link: string | null;
          payload: Record<string, unknown> | null;
          lida: boolean;
          lida_em: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tipo: Database['poxpur']['Tables']['notifications']['Row']['tipo'];
          titulo: string;
          mensagem: string;
          link?: string | null;
          payload?: Record<string, unknown> | null;
          lida?: boolean;
          lida_em?: string | null;
          criado_em?: string;
        };
        Update: Partial<Database['poxpur']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      upsert_message_reaction: {
        Args: { p_whatsapp_message_id: string; p_by: string; p_emoji: string };
        Returns: void;
      };
    };
    Enums: {
      user_role: 'admin' | 'vendedor';
      presence_status: 'online' | 'ocupado' | 'ausente' | 'offline';
      order_status:
        | 'pendente_aprovacao'
        | 'aprovado'
        | 'recusado'
        | 'aguardando_fabrica'
        | 'enviado'
        | 'concluido'
        | 'cancelado';
      payment_method: 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'a_combinar';
      notification_type:
        | 'pedido_pendente_aprovacao'
        | 'pedido_aprovado'
        | 'pedido_recusado'
        | 'pedido_aguardando_fabrica'
        | 'pedido_enviado'
        | 'pedido_concluido';
      task_status: 'a_fazer' | 'em_andamento' | 'concluido' | 'cancelado';
      task_priority: 'baixa' | 'media' | 'alta' | 'urgente';
      channel_type: 'publico' | 'dm';
      conversation_channel: 'whatsapp' | 'manual';
      conversation_status: 'aberta' | 'arquivada';
      message_sender_type: 'cliente' | 'vendedor' | 'sistema';
      message_type: 'texto' | 'imagem' | 'audio' | 'documento' | 'localizacao' | 'template';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type PoxpurProfile = Database['poxpur']['Tables']['profiles']['Row'];
export type PoxpurProfileInsert = Database['poxpur']['Tables']['profiles']['Insert'];
export type PoxpurAuditLog = Database['poxpur']['Tables']['audit_logs']['Row'];
export type PoxpurAuditLogInsert = Database['poxpur']['Tables']['audit_logs']['Insert'];
export type PoxpurCustomer = Database['poxpur']['Tables']['customers']['Row'];
export type PoxpurCustomerInsert = Database['poxpur']['Tables']['customers']['Insert'];
export type PoxpurProduct = Database['poxpur']['Tables']['products']['Row'];
export type PoxpurProductInsert = Database['poxpur']['Tables']['products']['Insert'];
export type PoxpurOrder = Database['poxpur']['Tables']['orders']['Row'];
export type PoxpurOrderInsert = Database['poxpur']['Tables']['orders']['Insert'];
export type PoxpurOrderItem = Database['poxpur']['Tables']['order_items']['Row'];
export type PoxpurOrderItemInsert = Database['poxpur']['Tables']['order_items']['Insert'];
export type PoxpurNotification = Database['poxpur']['Tables']['notifications']['Row'];
export type PoxpurNotificationInsert = Database['poxpur']['Tables']['notifications']['Insert'];
export type UserRole = Database['poxpur']['Enums']['user_role'];
export type PresenceStatus = Database['poxpur']['Enums']['presence_status'];
export type OrderStatus = Database['poxpur']['Enums']['order_status'];
export type PaymentMethod = Database['poxpur']['Enums']['payment_method'];
export type NotificationType = Database['poxpur']['Enums']['notification_type'];
export type PoxpurConversation = Database['poxpur']['Tables']['conversations']['Row'];
export type PoxpurConversationInsert = Database['poxpur']['Tables']['conversations']['Insert'];
export type PoxpurMessage = Database['poxpur']['Tables']['messages']['Row'];
export type PoxpurMessageInsert = Database['poxpur']['Tables']['messages']['Insert'];
export type ConversationChannel = Database['poxpur']['Enums']['conversation_channel'];
export type ConversationStatus = Database['poxpur']['Enums']['conversation_status'];
export type MessageSenderType = Database['poxpur']['Enums']['message_sender_type'];
export type MessageType = Database['poxpur']['Enums']['message_type'];

export type PoxpurCompanySettings = Database['poxpur']['Tables']['company_settings']['Row'];
export type PoxpurCompanySettingsInsert = Database['poxpur']['Tables']['company_settings']['Insert'];
export type PoxpurTask = Database['poxpur']['Tables']['tasks']['Row'];
export type PoxpurTaskInsert = Database['poxpur']['Tables']['tasks']['Insert'];
export type PoxpurInternalChannel = Database['poxpur']['Tables']['internal_channels']['Row'];
export type PoxpurInternalChannelInsert = Database['poxpur']['Tables']['internal_channels']['Insert'];
export type PoxpurInternalMessage = Database['poxpur']['Tables']['internal_messages']['Row'];
export type PoxpurInternalMessageInsert = Database['poxpur']['Tables']['internal_messages']['Insert'];
export type PoxpurUserInvitation = Database['poxpur']['Tables']['user_invitations']['Row'];
export type PoxpurUserInvitationInsert = Database['poxpur']['Tables']['user_invitations']['Insert'];
export type TaskStatus = Database['poxpur']['Enums']['task_status'];
export type TaskPriority = Database['poxpur']['Enums']['task_priority'];
export type ChannelType = Database['poxpur']['Enums']['channel_type'];

export type TaskWithRelations = PoxpurTask & {
  assignee: Pick<PoxpurProfile, 'id' | 'nome' | 'role'> | null;
  creator: Pick<PoxpurProfile, 'id' | 'nome'> | null;
};

export const TASK_STATUS_LABELS: Record<TaskStatus, { label: string; color: string }> = {
  a_fazer: { label: 'A fazer', color: 'bg-zinc-200 text-zinc-700' },
  em_andamento: { label: 'Em andamento', color: 'bg-blue-100 text-blue-700' },
  concluido: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
  cancelado: { label: 'Cancelado', color: 'bg-rose-100 text-rose-700' },
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-zinc-100 text-zinc-600' },
  media: { label: 'Média', color: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', color: 'bg-amber-100 text-amber-800' },
  urgente: { label: 'Urgente', color: 'bg-rose-100 text-rose-700' },
};

export type ConversationWithRelations = PoxpurConversation & {
  customer: Pick<PoxpurCustomer, 'id' | 'nome' | 'telefone' | 'email' | 'cidade' | 'estado' | 'tags' | 'observacoes'> | null;
  assignee: Pick<PoxpurProfile, 'id' | 'nome' | 'role'> | null;
};

export type OrderWithRelations = PoxpurOrder & {
  customer: Pick<PoxpurCustomer, 'id' | 'nome' | 'telefone' | 'email'> | null;
  seller: Pick<PoxpurProfile, 'id' | 'nome' | 'role'> | null;
  items?: (PoxpurOrderItem & { product: Pick<PoxpurProduct, 'id' | 'nome' | 'sku'> | null })[];
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  pendente_aprovacao: { label: 'Pendente aprovação', color: 'bg-amber-100 text-amber-800' },
  aprovado: { label: 'Aprovado', color: 'bg-poxpur-green/15 text-poxpur-green-dark' },
  recusado: { label: 'Recusado', color: 'bg-rose-100 text-rose-700' },
  aguardando_fabrica: { label: 'Aguardando fábrica', color: 'bg-blue-100 text-blue-700' },
  enviado: { label: 'Enviado', color: 'bg-purple-100 text-purple-700' },
  concluido: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
  cancelado: { label: 'Cancelado', color: 'bg-zinc-200 text-zinc-700' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  a_combinar: 'A combinar',
};
