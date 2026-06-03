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
      content_events: {
        Row: {
          archivo: string | null
          assignee: string | null
          client_id: string
          copy: string | null
          created_at: string
          done: boolean
          event_order: number
          frase: string | null
          id: string
          notes: string | null
          objetivo: string | null
          scheduled_date: string | null
          sheet_id: string | null
          status: string | null
          timer_running: boolean
          timer_seconds: number
          timer_started_at: number | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          archivo?: string | null
          assignee?: string | null
          client_id: string
          copy?: string | null
          created_at?: string
          done?: boolean
          event_order?: number
          frase?: string | null
          id?: string
          notes?: string | null
          objetivo?: string | null
          scheduled_date?: string | null
          sheet_id?: string | null
          status?: string | null
          timer_running?: boolean
          timer_seconds?: number
          timer_started_at?: number | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          archivo?: string | null
          assignee?: string | null
          client_id?: string
          copy?: string | null
          created_at?: string
          done?: boolean
          event_order?: number
          frase?: string | null
          id?: string
          notes?: string | null
          objetivo?: string | null
          scheduled_date?: string | null
          sheet_id?: string | null
          status?: string | null
          timer_running?: boolean
          timer_seconds?: number
          timer_started_at?: number | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          activo: boolean
          clave_secret_id: string | null
          client_order: number | null
          created_at: string
          cumpleanos: string | null
          cumpleanos2: string | null
          deleted_at: string | null
          direccion: string | null
          email: string | null
          empresa: string
          empresa_bio: string
          fecha_contacto: string
          id: string
          instagram: string | null
          latitud: number | null
          longitud: number | null
          medio: string | null
          meeting_datetime: string | null
          mes_entrada: string | null
          nombre: string
          nombre2: string | null
          objetivos: string | null
          observaciones: string | null
          plan_audiovisual: string | null
          plan_id: string | null
          proximo_seguimiento_dias: number | null
          proximo_seguimiento_fecha: string | null
          responsable1: string
          responsable2: string | null
          row_order: number | null
          rubro: string | null
          seguimiento: string | null
          servicio: string | null
          sheet_id: string | null
          sheet_stage: string | null
          source: string | null
          stage_id: string | null
          telefono: string | null
          telefono2: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          clave_secret_id?: string | null
          client_order?: number | null
          created_at?: string
          cumpleanos?: string | null
          cumpleanos2?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa?: string
          empresa_bio?: string
          fecha_contacto?: string
          id?: string
          instagram?: string | null
          latitud?: number | null
          longitud?: number | null
          medio?: string | null
          meeting_datetime?: string | null
          mes_entrada?: string | null
          nombre?: string
          nombre2?: string | null
          objetivos?: string | null
          observaciones?: string | null
          plan_audiovisual?: string | null
          plan_id?: string | null
          proximo_seguimiento_dias?: number | null
          proximo_seguimiento_fecha?: string | null
          responsable1?: string
          responsable2?: string | null
          row_order?: number | null
          rubro?: string | null
          seguimiento?: string | null
          servicio?: string | null
          sheet_id?: string | null
          sheet_stage?: string | null
          source?: string | null
          stage_id?: string | null
          telefono?: string | null
          telefono2?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          clave_secret_id?: string | null
          client_order?: number | null
          created_at?: string
          cumpleanos?: string | null
          cumpleanos2?: string | null
          deleted_at?: string | null
          direccion?: string | null
          email?: string | null
          empresa?: string
          empresa_bio?: string
          fecha_contacto?: string
          id?: string
          instagram?: string | null
          latitud?: number | null
          longitud?: number | null
          medio?: string | null
          meeting_datetime?: string | null
          mes_entrada?: string | null
          nombre?: string
          nombre2?: string | null
          objetivos?: string | null
          observaciones?: string | null
          plan_audiovisual?: string | null
          plan_id?: string | null
          proximo_seguimiento_dias?: number | null
          proximo_seguimiento_fecha?: string | null
          responsable1?: string
          responsable2?: string | null
          row_order?: number | null
          rubro?: string | null
          seguimiento?: string | null
          servicio?: string | null
          sheet_id?: string | null
          sheet_stage?: string | null
          source?: string | null
          stage_id?: string | null
          telefono?: string | null
          telefono2?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_plan_id"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      management_events: {
        Row: {
          client_id: string
          created_at: string
          datetime: string | null
          done: boolean
          id: string
          notes: string | null
          sheet_id: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          datetime?: string | null
          done?: boolean
          id?: string
          notes?: string | null
          sheet_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          datetime?: string | null
          done?: boolean
          id?: string
          notes?: string | null
          sheet_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "management_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_won: boolean
          label: string
          stage_key: string
          stage_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_won?: boolean
          label: string
          stage_key: string
          stage_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_won?: boolean
          label?: string
          stage_key?: string
          stage_order?: number
        }
        Relationships: []
      }
      plan_events: {
        Row: {
          assignee: string | null
          created_at: string
          done: boolean
          event_order: number
          frase: string | null
          id: string
          notes: string | null
          plan_id: string
          plan_slot: string | null
          scheduled_date: string | null
          sheet_id: string | null
          status: string | null
          timer_running: boolean
          timer_seconds: number
          timer_started_at: number | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          done?: boolean
          event_order?: number
          frase?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          plan_slot?: string | null
          scheduled_date?: string | null
          sheet_id?: string | null
          status?: string | null
          timer_running?: boolean
          timer_seconds?: number
          timer_started_at?: number | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          done?: boolean
          event_order?: number
          frase?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          plan_slot?: string | null
          scheduled_date?: string | null
          sheet_id?: string | null
          status?: string | null
          timer_running?: boolean
          timer_seconds?: number
          timer_started_at?: number | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          deleted_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          sheet_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          sheet_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          sheet_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      sheet_sources: {
        Row: {
          apps_script_url: string | null
          column_mapping: Json | null
          created_at: string
          enabled: boolean
          entity_type: string
          id: string
          last_synced_at: string | null
          name: string
          sheet_name: string
          sync_direction: string
          updated_at: string
        }
        Insert: {
          apps_script_url?: string | null
          column_mapping?: Json | null
          created_at?: string
          enabled?: boolean
          entity_type: string
          id?: string
          last_synced_at?: string | null
          name: string
          sheet_name: string
          sync_direction?: string
          updated_at?: string
        }
        Update: {
          apps_script_url?: string | null
          column_mapping?: Json | null
          created_at?: string
          enabled?: boolean
          entity_type?: string
          id?: string
          last_synced_at?: string | null
          name?: string
          sheet_name?: string
          sync_direction?: string
          updated_at?: string
        }
        Relationships: []
      }
      sheet_sync_runs: {
        Row: {
          direction: string
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json | null
          rows_created: number | null
          rows_errored: number | null
          rows_processed: number | null
          rows_skipped: number | null
          rows_updated: number | null
          source_id: string
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          direction: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          rows_created?: number | null
          rows_errored?: number | null
          rows_processed?: number | null
          rows_skipped?: number | null
          rows_updated?: number | null
          source_id: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          direction?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          rows_created?: number | null
          rows_errored?: number | null
          rows_processed?: number | null
          rows_skipped?: number | null
          rows_updated?: number | null
          source_id?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_sync_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sheet_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sheet_sync_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          badges: string[]
          created_at: string
          deleted_at: string | null
          direccion: string | null
          edad: string | null
          equipo: string | null
          fecha_nacimiento: string | null
          horarios: string | null
          id: string
          mail: string | null
          nombre: string
          notas: string | null
          profile_id: string | null
          roles: string | null
          sheet_id: string | null
          signo: string | null
          signo_chino: string | null
          sueno: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          badges?: string[]
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          edad?: string | null
          equipo?: string | null
          fecha_nacimiento?: string | null
          horarios?: string | null
          id?: string
          mail?: string | null
          nombre: string
          notas?: string | null
          profile_id?: string | null
          roles?: string | null
          sheet_id?: string | null
          signo?: string | null
          signo_chino?: string | null
          sueno?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          badges?: string[]
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          edad?: string | null
          equipo?: string | null
          fecha_nacimiento?: string | null
          horarios?: string | null
          id?: string
          mail?: string | null
          nombre?: string
          notas?: string | null
          profile_id?: string | null
          roles?: string | null
          sheet_id?: string | null
          signo?: string | null
          signo_chino?: string | null
          sueno?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_monthly_points: {
        Row: {
          detalles: string | null
          estado: string | null
          fecha: string
          id: string
          member_id: string
          puntos: string
        }
        Insert: {
          detalles?: string | null
          estado?: string | null
          fecha: string
          id?: string
          member_id: string
          puntos: string
        }
        Update: {
          detalles?: string | null
          estado?: string | null
          fecha?: string
          id?: string
          member_id?: string
          puntos?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_monthly_points_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_status_91: {
        Row: {
          estado: string
          id: string
          item: string
          member_id: string
          mes: string
        }
        Insert: {
          estado: string
          id?: string
          item: string
          member_id: string
          mes: string
        }
        Update: {
          estado?: string
          id?: string
          item?: string
          member_id?: string
          mes?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_status_91_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      get_lead_credentials: { Args: { p_lead_id: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      upsert_lead_from_sheet: {
        Args: { p_data: Json; p_sheet_id: string; p_stage_key: string }
        Returns: string
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
  public: {
    Enums: {},
  },
} as const

// Helpers de acceso rápido — usá estos en lugar de Database["public"]["Tables"]["x"]["Row"]
export type LeadRow = Tables<"leads">
export type LeadInsert = TablesInsert<"leads">
export type LeadUpdate = TablesUpdate<"leads">

export type TeamMemberRow = Tables<"team_members">
export type TeamMemberInsert = TablesInsert<"team_members">

export type PipelineStageRow = Tables<"pipeline_stages">

export type ContentEventRow = Tables<"content_events">
export type ManagementEventRow = Tables<"management_events">

export type PlanRow = Tables<"plans">
export type PlanEventRow = Tables<"plan_events">

export type ProfileRow = Tables<"profiles">

export type SheetSourceRow = Tables<"sheet_sources">
export type SheetSyncRunRow = Tables<"sheet_sync_runs">

export type TeamStatus91Row = Tables<"team_status_91">
export type TeamMonthlyPointRow = Tables<"team_monthly_points">
