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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_badge: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity: string | null
          entity_id: string | null
          hash: string
          id: number
          prev_hash: string
        }
        Insert: {
          action: string
          actor_badge?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          hash: string
          id?: number
          prev_hash: string
        }
        Update: {
          action?: string
          actor_badge?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          hash?: string
          id?: number
          prev_hash?: string
        }
        Relationships: []
      }
      breach_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          reporter_id: string
          severity: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          reporter_id?: string
          severity: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          reporter_id?: string
          severity?: string
        }
        Relationships: []
      }
      incident_events: {
        Row: {
          by_badge: string
          created_at: string
          id: number
          incident_id: string
          stage: string
        }
        Insert: {
          by_badge: string
          created_at?: string
          id?: number
          incident_id: string
          stage: string
        }
        Update: {
          by_badge?: string
          created_at?: string
          id?: number
          incident_id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          contact_id: string
          created_at: string
          dispatched: boolean
          id: string
          label: string
          officer_badge: string
          officer_id: string
          stage: string
          threat: string
          zone: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          dispatched?: boolean
          id?: string
          label: string
          officer_badge?: string
          officer_id?: string
          stage?: string
          threat: string
          zone: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          dispatched?: boolean
          id?: string
          label?: string
          officer_badge?: string
          officer_id?: string
          stage?: string
          threat?: string
          zone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          badge: string
          created_at: string
          full_name: string
          id: string
          rank: string
          station: string
        }
        Insert: {
          approved?: boolean
          badge: string
          created_at?: string
          full_name: string
          id: string
          rank: string
          station: string
        }
        Update: {
          approved?: boolean
          badge?: string
          created_at?: string
          full_name?: string
          id?: string
          rank?: string
          station?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          category: string | null
          created_at: string
          doc_masked: string
          id: string
          lawful_purpose: string
          match_score: number | null
          nationality: string
          officer_badge: string
          officer_id: string
          outcome: string
          reason: string
          station: string
          subject_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          doc_masked: string
          id?: string
          lawful_purpose?: string
          match_score?: number | null
          nationality: string
          officer_badge?: string
          officer_id?: string
          outcome: string
          reason: string
          station: string
          subject_name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          doc_masked?: string
          id?: string
          lawful_purpose?: string
          match_score?: number | null
          nationality?: string
          officer_badge?: string
          officer_id?: string
          outcome?: string
          reason?: string
          station?: string
          subject_name?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          info_officer_email: string
          info_officer_name: string
          info_officer_phone: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          id?: number
          info_officer_email?: string
          info_officer_name?: string
          info_officer_phone?: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          id?: number
          info_officer_email?: string
          info_officer_name?: string
          info_officer_phone?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
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
      admin_set_officer: {
        Args: {
          _approved: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_update_settings: {
        Args: {
          _email: string
          _name: string
          _phone: string
          _retention: number
        }
        Returns: undefined
      }
      advance_incident: {
        Args: { _id: string; _stage: string }
        Returns: undefined
      }
      audit_payload: {
        Args: { r: Database["public"]["Tables"]["audit_log"]["Row"] }
        Returns: string
      }
      dsr_correct: {
        Args: {
          _id: string
          _name: string
          _nationality: string
          _reason: string
        }
        Returns: undefined
      }
      dsr_lookup: {
        Args: { _query: string; _reason: string }
        Returns: {
          category: string | null
          created_at: string
          doc_masked: string
          id: string
          lawful_purpose: string
          match_score: number | null
          nationality: string
          officer_badge: string
          officer_id: string
          outcome: string
          reason: string
          station: string
          subject_name: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scans"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active: { Args: { _user_id: string }; Returns: boolean }
      is_supervisor: { Args: { _user_id: string }; Returns: boolean }
      log_event: {
        Args: {
          _action: string
          _details?: Json
          _entity?: string
          _entity_id?: string
        }
        Returns: undefined
      }
      mask_doc: { Args: { _d: string }; Returns: string }
      purge_expired: { Args: never; Returns: Json }
      register_profile: {
        Args: {
          _badge: string
          _full_name: string
          _rank: string
          _station: string
        }
        Returns: {
          approved: boolean
          badge: string
          created_at: string
          full_name: string
          id: string
          rank: string
          station: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retention_status: { Args: never; Returns: Json }
      verify_audit_chain: {
        Args: never
        Returns: {
          broken_id: number
          checked: number
          ok: boolean
        }[]
      }
      write_audit: {
        Args: {
          _action: string
          _details: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "officer" | "supervisor" | "admin"
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
    Enums: {
      app_role: ["officer", "supervisor", "admin"],
    },
  },
} as const
