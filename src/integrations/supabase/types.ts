export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bot_logs: {
        Row: {
          bot_id: string
          context: Json | null
          criado_em: string
          id: string
          level: string
          message: string | null
        }
        Insert: {
          bot_id: string
          context?: Json | null
          criado_em?: string
          id?: string
          level?: string
          message?: string | null
        }
        Update: {
          bot_id?: string
          context?: Json | null
          criado_em?: string
          id?: string
          level?: string
          message?: string | null
        }
        Relationships: []
      }
      bot_status: {
        Row: {
          bot_id: string
          last_heartbeat: string
          last_message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bot_id: string
          last_heartbeat?: string
          last_message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bot_id?: string
          last_heartbeat?: string
          last_message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pedidos_pendentes: {
        Row: {
          cartao_material: string | null
          cliente_email: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          codigo_pedido_cliente: string | null
          condicao_parcelas: number | null
          cpf: string | null
          criado_em: string
          endereco: Json | null
          id: string
          itens: Json | null
          link_pagamento: string | null
          observacao: string | null
          operadora: string | null
          pin_duepay: string | null
          processado_em: string | null
          shopify_order_id: string | null
          shopify_order_number: string | null
          status: string
          valor_total: number | null
        }
        Insert: {
          cartao_material?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          codigo_pedido_cliente?: string | null
          condicao_parcelas?: number | null
          cpf?: string | null
          criado_em?: string
          endereco?: Json | null
          id?: string
          itens?: Json | null
          link_pagamento?: string | null
          observacao?: string | null
          operadora?: string | null
          pin_duepay?: string | null
          processado_em?: string | null
          shopify_order_id?: string | null
          shopify_order_number?: string | null
          status?: string
          valor_total?: number | null
        }
        Update: {
          cartao_material?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          codigo_pedido_cliente?: string | null
          condicao_parcelas?: number | null
          cpf?: string | null
          criado_em?: string
          endereco?: Json | null
          id?: string
          itens?: Json | null
          link_pagamento?: string | null
          observacao?: string | null
          operadora?: string | null
          pin_duepay?: string | null
          processado_em?: string | null
          shopify_order_id?: string | null
          shopify_order_number?: string | null
          status?: string
          valor_total?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      bot_status_view: {
        Row: {
          bot_id: string | null
          last_heartbeat: string | null
          last_message: string | null
          offline: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          bot_id?: string | null
          last_heartbeat?: string | null
          last_message?: string | null
          offline?: never
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          bot_id?: string | null
          last_heartbeat?: string | null
          last_message?: string | null
          offline?: never
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
