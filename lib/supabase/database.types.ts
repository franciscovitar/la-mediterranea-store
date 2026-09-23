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
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          color_key: string
          product_id: string
          size: string
          stock: number
          updated_at: string
        }
        Insert: {
          color_key?: string
          product_id: string
          size?: string
          stock: number
          updated_at?: string
        }
        Update: {
          color_key?: string
          product_id?: string
          size?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color_key: string | null
          color_label: string | null
          id: string
          line_total: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          size: string | null
          unit_price: number
        }
        Insert: {
          color_key?: string | null
          color_label?: string | null
          id?: string
          line_total: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          size?: string | null
          unit_price: number
        }
        Update: {
          color_key?: string | null
          color_label?: string | null
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          size?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          buyer_notes: string | null
          buyer_phone: string | null
          fulfillment_method: string | null
          checkout_request_id: string
          created_at: string
          currency: string
          id: string
          mp_checkout_url: string | null
          mp_order_id: string | null
          provider_status: string | null
          provider_status_detail: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_notes?: string | null
          buyer_phone?: string | null
          fulfillment_method?: string | null
          checkout_request_id: string
          created_at?: string
          currency?: string
          id?: string
          mp_checkout_url?: string | null
          mp_order_id?: string | null
          provider_status?: string | null
          provider_status_detail?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_notes?: string | null
          buyer_phone?: string | null
          fulfillment_method?: string | null
          checkout_request_id?: string
          created_at?: string
          currency?: string
          id?: string
          mp_checkout_url?: string | null
          mp_order_id?: string | null
          provider_status?: string | null
          provider_status_detail?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_notifications: {
        Row: {
          created_at: string
          kind: string
          last_error: string | null
          order_id: string
          provider_email_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          kind: string
          last_error?: string | null
          order_id: string
          provider_email_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          kind?: string
          last_error?: string | null
          order_id?: string
          provider_email_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          order_id: string | null
          payload: Json
          processed_at: string | null
          provider_event_id: string
          provider_order_id: string
          received_at: string
        }
        Insert: {
          order_id?: string | null
          payload: Json
          processed_at?: string | null
          provider_event_id: string
          provider_order_id: string
          received_at?: string
        }
        Update: {
          order_id?: string | null
          payload?: Json
          processed_at?: string | null
          provider_event_id?: string
          provider_order_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colors: {
        Row: {
          image: string
          key: string
          label: string
          product_id: string
          sort_order: number
          swatch: string
        }
        Insert: {
          image: string
          key: string
          label: string
          product_id: string
          sort_order?: number
          swatch: string
        }
        Update: {
          image?: string
          key?: string
          label?: string
          product_id?: string
          sort_order?: number
          swatch?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          product_id: string
          size: string
          sort_order: number
        }
        Insert: {
          product_id: string
          size: string
          sort_order?: number
        }
        Update: {
          product_id?: string
          size?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string
          id: string
          image: string
          name: string
          note: string | null
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          description?: string
          id: string
          image: string
          name: string
          note?: string | null
          price: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          image?: string
          name?: string
          note?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_mercadopago_order_event: {
        Args: {
          p_event_id: string
          p_external_reference: string
          p_mp_order_id: string
          p_payload: Json
          p_status: string
          p_status_detail: string
          p_total_paid: number
        }
        Returns: string
      }
      claim_order_notification: {
        Args: { p_kind: string; p_order_id: string }
        Returns: boolean
      }
      complete_order_notification: {
        Args: { p_kind: string; p_order_id: string; p_provider_email_id: string }
        Returns: boolean
      }
      create_checkout_order: {
        Args: { p_buyer_email?: string; p_items: Json; p_request_id: string }
        Returns: {
          checkout_url: string
          order_id: string
          provider_order_id: string
          total_amount: number
        }[]
      }
      create_checkout_order_v2: {
        Args: {
          p_buyer_email?: string
          p_buyer_name: string
          p_buyer_notes?: string
          p_buyer_phone: string
          p_fulfillment_method: string
          p_items: Json
          p_request_id: string
        }
        Returns: {
          checkout_url: string
          order_id: string
          provider_order_id: string
          total_amount: number
        }[]
      }
      fail_order_notification: {
        Args: { p_error: string; p_kind: string; p_order_id: string }
        Returns: boolean
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

