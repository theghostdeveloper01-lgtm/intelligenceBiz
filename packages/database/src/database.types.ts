/**
 * Hand-written to match supabase/migrations, in the shape
 * `supabase gen types typescript` produces. Once a live Supabase project
 * exists, regenerate with that command and this file becomes its build
 * target instead of a manual mirror.
 */

export type ConnectionType = "unofficial_baileys" | "official_cloud_api";
export type WhatsappConnectionStatus =
  | "pending_qr"
  | "connecting"
  | "connected"
  | "disconnected"
  | "logged_out";
export type UserRole = "owner" | "admin" | "agent";
export type ConversationStatus = "open" | "human_takeover" | "closed";
export type MessageDirection = "inbound" | "outbound";
export type MessageSenderType = "customer" | "ai_agent" | "human_agent";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";
export type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type LlmProvider = "anthropic" | "openai" | "deepseek";

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_connections: {
        Row: {
          id: string;
          tenant_id: string;
          phone_number: string | null;
          connection_type: ConnectionType;
          status: WhatsappConnectionStatus;
          session_storage_path: string | null;
          session_updated_at: string | null;
          last_connected_at: string | null;
          last_disconnect_reason: string | null;
          qr_data: string | null;
          qr_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          phone_number?: string | null;
          connection_type?: ConnectionType;
          status?: WhatsappConnectionStatus;
          session_storage_path?: string | null;
          session_updated_at?: string | null;
          last_connected_at?: string | null;
          last_disconnect_reason?: string | null;
          qr_data?: string | null;
          qr_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["whatsapp_connections"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          tenant_id: string;
          whatsapp_connection_id: string | null;
          customer_phone: string;
          customer_name: string | null;
          status: ConversationStatus;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          whatsapp_connection_id?: string | null;
          customer_phone: string;
          customer_name?: string | null;
          status?: ConversationStatus;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "conversations_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_whatsapp_connection_id_fkey";
            columns: ["whatsapp_connection_id"];
            referencedRelation: "whatsapp_connections";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          tenant_id: string;
          conversation_id: string;
          direction: MessageDirection;
          sender_type: MessageSenderType;
          content: Record<string, unknown>;
          external_message_id: string | null;
          status: MessageStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          conversation_id: string;
          direction: MessageDirection;
          sender_type: MessageSenderType;
          content: Record<string, unknown>;
          external_message_id?: string | null;
          status?: MessageStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_configs: {
        Row: {
          id: string;
          tenant_id: string;
          persona_name: string;
          system_prompt: string;
          knowledge_base: unknown[];
          is_active: boolean;
          llm_provider: LlmProvider;
          llm_model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          persona_name?: string;
          system_prompt?: string;
          knowledge_base?: unknown[];
          is_active?: boolean;
          llm_provider?: LlmProvider;
          llm_model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_configs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "agent_configs_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          plan: SubscriptionPlan;
          status: SubscriptionStatus;
          current_period_end: string | null;
          billing_provider: string | null;
          billing_customer_id: string | null;
          billing_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          billing_provider?: string | null;
          billing_customer_id?: string | null;
          billing_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
