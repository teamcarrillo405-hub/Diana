export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      ai_calls: {
        Row: {
          blocked_reason: string | null;
          cost_micros: number | null;
          created_at: string;
          feature: string;
          id: string;
          model: string;
          owner_id: string;
          prompt_summary: string | null;
          status: string;
        };
        Insert: {
          blocked_reason?: string | null;
          cost_micros?: number | null;
          created_at?: string;
          feature: string;
          id?: string;
          model: string;
          owner_id: string;
          prompt_summary?: string | null;
          status: string;
        };
        Update: {
          blocked_reason?: string | null;
          cost_micros?: number | null;
          created_at?: string;
          feature?: string;
          id?: string;
          model?: string;
          owner_id?: string;
          prompt_summary?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          class_id: string;
          created_at: string;
          description: string | null;
          difficulty: number | null;
          due_at: string | null;
          estimated_minutes: number | null;
          id: string;
          kind: AssignmentKind;
          last_thought: string | null;
          owner_id: string;
          parent_assignment_id: string | null;
          pivot_note: string | null;
          reading_load: number;
          rubric_id: string | null;
          status: string;
          submission_url: string | null;
          submitted_at: string | null;
          title: string;
          updated_at: string;
          writing_load: number;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          description?: string | null;
          difficulty?: number | null;
          due_at?: string | null;
          estimated_minutes?: number | null;
          id?: string;
          kind?: AssignmentKind;
          last_thought?: string | null;
          owner_id: string;
          parent_assignment_id?: string | null;
          pivot_note?: string | null;
          reading_load?: number;
          rubric_id?: string | null;
          status?: string;
          submission_url?: string | null;
          submitted_at?: string | null;
          title: string;
          updated_at?: string;
          writing_load?: number;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          description?: string | null;
          difficulty?: number | null;
          due_at?: string | null;
          estimated_minutes?: number | null;
          id?: string;
          kind?: AssignmentKind;
          last_thought?: string | null;
          owner_id?: string;
          parent_assignment_id?: string | null;
          pivot_note?: string | null;
          reading_load?: number;
          rubric_id?: string | null;
          status?: string;
          submission_url?: string | null;
          submitted_at?: string | null;
          title?: string;
          updated_at?: string;
          writing_load?: number;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_parent_assignment_id_fkey";
            columns: ["parent_assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "rubrics";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          archived_at: string | null;
          color: string;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          owner_id: string;
          teacher: string | null;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          color?: string;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          owner_id: string;
          teacher?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          teacher?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          accommodations: string[];
          age_bracket: string;
          consent_ai: boolean;
          consent_ai_at: string | null;
          created_at: string;
          date_of_birth: string;
          diagnoses: string[];
          display_name: string | null;
          dyslexia_font: boolean;
          extra_time_pct: number;
          font_size: FontSize;
          high_contrast: boolean;
          line_spacing: LineSpacing;
          onboarded_at: string | null;
          reduced_motion: boolean;
          school_year: number | null;
          timezone: string;
          tts_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accommodations?: string[];
          age_bracket: string;
          consent_ai?: boolean;
          consent_ai_at?: string | null;
          created_at?: string;
          date_of_birth: string;
          diagnoses?: string[];
          display_name?: string | null;
          dyslexia_font?: boolean;
          extra_time_pct?: number;
          font_size?: FontSize;
          high_contrast?: boolean;
          line_spacing?: LineSpacing;
          onboarded_at?: string | null;
          reduced_motion?: boolean;
          school_year?: number | null;
          timezone?: string;
          tts_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accommodations?: string[];
          age_bracket?: string;
          consent_ai?: boolean;
          consent_ai_at?: string | null;
          created_at?: string;
          date_of_birth?: string;
          diagnoses?: string[];
          display_name?: string | null;
          dyslexia_font?: boolean;
          extra_time_pct?: number;
          font_size?: FontSize;
          high_contrast?: boolean;
          line_spacing?: LineSpacing;
          onboarded_at?: string | null;
          reduced_motion?: boolean;
          school_year?: number | null;
          timezone?: string;
          tts_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      rubrics: {
        Row: {
          class_id: string | null;
          created_at: string;
          id: string;
          owner_id: string;
          parse_error: string | null;
          parse_status: string;
          parsed: Json | null;
          raw_text: string | null;
          source_kind: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          class_id?: string | null;
          created_at?: string;
          id?: string;
          owner_id: string;
          parse_error?: string | null;
          parse_status?: string;
          parsed?: Json | null;
          raw_text?: string | null;
          source_kind: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string | null;
          created_at?: string;
          id?: string;
          owner_id?: string;
          parse_error?: string | null;
          parse_status?: string;
          parsed?: Json | null;
          raw_text?: string | null;
          source_kind?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rubrics_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_checklist: {
        Row: {
          assignment_id: string;
          checked: boolean;
          created_at: string;
          detail: string | null;
          id: string;
          label: string;
          owner_id: string;
          position: number;
          required: boolean;
        };
        Insert: {
          assignment_id: string;
          checked?: boolean;
          created_at?: string;
          detail?: string | null;
          id?: string;
          label: string;
          owner_id: string;
          position?: number;
          required?: boolean;
        };
        Update: {
          assignment_id?: string;
          checked?: boolean;
          created_at?: string;
          detail?: string | null;
          id?: string;
          label?: string;
          owner_id?: string;
          position?: number;
          required?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "submission_checklist_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      task_signals: {
        Row: {
          assignment_id: string | null;
          id: number;
          kind: string;
          occurred_at: string;
          owner_id: string;
          value: Json | null;
        };
        Insert: {
          assignment_id?: string | null;
          id?: number;
          kind: string;
          occurred_at?: string;
          owner_id: string;
          value?: Json | null;
        };
        Update: {
          assignment_id?: string | null;
          id?: number;
          kind?: string;
          occurred_at?: string;
          owner_id?: string;
          value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "task_signals_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
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
};

export type AssignmentStatus =
  | "todo"
  | "drafting"
  | "checking"
  | "exporting"
  | "submitted"
  | "graded"
  | "abandoned";

export type AgeBracket = "under_13" | "13_to_17" | "adult";

export type AssignmentKind =
  | "essay"
  | "lab"
  | "problem_set"
  | "presentation"
  | "test_prep"
  | "reading"
  | "other";

export type FontSize = "small" | "normal" | "large" | "xlarge";
export type LineSpacing = "compact" | "normal" | "loose";

export type Diagnosis =
  | "adhd"
  | "dyslexia"
  | "dyscalculia"
  | "dysgraphia"
  | "asd"
  | "anxiety"
  | "other"
  | "none";

export type Accommodation =
  | "extended_time"
  | "reduced_quantity"
  | "alternate_format"
  | "reader"
  | "scribe"
  | "breaks"
  | "quiet_setting"
  | "other";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
