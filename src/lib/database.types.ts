// Auto-generated Supabase types - updated from remote database
// Run: supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      distance_matrix: {
        Row: {
          distance_km: number
          fee: number
          from_village: string
          id: string
          to_village: string
        }
        Insert: {
          distance_km: number
          fee?: number
          from_village: string
          id?: string
          to_village: string
        }
        Update: {
          distance_km?: number
          fee?: number
          from_village?: string
          id?: string
          to_village?: string
        }
        Relationships: []
      }
      driver_financial_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          driver_id: string
          id: string
          notes: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          driver_id: string
          id?: string
          notes?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          driver_id?: string
          id?: string
          notes?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_financial_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_financial_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          customer_phone: string | null
          id: string
          is_read: boolean | null
          message: string
          order_id: string | null
          target_role: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          customer_phone?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          order_id?: string | null
          target_role?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          customer_phone?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          order_id?: string | null
          target_role?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_total: number
          name: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
          selected_extras: string[] | null
          selected_variant: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_total: number
          name: string
          order_id: string
          price: number
          product_id?: string | null
          quantity?: number
          selected_extras?: string[] | null
          selected_variant?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_total?: number
          name?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          selected_extras?: string[] | null
          selected_variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          admin_fee: number
          charged_distance: number
          created_at: string
          customer_name: string
          customer_phone: string
          customer_village: string
          delivery_data: Json | null
          delivery_fee: number
          distance: number
          driver_id: string | null
          driver_name: string | null
          final_payment_amount: number | null
          id: string
          is_delivery_service: boolean
          is_manual_order: boolean
          outlet_id: string
          outlet_name: string
          payment_method: string
          payment_proof_url: string | null
          payment_provider: string | null
          payment_status: string | null
          service_fee: number
          status: string
          subtotal: number
          total: number
          unique_payment_code: number | null
          updated_at: string
        }
        Insert: {
          address: string
          admin_fee?: number
          charged_distance: number
          created_at?: string
          customer_name: string
          customer_phone: string
          customer_village: string
          delivery_data?: Json | null
          delivery_fee: number
          distance: number
          driver_id?: string | null
          driver_name?: string | null
          final_payment_amount?: number | null
          id: string
          is_delivery_service?: boolean
          is_manual_order?: boolean
          outlet_id: string
          outlet_name: string
          payment_method: string
          payment_proof_url?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          service_fee: number
          status?: string
          subtotal: number
          total: number
          unique_payment_code?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          admin_fee?: number
          charged_distance?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string
          customer_village?: string
          delivery_data?: Json | null
          delivery_fee?: number
          distance?: number
          driver_id?: string | null
          driver_name?: string | null
          final_payment_amount?: number | null
          id?: string
          is_delivery_service?: boolean
          is_manual_order?: boolean
          outlet_id?: string
          outlet_name?: string
          payment_method?: string
          payment_proof_url?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          service_fee?: number
          status?: string
          subtotal?: number
          total?: number
          unique_payment_code?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          is_open: boolean
          name: string
          updated_at: string
          village: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_open?: boolean
          name: string
          updated_at?: string
          village: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_open?: boolean
          name?: string
          updated_at?: string
          village?: string
        }
        Relationships: []
      }
      payment_accounts: {
        Row: {
          account_name: string
          account_number: string
          created_at: string
          id: string
          is_active: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_extras: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_extras_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          name: string
          price_adjustment: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_adjustment?: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_adjustment?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          discount_price: number | null
          id: string
          image_url: string | null
          is_available: boolean
          is_best_seller: boolean | null
          is_recommended: boolean | null
          name: string
          outlet_id: string
          price: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_best_seller?: boolean | null
          is_recommended?: boolean | null
          name: string
          outlet_id: string
          price: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_best_seller?: boolean | null
          is_recommended?: boolean | null
          name?: string
          outlet_id?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_online: boolean | null
          name: string
          phone: string | null
          photo_url: string | null
          role: string
          updated_at: string
          village: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          is_online?: boolean | null
          name: string
          phone?: string | null
          photo_url?: string | null
          role: string
          updated_at?: string
          village?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_online?: boolean | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: string
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_driver_to_order: {
        Args: { p_driver_id: string; p_driver_name: string; p_order_id: string }
        Returns: string
      }
      create_order: {
        Args: {
          p_address: string
          p_admin_fee: number
          p_charged_distance: number
          p_customer_name: string
          p_customer_phone: string
          p_customer_village: string
          p_delivery_fee: number
          p_distance: number
          p_final_payment_amount: number
          p_is_delivery_service: boolean
          p_is_manual_order: boolean
          p_items: Json
          p_order_id: string
          p_outlet_id: string
          p_outlet_name: string
          p_payment_method: string
          p_payment_provider: string
          p_payment_status: string
          p_service_fee: number
          p_status: string
          p_subtotal: number
          p_total: number
          p_unique_payment_code: number
        }
        Returns: string
      }
      delete_driver: { Args: { p_driver_id: string }; Returns: undefined }
      delete_order: { Args: { p_order_id: string }; Returns: undefined }
      reject_order: { Args: { p_order_id: string }; Returns: string }
      set_user_admin: { Args: { user_email: string }; Returns: undefined }
      update_driver_balance: {
        Args: { p_amount: number; p_driver_id: string }
        Returns: undefined
      }
      update_order_payment: {
        Args: {
          p_order_id: string
          p_payment_proof_url?: string
          p_payment_status?: string
        }
        Returns: undefined
      }
      update_order_status: {
        Args: {
          p_driver_id?: string
          p_driver_name?: string
          p_order_id: string
          p_status: string
        }
        Returns: undefined
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
