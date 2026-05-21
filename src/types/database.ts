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
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: 'admin' | 'vendedor';
      presence_status: 'online' | 'ocupado' | 'ausente' | 'offline';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type PoxpurProfile = Database['poxpur']['Tables']['profiles']['Row'];
export type PoxpurProfileInsert = Database['poxpur']['Tables']['profiles']['Insert'];
export type PoxpurAuditLog = Database['poxpur']['Tables']['audit_logs']['Row'];
export type PoxpurAuditLogInsert = Database['poxpur']['Tables']['audit_logs']['Insert'];
export type UserRole = Database['poxpur']['Enums']['user_role'];
export type PresenceStatus = Database['poxpur']['Enums']['presence_status'];
