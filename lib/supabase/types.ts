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
      assignment_steps: {
        Row: {
          id: string;
          owner_id: string;
          assignment_id: string;
          steps: Array<{ step: number; action: string; minutes: number; done: boolean }>;
          generated_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          assignment_id: string;
          steps?: Array<{ step: number; action: string; minutes: number; done: boolean }>;
          generated_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          assignment_id?: string;
          steps?: Array<{ step: number; action: string; minutes: number; done: boolean }>;
          generated_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assignment_checklists: {
        Row: {
          id: string;
          assignment_id: string;
          owner_id: string;
          items: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          owner_id: string;
          items?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          owner_id?: string;
          items?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_checklists_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_intentions: {
        Row: {
          assignment_id: string;
          created_at: string;
          cue_text: string;
          cue_type: string;
          fired_at: string | null;
          id: string;
          owner_id: string;
          scheduled_for: string | null;
        };
        Insert: {
          assignment_id: string;
          created_at?: string;
          cue_text: string;
          cue_type: string;
          fired_at?: string | null;
          id?: string;
          owner_id: string;
          scheduled_for?: string | null;
        };
        Update: {
          assignment_id?: string;
          created_at?: string;
          cue_text?: string;
          cue_type?: string;
          fired_at?: string | null;
          id?: string;
          owner_id?: string;
          scheduled_for?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_intentions_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_templates: {
        Row: {
          id: string;
          name: string;
          kind: string;
          checklist_items: Json;
          rubric_items: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          kind: string;
          checklist_items?: Json;
          rubric_items?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          kind?: string;
          checklist_items?: Json;
          rubric_items?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      assignment_time_log: {
        Row: {
          assignment_id: string;
          edited_by_student: boolean;
          elapsed_minutes: number | null;
          ended_at: string | null;
          id: number;
          owner_id: string;
          started_at: string;
        };
        Insert: {
          assignment_id: string;
          edited_by_student?: boolean;
          elapsed_minutes?: number | null;
          ended_at?: string | null;
          id?: number;
          owner_id: string;
          started_at?: string;
        };
        Update: {
          assignment_id?: string;
          edited_by_student?: boolean;
          elapsed_minutes?: number | null;
          ended_at?: string | null;
          id?: number;
          owner_id?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_time_log_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_type_estimates: {
        Row: {
          kind: string;
          mean_minutes: number;
          n_samples: number;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          kind: string;
          mean_minutes?: number;
          n_samples?: number;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          kind?: string;
          mean_minutes?: number;
          n_samples?: number;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      flashcard_reviews: {
        Row: {
          card_id: string;
          difficulty: number;
          elapsed_days: number;
          id: number;
          lapses: number;
          owner_id: string;
          rating: number;
          reps: number;
          reviewed_at: string;
          scheduled_days: number;
          scheduled_for: string;
          stability: number;
          state: string;
        };
        Insert: {
          card_id: string;
          difficulty: number;
          elapsed_days: number;
          id?: number;
          lapses: number;
          owner_id: string;
          rating: number;
          reps: number;
          reviewed_at?: string;
          scheduled_days: number;
          scheduled_for: string;
          stability: number;
          state: string;
        };
        Update: {
          card_id?: string;
          difficulty?: number;
          elapsed_days?: number;
          id?: number;
          lapses?: number;
          owner_id?: string;
          rating?: number;
          reps?: number;
          reviewed_at?: string;
          scheduled_days?: number;
          scheduled_for?: string;
          stability?: number;
          state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "flashcards";
            referencedColumns: ["id"];
          },
        ];
      };
      flashcards: {
        Row: {
          back: string;
          created_at: string;
          difficulty: number;
          due_at: string;
          front: string;
          id: string;
          image_storage_key: string | null;
          lapses: number;
          last_review_at: string | null;
          owner_id: string;
          reps: number;
          source_note_id: string | null;
          stability: number;
          state: string;
          updated_at: string;
        };
        Insert: {
          back: string;
          created_at?: string;
          difficulty?: number;
          due_at?: string;
          front: string;
          id?: string;
          image_storage_key?: string | null;
          lapses?: number;
          last_review_at?: string | null;
          owner_id: string;
          reps?: number;
          source_note_id?: string | null;
          stability?: number;
          state?: string;
          updated_at?: string;
        };
        Update: {
          back?: string;
          created_at?: string;
          difficulty?: number;
          due_at?: string;
          front?: string;
          id?: string;
          image_storage_key?: string | null;
          lapses?: number;
          last_review_at?: string | null;
          owner_id?: string;
          reps?: number;
          source_note_id?: string | null;
          stability?: number;
          state?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_source_note_id_fkey";
            columns: ["source_note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          assignment_id: string | null;
          audio_storage_key: string | null;
          body_text: string;
          class_id: string | null; // 0018 migration; manually annotated until supabase:types regen
          created_at: string;
          id: string;
          outline_json: Json | null;
          owner_id: string;
          title: string;
          transcript_text: string | null;
          updated_at: string;
        };
        Insert: {
          assignment_id?: string | null;
          audio_storage_key?: string | null;
          body_text?: string;
          class_id?: string | null; // 0018 migration; manually annotated until supabase:types regen
          created_at?: string;
          id?: string;
          outline_json?: Json | null;
          owner_id: string;
          title?: string;
          transcript_text?: string | null;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string | null;
          audio_storage_key?: string | null;
          body_text?: string;
          class_id?: string | null; // 0018 migration; manually annotated until supabase:types regen
          created_at?: string;
          id?: string;
          outline_json?: Json | null;
          owner_id?: string;
          title?: string;
          transcript_text?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_class_id_fkey"; // 0018 migration; manually annotated until supabase:types regen
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      inbox_items: {
        Row: {
          assignment_id: string | null;
          capture_mode: string;
          created_at: string;
          id: string;
          owner_id: string;
          photo_storage_key: string | null;
          raw: string;
          status: string;
          suggested_class_id: string | null;
          suggested_due_at: string | null;
          suggested_kind: string | null;
          suggestion_confidence: number | null;
          updated_at: string;
        };
        Insert: {
          assignment_id?: string | null;
          capture_mode: string;
          created_at?: string;
          id?: string;
          owner_id: string;
          photo_storage_key?: string | null;
          raw: string;
          status?: string;
          suggested_class_id?: string | null;
          suggested_due_at?: string | null;
          suggested_kind?: string | null;
          suggestion_confidence?: number | null;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string | null;
          capture_mode?: string;
          created_at?: string;
          id?: string;
          owner_id?: string;
          photo_storage_key?: string | null;
          raw?: string;
          status?: string;
          suggested_class_id?: string | null;
          suggested_due_at?: string | null;
          suggested_kind?: string | null;
          suggestion_confidence?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inbox_items_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbox_items_suggested_class_id_fkey";
            columns: ["suggested_class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
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
      ai_interactions: {
        Row: {
          assignment_id: string | null;
          created_at: string;
          feature: string;
          id: string;
          model: string;
          owner_id: string;
          prompt_summary: string | null;
          tokens_used: number;
        };
        Insert: {
          assignment_id?: string | null;
          created_at?: string;
          feature: string;
          id?: string;
          model: string;
          owner_id: string;
          prompt_summary?: string | null;
          tokens_used?: number;
        };
        Update: {
          assignment_id?: string | null;
          created_at?: string;
          feature?: string;
          id?: string;
          model?: string;
          owner_id?: string;
          prompt_summary?: string | null;
          tokens_used?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ai_interactions_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          class_id: string;
          created_at: string;
          description: string | null;
          difficulty: number | null;
          due_at: string | null;
          estimated_minutes: number | null;
          external_id: string | null;
          external_source: string | null;
          id: string;
          kind: AssignmentKind;
          last_synced_at: string | null;
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
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          kind?: AssignmentKind;
          last_synced_at?: string | null;
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
          external_id?: string | null;
          external_source?: string | null;
          id?: string;
          kind?: AssignmentKind;
          last_synced_at?: string | null;
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
          ai_mode: string;
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
          ai_mode?: string;
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
          ai_mode?: string;
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
          class_count_hint: number | null;
          consent_ai: boolean;
          consent_ai_at: string | null;
          created_at: string;
          daily_token_budget: number;
          date_of_birth: string;
          diagnoses: string[];
          display_name: string | null;
          dyslexia_font: boolean;
          extra_time_pct: number;
          font_size: FontSize;
          high_contrast: boolean;
          line_spacing: LineSpacing;
          onboarded_at: string | null;
          reading_font: string;
          reduced_motion: boolean;
          school_year: number | null;
          timezone: string;
          token_reset_date: string;
          tokens_used_today: number;
          tts_enabled: boolean;
          tts_provider: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accommodations?: string[];
          age_bracket: string;
          class_count_hint?: number | null;
          consent_ai?: boolean;
          consent_ai_at?: string | null;
          created_at?: string;
          daily_token_budget?: number;
          date_of_birth: string;
          diagnoses?: string[];
          display_name?: string | null;
          dyslexia_font?: boolean;
          extra_time_pct?: number;
          font_size?: FontSize;
          high_contrast?: boolean;
          line_spacing?: LineSpacing;
          onboarded_at?: string | null;
          reading_font?: string;
          reduced_motion?: boolean;
          school_year?: number | null;
          timezone?: string;
          token_reset_date?: string;
          tokens_used_today?: number;
          tts_enabled?: boolean;
          tts_provider?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accommodations?: string[];
          age_bracket?: string;
          class_count_hint?: number | null;
          consent_ai?: boolean;
          consent_ai_at?: string | null;
          created_at?: string;
          daily_token_budget?: number;
          date_of_birth?: string;
          diagnoses?: string[];
          display_name?: string | null;
          dyslexia_font?: boolean;
          extra_time_pct?: number;
          font_size?: FontSize;
          high_contrast?: boolean;
          line_spacing?: LineSpacing;
          onboarded_at?: string | null;
          reading_font?: string;
          reduced_motion?: boolean;
          school_year?: number | null;
          timezone?: string;
          token_reset_date?: string;
          tokens_used_today?: number;
          tts_enabled?: boolean;
          tts_provider?: string;
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
      share_links: {
        Row: {
          id: string;
          token: string;
          owner_id: string;
          share_type: "parent_summary" | "teacher_snapshot";
          expires_at: string;
          revoked_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          token?: string;
          owner_id: string;
          share_type: "parent_summary" | "teacher_snapshot";
          expires_at?: string;
          revoked_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          token?: string;
          owner_id?: string;
          share_type?: "parent_summary" | "teacher_snapshot";
          expires_at?: string;
          revoked_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
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
      lms_connections: {
        Row: {
          id: string;
          owner_id: string;
          provider: string;
          config: Json;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          provider: string;
          config?: Json;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          provider?: string;
          config?: Json;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lms_connections_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
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
