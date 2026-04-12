export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
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
          quantity: number
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
      order_ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_phone: string | null
          driver_id: string | null
          driver_rating: number | null
          id: string
          order_id: string | null
          outlet_id: string | null
          outlet_rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_phone?: string | null
          driver_id?: string | null
          driver_rating?: number | null
          id?: string
          order_id?: string | null
          outlet_id?: string | null
          outlet_rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_phone?: string | null
          driver_id?: string | null
          driver_rating?: number | null
          id?: string
          order_id?: string | null
          outlet_id?: string | null
          outlet_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_ratings_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
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
          customer_latitude: number | null
          customer_longitude: number | null
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
          payment_rejection_reason: string | null
          payment_status: string | null
          service_fee: number
          status: string
          subtotal: number
          total: number
          unique_payment_code: number | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          address: string
          admin_fee?: number
          charged_distance: number
          created_at?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
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
          payment_rejection_reason?: string | null
          payment_status?: string | null
          service_fee: number
          status?: string
          subtotal: number
          total: number
          unique_payment_code?: number | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          address?: string
          admin_fee?: number
          charged_distance?: number
          created_at?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
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
          payment_rejection_reason?: string | null
          payment_status?: string | null
          service_fee?: number
          status?: string
          subtotal?: number
          total?: number
          unique_payment_code?: number | null
          updated_at?: string
          zone?: string | null
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
          latitude: number | null
          longitude: number | null
          markup_enabled: boolean | null
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
          latitude?: number | null
          longitude?: number | null
          markup_enabled?: boolean | null
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
          latitude?: number | null
          longitude?: number | null
          markup_enabled?: boolean | null
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
          markup_enabled: boolean | null
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
          markup_enabled?: boolean | null
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
          markup_enabled?: boolean | null
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
          dana_number: string | null
          email: string | null
          id: string
          is_active: boolean
          is_online: boolean | null
          last_location_update: string | null
          latitude: number | null
          longitude: number | null
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
          dana_number?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          is_online?: boolean | null
          last_location_update?: string | null
          latitude?: number | null
          longitude?: number | null
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
          dana_number?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_online?: boolean | null
          last_location_update?: string | null
          latitude?: number | null
          longitude?: number | null
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
        Args: {
          p_driver_id: string
          p_driver_name: string
          p_order_id: string
        }
        Returns: string
      }
      complete_order_with_deduction: {
        Args: {
          p_driver_id: string
          p_order_id: string
        }
        Returns: undefined
      }
      create_order: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_customer_village: string
          p_address: string
          p_outlet_id: string
          p_outlet_name: string
          p_subtotal: number
          p_distance: number
          p_charged_distance: number
          p_delivery_fee: number
          p_service_fee: number
          p_admin_fee: number
          p_total: number
          p_payment_method: string
          p_payment_provider: string | null
          p_unique_payment_code: number | null
          p_final_payment_amount: number | null
          p_payment_status: string
          p_status: string
          p_is_manual_order: boolean
          p_is_delivery_service: boolean
          p_items: Json
          p_customer_latitude: number | null
          p_customer_longitude: number | null
          p_zone: string | null
        }
        Returns: string
      }
      delete_driver: {
        Args: {
          p_driver_id: string
        }
        Returns: undefined
      }
      delete_order: {
        Args: {
          p_order_id: string
        }
        Returns: undefined
      }
      driver_reject_order: {
        Args: {
          p_driver_id: string
          p_order_id: string
        }
        Returns: undefined
      }
      reject_order: {
        Args: {
          p_order_id: string
        }
        Returns: string
      }
      set_user_admin: {
        Args: {
          user_email: string
        }
        Returns: undefined
      }
      toggle_driver_online: {
        Args: {
          p_driver_id: string
        }
        Returns: boolean
      }
      update_driver_balance: {
        Args: {
          p_amount: number
          p_driver_id: string
        }
        Returns: undefined
      }
      update_order_payment: {
        Args: {
          p_order_id: string
          p_payment_proof_url: string | null
          p_payment_status: string | null
        }
        Returns: undefined
      }
      update_order_status: {
        Args: {
          p_driver_id: string | null
          p_driver_name: string | null
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
