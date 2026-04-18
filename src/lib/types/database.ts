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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_review_history: {
        Row: {
          changed_at: string
          checklist_item_id: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          tester_id: string
        }
        Insert: {
          changed_at?: string
          checklist_item_id: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          tester_id: string
        }
        Update: {
          changed_at?: string
          checklist_item_id?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          tester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_review_history_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_history_tester_id_fkey"
            columns: ["tester_id"]
            isOneToOne: false
            referencedRelation: "testers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_reviews: {
        Row: {
          finding_type: string | null
          checklist_item_id: string
          created_at: string | null
          id: string
          notes: string | null
          resolution_status: string
          tester_id: string
          updated_at: string | null
        }
        Insert: {
          finding_type?: string | null
          checklist_item_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          resolution_status?: string
          tester_id: string
          updated_at?: string | null
        }
        Update: {
          finding_type?: string | null
          checklist_item_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          resolution_status?: string
          tester_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_reviews_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_reviews_tester_id_fkey"
            columns: ["tester_id"]
            isOneToOne: false
            referencedRelation: "testers"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_url: string
          id: string
          mime_type: string
          response_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_url: string
          id?: string
          mime_type: string
          response_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          mime_type?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      checklist_snapshots: {
        Row: {
          id: string
          project_id: string
          version_number: number
          label: string
          item_count: number
          snapshot_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_number: number
          label: string
          item_count?: number
          snapshot_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          version_number?: number
          label?: string
          item_count?: number
          snapshot_data?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          action: string
          actor: string
          crm_module: string | null
          id: string
          path: string | null
          project_id: string
          sort_order: number
          step_number: number
          tip: string | null
          view_sample: string | null
        }
        Insert: {
          action: string
          actor: string
          crm_module?: string | null
          id?: string
          path?: string | null
          project_id: string
          sort_order?: number
          step_number: number
          tip?: string | null
          view_sample?: string | null
        }
        Update: {
          action?: string
          actor?: string
          crm_module?: string | null
          id?: string
          path?: string | null
          project_id?: string
          sort_order?: number
          step_number?: number
          tip?: string | null
          view_sample?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_name: string
          created_at: string | null
          id: string
          slug: string
          talkpush_login_link: string | null
          test_scenario: string | null
          title: string | null
          wizard_mode: boolean
        }
        Insert: {
          company_name: string
          created_at?: string | null
          id?: string
          slug: string
          talkpush_login_link?: string | null
          test_scenario?: string | null
          title?: string | null
          wizard_mode?: boolean
        }
        Update: {
          company_name?: string
          created_at?: string | null
          id?: string
          slug?: string
          talkpush_login_link?: string | null
          test_scenario?: string | null
          title?: string | null
          wizard_mode?: boolean
        }
        Relationships: []
      }
      responses: {
        Row: {
          checklist_item_id: string
          comment: string | null
          id: string
          status: string | null
          tester_id: string
          updated_at: string | null
        }
        Insert: {
          checklist_item_id: string
          comment?: string | null
          id?: string
          status?: string | null
          tester_id: string
          updated_at?: string | null
        }
        Update: {
          checklist_item_id?: string
          comment?: string | null
          id?: string
          status?: string | null
          tester_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_tester_id_fkey"
            columns: ["tester_id"]
            isOneToOne: false
            referencedRelation: "testers"
            referencedColumns: ["id"]
          },
        ]
      }
      signoffs: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          signoff_date: string
          signoff_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          signoff_date: string
          signoff_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          signoff_date?: string
          signoff_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "signoffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      testers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          mobile: string
          name: string
          project_id: string
          test_completed: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          mobile: string
          name: string
          project_id: string
          test_completed?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          mobile?: string
          name?: string
          project_id?: string
          test_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      renumber_steps: { Args: { p_project_id: string }; Returns: undefined }
      reorder_checklist_steps: {
        Args: { p_items: Json; p_project_id: string }
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

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
