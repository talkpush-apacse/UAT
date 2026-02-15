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
      projects: {
        Row: {
          id: string
          slug: string
          company_name: string
          test_scenario: string | null
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          company_name: string
          test_scenario?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          company_name?: string
          test_scenario?: string | null
          created_at?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          id: string
          project_id: string
          step_number: number
          path: string | null
          actor: string
          action: string
          view_sample: string | null
          crm_module: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          project_id: string
          step_number: number
          path?: string | null
          actor: string
          action: string
          view_sample?: string | null
          crm_module?: string | null
          sort_order?: number
        }
        Update: {
          id?: string
          project_id?: string
          step_number?: number
          path?: string | null
          actor?: string
          action?: string
          view_sample?: string | null
          crm_module?: string | null
          sort_order?: number
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
      testers: {
        Row: {
          id: string
          project_id: string
          name: string
          email: string
          mobile: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          email: string
          mobile: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          email?: string
          mobile?: string
          created_at?: string
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
      responses: {
        Row: {
          id: string
          tester_id: string
          checklist_item_id: string
          status: string | null
          comment: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          tester_id: string
          checklist_item_id: string
          status?: string | null
          comment?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          tester_id?: string
          checklist_item_id?: string
          status?: string | null
          comment?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_tester_id_fkey"
            columns: ["tester_id"]
            isOneToOne: false
            referencedRelation: "testers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          id: string
          response_id: string
          file_name: string
          file_url: string
          file_size: number
          mime_type: string
          created_at: string
        }
        Insert: {
          id?: string
          response_id: string
          file_name: string
          file_url: string
          file_size: number
          mime_type: string
          created_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          file_name?: string
          file_url?: string
          file_size?: number
          mime_type?: string
          created_at?: string
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
      signoffs: {
        Row: {
          id: string
          project_id: string
          signoff_name: string
          signoff_date: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          signoff_name: string
          signoff_date: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          signoff_name?: string
          signoff_date?: string
          created_at?: string
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
    }
    Views: {
      [_ in never]: never
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
