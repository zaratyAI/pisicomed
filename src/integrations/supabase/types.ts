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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      action_plans: {
        Row: {
          action_status: string | null
          action_text: string
          answer: string
          block: string
          classification: string
          completed_date: string | null
          created_at: string
          evaluation_id: string
          id: string
          observations: string | null
          planned_date: string | null
          priority: string
          question_code: string
          question_title: string
          responsible: string | null
          theme: string
        }
        Insert: {
          action_status?: string | null
          action_text: string
          answer: string
          block: string
          classification: string
          completed_date?: string | null
          created_at?: string
          evaluation_id: string
          id?: string
          observations?: string | null
          planned_date?: string | null
          priority: string
          question_code: string
          question_title: string
          responsible?: string | null
          theme: string
        }
        Update: {
          action_status?: string | null
          action_text?: string
          answer?: string
          block?: string
          classification?: string
          completed_date?: string | null
          created_at?: string
          evaluation_id?: string
          id?: string
          observations?: string | null
          planned_date?: string | null
          priority?: string
          question_code?: string
          question_title?: string
          responsible?: string | null
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          answer: string
          created_at: string
          evaluation_id: string
          id: string
          notes: string | null
          question_code: string
        }
        Insert: {
          answer: string
          created_at?: string
          evaluation_id: string
          id?: string
          notes?: string | null
          question_code: string
        }
        Update: {
          answer?: string
          created_at?: string
          evaluation_id?: string
          id?: string
          notes?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string
          created_at: string
          evaluation_id: string
          id: string
          location: string | null
          notes: string | null
          professional_id: string | null
          scheduled_date: string
          stage_code: number
          status: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          evaluation_id: string
          id?: string
          location?: string | null
          notes?: string | null
          professional_id?: string | null
          scheduled_date: string
          stage_code: number
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          evaluation_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          professional_id?: string | null
          scheduled_date?: string
          stage_code?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          access_cpf: string | null
          address: string | null
          city: string | null
          cnpj: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          employee_count: number | null
          id: string
          legal_name: string
          sector: string | null
          state: string | null
          status: string | null
          trade_name: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          access_cpf?: string | null
          address?: string | null
          city?: string | null
          cnpj: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          legal_name: string
          sector?: string | null
          state?: string | null
          status?: string | null
          trade_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          access_cpf?: string | null
          address?: string | null
          city?: string | null
          cnpj?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          employee_count?: number | null
          id?: string
          legal_name?: string
          sector?: string | null
          state?: string | null
          status?: string | null
          trade_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      company_units: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_headquarters: boolean
          state: string | null
          unit_code: string | null
          unit_name: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_headquarters?: boolean
          state?: string | null
          unit_code?: string | null
          unit_name: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_headquarters?: boolean
          state?: string | null
          unit_code?: string | null
          unit_name?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          evaluation_id: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          evaluation_id: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          evaluation_id?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          cc_email: string | null
          created_at: string
          error_message: string | null
          evaluation_id: string
          id: string
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          cc_email?: string | null
          created_at?: string
          error_message?: string | null
          evaluation_id: string
          id?: string
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          cc_email?: string | null
          created_at?: string
          error_message?: string | null
          evaluation_id?: string
          id?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          company_id: string
          created_at: string
          evaluator_id: string
          finished_at: string | null
          id: string
          pipeline_status: string
          started_at: string
          status: string
          summary_json: Json | null
          total_actions: number | null
          total_questions: number | null
          unit_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          evaluator_id: string
          finished_at?: string | null
          id?: string
          pipeline_status?: string
          started_at?: string
          status?: string
          summary_json?: Json | null
          total_actions?: number | null
          total_questions?: number | null
          unit_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          evaluator_id?: string
          finished_at?: string | null
          id?: string
          pipeline_status?: string
          started_at?: string
          status?: string
          summary_json?: Json | null
          total_actions?: number | null
          total_questions?: number | null
          unit_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "evaluators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "company_units"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluators: {
        Row: {
          cpf: string
          created_at: string
          email: string
          id: string
          name: string
          role_title: string
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          email: string
          id?: string
          name: string
          role_title: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          role_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      journey_stages: {
        Row: {
          completed_at: string | null
          created_at: string
          evaluation_id: string
          id: string
          scheduled_date: string | null
          stage_code: number
          stage_name: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          evaluation_id: string
          id?: string
          scheduled_date?: string | null
          stage_code: number
          stage_name: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          evaluation_id?: string
          id?: string
          scheduled_date?: string | null
          stage_code?: number
          stage_name?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "journey_stages_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          registration_number: string | null
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          registration_number?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          registration_number?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          admin_notes: string | null
          company_id: string
          created_at: string
          evaluation_id: string
          id: string
          proposal_link: string | null
          proposal_status: string | null
          requested_at: string
          requester_cpf: string | null
          requester_email: string
          requester_name: string
          requester_role: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          company_id: string
          created_at?: string
          evaluation_id: string
          id?: string
          proposal_link?: string | null
          proposal_status?: string | null
          requested_at?: string
          requester_cpf?: string | null
          requester_email: string
          requester_name: string
          requester_role?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          company_id?: string
          created_at?: string
          evaluation_id?: string
          id?: string
          proposal_link?: string | null
          proposal_status?: string | null
          requested_at?: string
          requester_cpf?: string | null
          requester_email?: string
          requester_name?: string
          requester_role?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          evaluation_id: string
          from_status: string | null
          id: string
          notes: string | null
          origin: string
          stage_code: number | null
          to_status: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          evaluation_id: string
          from_status?: string | null
          id?: string
          notes?: string | null
          origin?: string
          stage_code?: number | null
          to_status: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          evaluation_id?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          origin?: string
          stage_code?: number | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_audit_logs_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_permission: {
        Args: { _action: string; _user_id: string }
        Returns: boolean
      }
      create_appointment_safe: {
        Args: {
          p_appointment_type?: string
          p_changed_by?: string
          p_evaluation_id: string
          p_location?: string
          p_notes?: string
          p_professional_id?: string
          p_scheduled_date: string
          p_stage_code: number
        }
        Returns: Json
      }
      get_evaluations_paginated: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_order_by?: string
          p_order_dir?: string
          p_pipeline_status?: string
          p_search?: string
        }
        Returns: Json
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      transition_pipeline_safe: {
        Args: {
          p_changed_by?: string
          p_evaluation_id: string
          p_expected_version?: number
          p_new_status: string
          p_notes?: string
          p_origin?: string
        }
        Returns: Json
      }
      transition_stage_safe: {
        Args: {
          p_changed_by?: string
          p_evaluation_id: string
          p_expected_version?: number
          p_extra_fields?: Json
          p_new_status: string
          p_notes?: string
          p_origin?: string
          p_stage_code: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "gestor"
        | "comercial"
        | "agendamento"
        | "executor"
        | "cliente"
        | "leitura"
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
    Enums: {
      app_role: [
        "admin",
        "user",
        "gestor",
        "comercial",
        "agendamento",
        "executor",
        "cliente",
        "leitura",
      ],
    },
  },
} as const
