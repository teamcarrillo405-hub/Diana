import type { ParsedSyllabus } from "@/lib/syllabus/parse";

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
      class_syllabi: {
        Row: {
          id: string;
          owner_id: string;
          class_id: string | null;
          title: string;
          raw_text: string | null;
          parsed: ParsedSyllabus | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          class_id?: string | null;
          title: string;
          raw_text?: string | null;
          parsed?: ParsedSyllabus | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          class_id?: string | null;
          title?: string;
          raw_text?: string | null;
          parsed?: ParsedSyllabus | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      worker_jobs: {
        Row: {
          id: string;
          tenant_id: string;
          owner_id: string;
          feature: "diana.voice_candidate";
          queue_name: string;
          queue_mode: "inline" | "managed_queue";
          status: "queued" | "running" | "succeeded" | "error" | "rate_limited";
          trace_id: string;
          idempotency_key: string;
          input_summary: Json;
          payload: Json;
          constraints: Json;
          observability: Json;
          result_payload: Json;
          error_summary: string | null;
          attempts: number;
          max_attempts: number;
          priority: number;
          available_at: string;
          locked_at: string | null;
          locked_until: string | null;
          locked_by: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          owner_id: string;
          feature: "diana.voice_candidate";
          queue_name: string;
          queue_mode: "inline" | "managed_queue";
          status?: "queued" | "running" | "succeeded" | "error" | "rate_limited";
          trace_id: string;
          idempotency_key: string;
          input_summary?: Json;
          payload?: Json;
          constraints?: Json;
          observability?: Json;
          result_payload?: Json;
          error_summary?: string | null;
          attempts?: number;
          max_attempts?: number;
          priority?: number;
          available_at?: string;
          locked_at?: string | null;
          locked_until?: string | null;
          locked_by?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          owner_id?: string;
          feature?: "diana.voice_candidate";
          queue_name?: string;
          queue_mode?: "inline" | "managed_queue";
          status?: "queued" | "running" | "succeeded" | "error" | "rate_limited";
          trace_id?: string;
          idempotency_key?: string;
          input_summary?: Json;
          payload?: Json;
          constraints?: Json;
          observability?: Json;
          result_payload?: Json;
          error_summary?: string | null;
          attempts?: number;
          max_attempts?: number;
          priority?: number;
          available_at?: string;
          locked_at?: string | null;
          locked_until?: string | null;
          locked_by?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      worker_rate_limits: {
        Row: {
          id: string;
          tenant_id: string;
          owner_id: string;
          feature: "diana.voice_candidate";
          scope: "student" | "tenant" | "feature";
          window_start: string;
          count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          owner_id: string;
          feature: "diana.voice_candidate";
          scope: "student" | "tenant" | "feature";
          window_start: string;
          count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          owner_id?: string;
          feature?: "diana.voice_candidate";
          scope?: "student" | "tenant" | "feature";
          window_start?: string;
          count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      learner_profile_snapshots: {
        Row: {
          id: string;
          owner_id: string;
          profile_json: Json;
          confidence_json: Json;
          source_counts_json: Json;
          computed_at: string;
          version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          profile_json?: Json;
          confidence_json?: Json;
          source_counts_json?: Json;
          computed_at?: string;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          profile_json?: Json;
          confidence_json?: Json;
          source_counts_json?: Json;
          computed_at?: string;
          version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      learning_events: {
        Row: {
          id: string;
          owner_id: string;
          tenant_id: string;
          event_name: string;
          source_table: string | null;
          source_id: string | null;
          assignment_id: string | null;
          feature: string | null;
          payload: Json;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          tenant_id: string;
          event_name: string;
          source_table?: string | null;
          source_id?: string | null;
          assignment_id?: string | null;
          feature?: string | null;
          payload?: Json;
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          tenant_id?: string;
          event_name?: string;
          source_table?: string | null;
          source_id?: string | null;
          assignment_id?: string | null;
          feature?: string | null;
          payload?: Json;
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_events_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_rollup_jobs: {
        Row: {
          id: string;
          owner_id: string;
          tenant_id: string;
          status: "queued" | "running" | "succeeded" | "error" | "disabled";
          reason: string;
          attempts: number;
          max_attempts: number;
          available_at: string;
          locked_at: string | null;
          locked_until: string | null;
          locked_by: string | null;
          error_summary: string | null;
          queued_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          tenant_id: string;
          status?: "queued" | "running" | "succeeded" | "error" | "disabled";
          reason?: string;
          attempts?: number;
          max_attempts?: number;
          available_at?: string;
          locked_at?: string | null;
          locked_until?: string | null;
          locked_by?: string | null;
          error_summary?: string | null;
          queued_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          tenant_id?: string;
          status?: "queued" | "running" | "succeeded" | "error" | "disabled";
          reason?: string;
          attempts?: number;
          max_attempts?: number;
          available_at?: string;
          locked_at?: string | null;
          locked_until?: string | null;
          locked_by?: string | null;
          error_summary?: string | null;
          queued_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      study_artifacts: {
        Row: {
          id: string;
          owner_id: string;
          class_id: string | null;
          source_type: "assignment" | "note";
          source_id: string;
          artifact_type: "study_guide" | "practice_test" | "flashcard_set";
          study_mode: "guided_steps" | "visual_breakdown" | "retrieval_quiz" | "flashcard_builder";
          title: string;
          payload: Json;
          ai_policy: "green" | "yellow" | "red";
          loop_state: "generated" | "cards_saved" | "reviewing" | "mastery_linked";
          cards_saved_count: number;
          source_anchor_count: number;
          last_reviewed_at: string | null;
          artifact_edit_state: Json;
          practice_settings: Json;
          visual_breakdown: Json;
          authorship_receipt: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          class_id?: string | null;
          source_type: "assignment" | "note";
          source_id: string;
          artifact_type: "study_guide" | "practice_test" | "flashcard_set";
          study_mode: "guided_steps" | "visual_breakdown" | "retrieval_quiz" | "flashcard_builder";
          title: string;
          payload?: Json;
          ai_policy: "green" | "yellow" | "red";
          loop_state?: "generated" | "cards_saved" | "reviewing" | "mastery_linked";
          cards_saved_count?: number;
          source_anchor_count?: number;
          last_reviewed_at?: string | null;
          artifact_edit_state?: Json;
          practice_settings?: Json;
          visual_breakdown?: Json;
          authorship_receipt?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          class_id?: string | null;
          source_type?: "assignment" | "note";
          source_id?: string;
          artifact_type?: "study_guide" | "practice_test" | "flashcard_set";
          study_mode?: "guided_steps" | "visual_breakdown" | "retrieval_quiz" | "flashcard_builder";
          title?: string;
          payload?: Json;
          ai_policy?: "green" | "yellow" | "red";
          loop_state?: "generated" | "cards_saved" | "reviewing" | "mastery_linked";
          cards_saved_count?: number;
          source_anchor_count?: number;
          last_reviewed_at?: string | null;
          artifact_edit_state?: Json;
          practice_settings?: Json;
          visual_breakdown?: Json;
          authorship_receipt?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_artifacts_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      student_state_snapshots: {
        Row: {
          id: string;
          owner_id: string;
          assignment_id: string | null;
          class_id: string | null;
          state_version: number;
          trigger: string;
          assignment_kind: string | null;
          ai_policy: "green" | "yellow" | "red";
          readiness: Json;
          friction_signals: Json;
          recall_signals: Json;
          mastery_signals: Json;
          support_intensity: "steady" | "guided" | "scaffolded" | "one_move" | "recovery";
          struggle_state: "steady" | "productive" | "blocked" | "overload";
          next_step: string;
          ownership_meter: Json;
          source_anchors: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          assignment_id?: string | null;
          class_id?: string | null;
          state_version?: number;
          trigger: string;
          assignment_kind?: string | null;
          ai_policy: "green" | "yellow" | "red";
          readiness?: Json;
          friction_signals?: Json;
          recall_signals?: Json;
          mastery_signals?: Json;
          support_intensity: "steady" | "guided" | "scaffolded" | "one_move" | "recovery";
          struggle_state: "steady" | "productive" | "blocked" | "overload";
          next_step: string;
          ownership_meter?: Json;
          source_anchors?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          assignment_id?: string | null;
          class_id?: string | null;
          state_version?: number;
          trigger?: string;
          assignment_kind?: string | null;
          ai_policy?: "green" | "yellow" | "red";
          readiness?: Json;
          friction_signals?: Json;
          recall_signals?: Json;
          mastery_signals?: Json;
          support_intensity?: "steady" | "guided" | "scaffolded" | "one_move" | "recovery";
          struggle_state?: "steady" | "productive" | "blocked" | "overload";
          next_step?: string;
          ownership_meter?: Json;
          source_anchors?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_state_snapshots_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_state_snapshots_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          owner_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      canva_connections: {
        Row: {
          owner_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          scope: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          scope?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          access_token?: string;
          refresh_token?: string;
          expires_at?: string;
          scope?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_help_feedback: {
        Row: {
          id: string;
          owner_id: string;
          feature: string;
          assignment_id: string | null;
          helpful: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          feature: string;
          assignment_id?: string | null;
          helpful: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          feature?: string;
          assignment_id?: string | null;
          helpful?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_help_feedback_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      authorship_log: {
        Row: {
          id: string;
          owner_id: string;
          assignment_id: string | null;
          source_artifact_id: string | null;
          actor: "student" | "diana" | "system";
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          assignment_id?: string | null;
          source_artifact_id?: string | null;
          actor: "student" | "diana" | "system";
          event_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          assignment_id?: string | null;
          source_artifact_id?: string | null;
          actor?: "student" | "diana" | "system";
          event_type?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "authorship_log_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "authorship_log_source_artifact_id_fkey";
            columns: ["source_artifact_id"];
            isOneToOne: false;
            referencedRelation: "study_artifacts";
            referencedColumns: ["id"];
          },
        ];
      };
      competitive_benchmark_runs: {
        Row: {
          id: string;
          owner_id: string | null;
          run_label: string;
          scenario_id: string;
          competitor_pattern: string;
          observations: Json;
          score: Json;
          passed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          run_label?: string;
          scenario_id: string;
          competitor_pattern: string;
          observations?: Json;
          score?: Json;
          passed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          run_label?: string;
          scenario_id?: string;
          competitor_pattern?: string;
          observations?: Json;
          score?: Json;
          passed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      teen_test_observations: {
        Row: {
          id: string;
          owner_id: string | null;
          session_label: string;
          task_id: string;
          observation: Json;
          score: Json;
          no_pii: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          session_label?: string;
          task_id: string;
          observation?: Json;
          score?: Json;
          no_pii?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          session_label?: string;
          task_id?: string;
          observation?: Json;
          score?: Json;
          no_pii?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      study_groups: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          subject: string;
          join_code: string;
          visibility: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          subject?: string;
          join_code?: string;
          visibility?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          subject?: string;
          join_code?: string;
          visibility?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_group_members: {
        Row: {
          group_id: string;
          owner_id: string;
          display_name: string | null;
          role: string;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          owner_id: string;
          display_name?: string | null;
          role?: string;
          joined_at?: string;
        };
        Update: {
          group_id?: string;
          owner_id?: string;
          display_name?: string | null;
          role?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      study_group_sessions: {
        Row: {
          id: string;
          group_id: string;
          owner_id: string;
          title: string;
          work_minutes: number;
          break_minutes: number;
          starts_at: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          owner_id: string;
          title: string;
          work_minutes?: number;
          break_minutes?: number;
          starts_at?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          owner_id?: string;
          title?: string;
          work_minutes?: number;
          break_minutes?: number;
          starts_at?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      shared_flashcard_decks: {
        Row: {
          id: string;
          group_id: string;
          owner_id: string;
          title: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          owner_id: string;
          title: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          owner_id?: string;
          title?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      shared_flashcard_cards: {
        Row: {
          id: string;
          deck_id: string;
          owner_id: string;
          front: string;
          back: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          deck_id: string;
          owner_id: string;
          front: string;
          back: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          deck_id?: string;
          owner_id?: string;
          front?: string;
          back?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      shared_flashcard_installs: {
        Row: {
          deck_id: string;
          owner_id: string;
          installed_at: string;
        };
        Insert: {
          deck_id: string;
          owner_id: string;
          installed_at?: string;
        };
        Update: {
          deck_id?: string;
          owner_id?: string;
          installed_at?: string;
        };
        Relationships: [];
      };
      collaborative_notes: {
        Row: {
          id: string;
          group_id: string;
          owner_id: string;
          title: string;
          body_text: string;
          version: number;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          owner_id: string;
          title?: string;
          body_text?: string;
          version?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          owner_id?: string;
          title?: string;
          body_text?: string;
          version?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      peer_explanations: {
        Row: {
          id: string;
          group_id: string;
          owner_id: string;
          concept: string;
          explanation: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          owner_id: string;
          concept: string;
          explanation: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          owner_id?: string;
          concept?: string;
          explanation?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      group_project_tasks: {
        Row: {
          id: string;
          group_id: string;
          owner_id: string;
          title: string;
          assignee_name: string | null;
          status: string;
          due_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          owner_id: string;
          title: string;
          assignee_name?: string | null;
          status?: string;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          owner_id?: string;
          title?: string;
          assignee_name?: string | null;
          status?: string;
          due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      data_retention_runs: {
        Row: {
          id: string;
          ran_at: string;
          due_requests: number;
          completed_requests: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          ran_at?: string;
          due_requests?: number;
          completed_requests?: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          ran_at?: string;
          due_requests?: number;
          completed_requests?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      mastery_concepts: {
        Row: {
          id: string;
          owner_id: string;
          class_id: string;
          name: string;
          source: string;
          mastery_level: number;
          self_confidence: number | null;
          last_practiced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          class_id: string;
          name: string;
          source?: string;
          mastery_level?: number;
          self_confidence?: number | null;
          last_practiced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          class_id?: string;
          name?: string;
          source?: string;
          mastery_level?: number;
          self_confidence?: number | null;
          last_practiced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mastery_concepts_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      mastery_events: {
        Row: {
          id: number;
          owner_id: string;
          concept_id: string;
          source: string;
          rating: number | null;
          delta: number;
          evidence_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          owner_id: string;
          concept_id: string;
          source: string;
          rating?: number | null;
          delta?: number;
          evidence_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          owner_id?: string;
          concept_id?: string;
          source?: string;
          rating?: number | null;
          delta?: number;
          evidence_text?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mastery_events_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "mastery_concepts";
            referencedColumns: ["id"];
          },
        ];
      };
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
      ap_exam_plans: {
        Row: {
          id: string;
          owner_id: string;
          subject: string;
          exam_date: string;
          goal_band: string | null;
          current_focus: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          subject: string;
          exam_date: string;
          goal_band?: string | null;
          current_focus?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          subject?: string;
          exam_date?: string;
          goal_band?: string | null;
          current_focus?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ap_exam_plans_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ap_practice_attempts: {
        Row: {
          id: string;
          owner_id: string;
          plan_id: string | null;
          subject: string;
          practice_type: string;
          correct_count: number | null;
          total_count: number | null;
          score_band: string | null;
          notes: string | null;
          practiced_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          plan_id?: string | null;
          subject: string;
          practice_type: string;
          correct_count?: number | null;
          total_count?: number | null;
          score_band?: string | null;
          notes?: string | null;
          practiced_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          plan_id?: string | null;
          subject?: string;
          practice_type?: string;
          correct_count?: number | null;
          total_count?: number | null;
          score_band?: string | null;
          notes?: string | null;
          practiced_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ap_practice_attempts_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ap_practice_attempts_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "ap_exam_plans";
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
          concept_id: string | null; // 0023 migration; manually annotated until supabase:types regen
          source_assignment_id: string | null; // 0037 migration; manually annotated until supabase:types regen
          source_artifact_id: string | null; // 0037 migration; manually annotated until supabase:types regen
          source_anchor: string | null; // 0037 migration; manually annotated until supabase:types regen
          student_required_action: string | null; // 0037 migration; manually annotated until supabase:types regen
          ai_contribution_level: "none" | "organize" | "hint" | "practice" | "draft_suggestion"; // 0037 migration
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
          concept_id?: string | null; // 0023 migration; manually annotated until supabase:types regen
          source_assignment_id?: string | null; // 0037 migration; manually annotated until supabase:types regen
          source_artifact_id?: string | null; // 0037 migration; manually annotated until supabase:types regen
          source_anchor?: string | null; // 0037 migration; manually annotated until supabase:types regen
          student_required_action?: string | null; // 0037 migration; manually annotated until supabase:types regen
          ai_contribution_level?: "none" | "organize" | "hint" | "practice" | "draft_suggestion"; // 0037 migration
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
          concept_id?: string | null; // 0023 migration; manually annotated until supabase:types regen
          source_assignment_id?: string | null; // 0037 migration; manually annotated until supabase:types regen
          source_artifact_id?: string | null; // 0037 migration; manually annotated until supabase:types regen
          source_anchor?: string | null; // 0037 migration; manually annotated until supabase:types regen
          student_required_action?: string | null; // 0037 migration; manually annotated until supabase:types regen
          ai_contribution_level?: "none" | "organize" | "hint" | "practice" | "draft_suggestion"; // 0037 migration
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
          {
            foreignKeyName: "flashcards_concept_id_fkey"; // 0023 migration; manually annotated until supabase:types regen
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "mastery_concepts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flashcards_source_assignment_id_fkey";
            columns: ["source_assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flashcards_source_artifact_id_fkey";
            columns: ["source_artifact_id"];
            isOneToOne: false;
            referencedRelation: "study_artifacts";
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
          action_items_json: Json; // 0020 migration; manually annotated until supabase:types regen
          ai_suggested_tags: string[]; // 0022 migration; manually annotated until supabase:types regen
          created_at: string;
          doc_storage_key: string | null; // 0019 migration; manually annotated until supabase:types regen
          id: string;
          outline_json: Json | null;
          owner_id: string;
          search_vector: unknown; // 0022 generated column; manually annotated until supabase:types regen
          source: string; // 0020 migration; manually annotated until supabase:types regen
          tags: string[]; // 0022 migration; manually annotated until supabase:types regen
          title: string;
          transcript_text: string | null;
          updated_at: string;
        };
        Insert: {
          assignment_id?: string | null;
          audio_storage_key?: string | null;
          body_text?: string;
          class_id?: string | null; // 0018 migration; manually annotated until supabase:types regen
          action_items_json?: Json; // 0020 migration; manually annotated until supabase:types regen
          ai_suggested_tags?: string[]; // 0022 migration; manually annotated until supabase:types regen
          created_at?: string;
          doc_storage_key?: string | null; // 0019 migration; manually annotated until supabase:types regen
          id?: string;
          outline_json?: Json | null;
          owner_id: string;
          source?: string; // 0020 migration; manually annotated until supabase:types regen
          tags?: string[]; // 0022 migration; manually annotated until supabase:types regen
          title?: string;
          transcript_text?: string | null;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string | null;
          audio_storage_key?: string | null;
          body_text?: string;
          class_id?: string | null; // 0018 migration; manually annotated until supabase:types regen
          action_items_json?: Json; // 0020 migration; manually annotated until supabase:types regen
          ai_suggested_tags?: string[]; // 0022 migration; manually annotated until supabase:types regen
          created_at?: string;
          doc_storage_key?: string | null; // 0019 migration; manually annotated until supabase:types regen
          id?: string;
          outline_json?: Json | null;
          owner_id?: string;
          source?: string; // 0020 migration; manually annotated until supabase:types regen
          tags?: string[]; // 0022 migration; manually annotated until supabase:types regen
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
      vocabulary_terms: {
        Row: {
          id: string;
          owner_id: string;
          class_id: string | null;
          note_id: string | null;
          assignment_id: string | null;
          flashcard_id: string | null;
          word: string;
          context_text: string | null;
          definition: string;
          phonics: Json; // 0029 migration; manually annotated until supabase:types regen
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          class_id?: string | null;
          note_id?: string | null;
          assignment_id?: string | null;
          flashcard_id?: string | null;
          word: string;
          context_text?: string | null;
          definition: string;
          phonics?: Json; // 0029 migration; manually annotated until supabase:types regen
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          class_id?: string | null;
          note_id?: string | null;
          assignment_id?: string | null;
          flashcard_id?: string | null;
          word?: string;
          context_text?: string | null;
          definition?: string;
          phonics?: Json; // 0029 migration; manually annotated until supabase:types regen
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vocabulary_terms_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vocabulary_terms_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vocabulary_terms_flashcard_id_fkey";
            columns: ["flashcard_id"];
            isOneToOne: false;
            referencedRelation: "flashcards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vocabulary_terms_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_annotations: {
        Row: {
          id: string;
          owner_id: string;
          class_id: string | null;
          note_id: string | null;
          assignment_id: string | null;
          selected_text: string;
          note_text: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          class_id?: string | null;
          note_id?: string | null;
          assignment_id?: string | null;
          selected_text: string;
          note_text: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          class_id?: string | null;
          note_id?: string | null;
          assignment_id?: string | null;
          selected_text?: string;
          note_text?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_annotations_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_annotations_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_annotations_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
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
          source_note_id: string | null; // 0020 migration; manually annotated until supabase:types regen
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
          source_note_id?: string | null; // 0020 migration; manually annotated until supabase:types regen
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
          source_note_id?: string | null; // 0020 migration; manually annotated until supabase:types regen
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
          {
            foreignKeyName: "inbox_items_source_note_id_fkey"; // 0020 migration; manually annotated until supabase:types regen
            columns: ["source_note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
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
      feature_flags: {
        Row: {
          id: string;
          owner_id: string;
          flag_key: string;
          description: string | null;
          enabled: boolean;
          rollout_pct: number;
          audience: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          flag_key: string;
          description?: string | null;
          enabled?: boolean;
          rollout_pct?: number;
          audience?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          flag_key?: string;
          description?: string | null;
          enabled?: boolean;
          rollout_pct?: number;
          audience?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: number;
          owner_id: string;
          event_name: string;
          feature: string | null;
          route: string | null;
          duration_ms: number | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          owner_id: string;
          event_name: string;
          feature?: string | null;
          route?: string | null;
          duration_ms?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          owner_id?: string;
          event_name?: string;
          feature?: string | null;
          route?: string | null;
          duration_ms?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      error_events: {
        Row: {
          id: number;
          owner_id: string;
          route: string | null;
          message: string;
          stack: string | null;
          severity: string;
          diagnosis_tags: string[];
          created_at: string;
        };
        Insert: {
          id?: number;
          owner_id: string;
          route?: string | null;
          message: string;
          stack?: string | null;
          severity?: string;
          diagnosis_tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: number;
          owner_id?: string;
          route?: string | null;
          message?: string;
          stack?: string | null;
          severity?: string;
          diagnosis_tags?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      performance_events: {
        Row: {
          id: number;
          owner_id: string;
          route: string;
          metric_name: string;
          value: number;
          budget_value: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          owner_id: string;
          route: string;
          metric_name: string;
          value: number;
          budget_value?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          owner_id?: string;
          route?: string;
          metric_name?: string;
          value?: number;
          budget_value?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      experiments: {
        Row: {
          id: string;
          owner_id: string;
          experiment_key: string;
          description: string | null;
          surface: string;
          variants: Json;
          enabled: boolean;
          allocation_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          experiment_key: string;
          description?: string | null;
          surface?: string;
          variants?: Json;
          enabled?: boolean;
          allocation_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          experiment_key?: string;
          description?: string | null;
          surface?: string;
          variants?: Json;
          enabled?: boolean;
          allocation_pct?: number;
          created_at?: string;
          updated_at?: string;
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
          ai_mode_override: string | null; // 0030 migration; manually annotated until supabase:types regen
          external_id: string | null;
          external_source: string | null;
          external_url: string | null; // 0024 migration; manually annotated until supabase:types regen
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
          submission_synced_at: string | null; // 0024 migration; manually annotated until supabase:types regen
          submission_sync_status: string | null; // 0024 migration; manually annotated until supabase:types regen
          submitted_at: string | null;
          rubric_text: string | null; // 0024 migration; manually annotated until supabase:types regen
          saved_work: Json; // 20260709 migration; manually annotated until supabase:types regen
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
          ai_mode_override?: string | null; // 0030 migration; manually annotated until supabase:types regen
          external_id?: string | null;
          external_source?: string | null;
          external_url?: string | null; // 0024 migration; manually annotated until supabase:types regen
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
          submission_synced_at?: string | null; // 0024 migration; manually annotated until supabase:types regen
          submission_sync_status?: string | null; // 0024 migration; manually annotated until supabase:types regen
          submitted_at?: string | null;
          rubric_text?: string | null; // 0024 migration; manually annotated until supabase:types regen
          saved_work?: Json; // 20260709 migration; manually annotated until supabase:types regen
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
          ai_mode_override?: string | null; // 0030 migration; manually annotated until supabase:types regen
          external_id?: string | null;
          external_source?: string | null;
          external_url?: string | null; // 0024 migration; manually annotated until supabase:types regen
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
          submission_synced_at?: string | null; // 0024 migration; manually annotated until supabase:types regen
          submission_sync_status?: string | null; // 0024 migration; manually annotated until supabase:types regen
          submitted_at?: string | null;
          rubric_text?: string | null; // 0024 migration; manually annotated until supabase:types regen
          saved_work?: Json; // 20260709 migration; manually annotated until supabase:types regen
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
      assignment_problems: {
        Row: {
          id: string;
          owner_id: string;
          assignment_id: string;
          problem_number: number;
          problem_text: string;
          source: string;
          scaffold: Json | null;
          student_work: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          assignment_id: string;
          problem_number: number;
          problem_text: string;
          source?: string;
          scaffold?: Json | null;
          student_work?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          assignment_id?: string;
          problem_number?: number;
          problem_text?: string;
          source?: string;
          scaffold?: Json | null;
          student_work?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_problems_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
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
      class_roster_members: {
        Row: {
          id: string;
          owner_id: string;
          class_id: string;
          display_name: string;
          email: string | null;
          role: string;
          status: string;
          consent_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          class_id: string;
          display_name: string;
          email?: string | null;
          role?: string;
          status?: string;
          consent_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          class_id?: string;
          display_name?: string;
          email?: string | null;
          role?: string;
          status?: string;
          consent_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_roster_members_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_progress_notes: {
        Row: {
          id: string;
          owner_id: string;
          class_id: string | null;
          assignment_id: string | null;
          author_name: string;
          note_text: string;
          visible_to_parent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          class_id?: string | null;
          assignment_id?: string | null;
          author_name: string;
          note_text: string;
          visible_to_parent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          class_id?: string | null;
          assignment_id?: string | null;
          author_name?: string;
          note_text?: string;
          visible_to_parent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_progress_notes_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_progress_notes_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      accommodation_confirmations: {
        Row: {
          id: string;
          owner_id: string;
          class_id: string | null;
          confirmed_by: string;
          extra_time_pct: number;
          tts_enabled: boolean;
          dyslexia_font: boolean;
          accommodations: Json;
          notes: string | null;
          confirmed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          class_id?: string | null;
          confirmed_by: string;
          extra_time_pct?: number;
          tts_enabled?: boolean;
          dyslexia_font?: boolean;
          accommodations?: Json;
          notes?: string | null;
          confirmed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          class_id?: string | null;
          confirmed_by?: string;
          extra_time_pct?: number;
          tts_enabled?: boolean;
          dyslexia_font?: boolean;
          accommodations?: Json;
          notes?: string | null;
          confirmed_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accommodation_confirmations_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      session_handoffs: {
        Row: {
          owner_id: string;
          route: string;
          context: Json;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          route: string;
          context?: Json;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          route?: string;
          context?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      data_deletion_requests: {
        Row: {
          id: string;
          owner_id: string;
          status: string;
          requested_at: string;
          ai_disabled_at: string | null;
          export_offered: boolean;
          notes: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          status?: string;
          requested_at?: string;
          ai_disabled_at?: string | null;
          export_offered?: boolean;
          notes?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          status?: string;
          requested_at?: string;
          ai_disabled_at?: string | null;
          export_offered?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          accommodations: string[];
          age_bracket: string;
          ai_verbosity_by_subject: Json; // 0032 migration; manually annotated until supabase:types regen
          class_count_hint: number | null;
          consent_ai: boolean;
          consent_ai_at: string | null;
          bionic_reading: boolean; // 0021 migration; manually annotated until supabase:types regen
          created_at: string;
          daily_token_budget: number;
          date_of_birth: string;
          diagnoses: string[];
          display_name: string | null;
          dyslexia_font: boolean;
          extra_time_pct: number;
          font_size: FontSize;
          high_contrast: boolean;
          interests: string[]; // 0020 migration; manually annotated until supabase:types regen
          line_focus: boolean; // 0021 migration; manually annotated until supabase:types regen
          line_spacing: LineSpacing;
          learning_loop_paused: boolean; // 0045 migration; manually annotated until supabase:types regen
          learning_loop_reset_at: string | null; // 0045 migration; manually annotated until supabase:types regen
          last_mood_checkin_at: string | null; // 0025 migration; manually annotated until supabase:types regen
          last_weekly_reflection_at: string | null; // 0025 migration; manually annotated until supabase:types regen
          mastery_signals: Json; // 0020 migration; manually annotated until supabase:types regen
          mood_checkin_disabled: boolean; // 0025 migration; manually annotated until supabase:types regen
          onboarded_at: string | null;
          notification_preferences: Json; // 0032 migration; manually annotated until supabase:types regen
          privacy_preferences: Json; // 0032 migration; manually annotated until supabase:types regen
          reading_letter_spacing: ReadingSpacing; // 0021 migration; manually annotated until supabase:types regen
          reading_font: string;
          reading_word_spacing: ReadingSpacing; // 0021 migration; manually annotated until supabase:types regen
          reduced_motion: boolean;
          rough_mode_until: string | null; // 0025 migration; manually annotated until supabase:types regen
          school_year: number | null;
          session_mood: string | null; // 0020 migration; manually annotated until supabase:types regen
          timezone: string;
          token_reset_date: string;
          tokens_used_today: number;
          tts_enabled: boolean;
          tts_pitch: number; // 0021 migration; manually annotated until supabase:types regen
          tts_provider: TtsProvider;
          tts_speed: number; // 0021 migration; manually annotated until supabase:types regen
          tts_voice: string; // 0021 migration; manually annotated until supabase:types regen
          updated_at: string;
          user_id: string;
          visual_pacing: VisualPacing; // 0021 migration; manually annotated until supabase:types regen
          photo_url: string | null; // 20260613 migration; manually annotated until supabase:types regen
          photo_offset_x: number; // 20260709 migration; manually annotated until supabase:types regen
          photo_offset_y: number; // 20260709 migration; manually annotated until supabase:types regen
        };
        Insert: {
          accommodations?: string[];
          age_bracket: string;
          ai_verbosity_by_subject?: Json; // 0032 migration; manually annotated until supabase:types regen
          class_count_hint?: number | null;
          consent_ai?: boolean;
          consent_ai_at?: string | null;
          bionic_reading?: boolean; // 0021 migration; manually annotated until supabase:types regen
          created_at?: string;
          daily_token_budget?: number;
          date_of_birth: string;
          diagnoses?: string[];
          display_name?: string | null;
          dyslexia_font?: boolean;
          extra_time_pct?: number;
          font_size?: FontSize;
          high_contrast?: boolean;
          interests?: string[]; // 0020 migration; manually annotated until supabase:types regen
          line_focus?: boolean; // 0021 migration; manually annotated until supabase:types regen
          line_spacing?: LineSpacing;
          learning_loop_paused?: boolean; // 0045 migration; manually annotated until supabase:types regen
          learning_loop_reset_at?: string | null; // 0045 migration; manually annotated until supabase:types regen
          last_mood_checkin_at?: string | null; // 0025 migration; manually annotated until supabase:types regen
          last_weekly_reflection_at?: string | null; // 0025 migration; manually annotated until supabase:types regen
          mastery_signals?: Json; // 0020 migration; manually annotated until supabase:types regen
          mood_checkin_disabled?: boolean; // 0025 migration; manually annotated until supabase:types regen
          onboarded_at?: string | null;
          notification_preferences?: Json; // 0032 migration; manually annotated until supabase:types regen
          privacy_preferences?: Json; // 0032 migration; manually annotated until supabase:types regen
          reading_letter_spacing?: ReadingSpacing; // 0021 migration; manually annotated until supabase:types regen
          reading_font?: string;
          reading_word_spacing?: ReadingSpacing; // 0021 migration; manually annotated until supabase:types regen
          reduced_motion?: boolean;
          rough_mode_until?: string | null; // 0025 migration; manually annotated until supabase:types regen
          school_year?: number | null;
          session_mood?: string | null; // 0020 migration; manually annotated until supabase:types regen
          timezone?: string;
          token_reset_date?: string;
          tokens_used_today?: number;
          tts_enabled?: boolean;
          tts_pitch?: number; // 0021 migration; manually annotated until supabase:types regen
          tts_provider?: TtsProvider;
          tts_speed?: number; // 0021 migration; manually annotated until supabase:types regen
          tts_voice?: string; // 0021 migration; manually annotated until supabase:types regen
          updated_at?: string;
          user_id: string;
          visual_pacing?: VisualPacing; // 0021 migration; manually annotated until supabase:types regen
          photo_url?: string | null; // 20260613 migration; manually annotated until supabase:types regen
          photo_offset_x?: number; // 20260709 migration; manually annotated until supabase:types regen
          photo_offset_y?: number; // 20260709 migration; manually annotated until supabase:types regen
        };
        Update: {
          accommodations?: string[];
          age_bracket?: string;
          ai_verbosity_by_subject?: Json; // 0032 migration; manually annotated until supabase:types regen
          class_count_hint?: number | null;
          consent_ai?: boolean;
          consent_ai_at?: string | null;
          bionic_reading?: boolean; // 0021 migration; manually annotated until supabase:types regen
          created_at?: string;
          daily_token_budget?: number;
          date_of_birth?: string;
          diagnoses?: string[];
          display_name?: string | null;
          dyslexia_font?: boolean;
          extra_time_pct?: number;
          font_size?: FontSize;
          high_contrast?: boolean;
          interests?: string[]; // 0020 migration; manually annotated until supabase:types regen
          line_focus?: boolean; // 0021 migration; manually annotated until supabase:types regen
          line_spacing?: LineSpacing;
          learning_loop_paused?: boolean; // 0045 migration; manually annotated until supabase:types regen
          learning_loop_reset_at?: string | null; // 0045 migration; manually annotated until supabase:types regen
          last_mood_checkin_at?: string | null; // 0025 migration; manually annotated until supabase:types regen
          last_weekly_reflection_at?: string | null; // 0025 migration; manually annotated until supabase:types regen
          mastery_signals?: Json; // 0020 migration; manually annotated until supabase:types regen
          mood_checkin_disabled?: boolean; // 0025 migration; manually annotated until supabase:types regen
          onboarded_at?: string | null;
          notification_preferences?: Json; // 0032 migration; manually annotated until supabase:types regen
          privacy_preferences?: Json; // 0032 migration; manually annotated until supabase:types regen
          reading_letter_spacing?: ReadingSpacing; // 0021 migration; manually annotated until supabase:types regen
          reading_font?: string;
          reading_word_spacing?: ReadingSpacing; // 0021 migration; manually annotated until supabase:types regen
          reduced_motion?: boolean;
          rough_mode_until?: string | null; // 0025 migration; manually annotated until supabase:types regen
          school_year?: number | null;
          session_mood?: string | null; // 0020 migration; manually annotated until supabase:types regen
          timezone?: string;
          token_reset_date?: string;
          tokens_used_today?: number;
          tts_enabled?: boolean;
          tts_pitch?: number; // 0021 migration; manually annotated until supabase:types regen
          tts_provider?: TtsProvider;
          tts_speed?: number; // 0021 migration; manually annotated until supabase:types regen
          tts_voice?: string; // 0021 migration; manually annotated until supabase:types regen
          updated_at?: string;
          user_id?: string;
          visual_pacing?: VisualPacing; // 0021 migration; manually annotated until supabase:types regen
          photo_url?: string | null; // 20260613 migration; manually annotated until supabase:types regen
          photo_offset_x?: number; // 20260709 migration; manually annotated until supabase:types regen
          photo_offset_y?: number; // 20260709 migration; manually annotated until supabase:types regen
        };
        Relationships: [];
      };
      iep_imports: {
        Row: {
          id: string;
          owner_id: string;
          source_name: string | null;
          extracted_summary: Json;
          applied_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          source_name?: string | null;
          extracted_summary?: Json;
          applied_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          source_name?: string | null;
          extracted_summary?: Json;
          applied_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iep_imports_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
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
      wellness_activity_logs: {
        Row: {
          id: string;
          owner_id: string;
          logged_for: string;
          activity_type: string;
          duration_minutes: number;
          felt: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          logged_for?: string;
          activity_type: string;
          duration_minutes: number;
          felt: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          logged_for?: string;
          activity_type?: string;
          duration_minutes?: number;
          felt?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wellness_activity_logs_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      wellness_goals: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          category: string;
          target_text: string;
          next_step: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          category: string;
          target_text: string;
          next_step?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          category?: string;
          target_text?: string;
          next_step?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wellness_goals_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      sleep_logs: {
        Row: {
          id: string;
          owner_id: string;
          sleep_date: string;
          sleep_quality: string;
          sleep_hours: number | null;
          focus_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          sleep_date?: string;
          sleep_quality: string;
          sleep_hours?: number | null;
          focus_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          sleep_date?: string;
          sleep_quality?: string;
          sleep_hours?: number | null;
          focus_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sleep_logs_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolios: {
        Row: {
          id: string;
          owner_id: string;
          class_id: string | null;
          title: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          class_id?: string | null;
          title: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          class_id?: string | null;
          title?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolios_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portfolios_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_items: {
        Row: {
          id: string;
          owner_id: string;
          portfolio_id: string;
          title: string;
          reflection_text: string | null;
          storage_bucket: string;
          storage_key: string | null;
          mime_type: string | null;
          metadata: Json;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          portfolio_id: string;
          title: string;
          reflection_text?: string | null;
          storage_bucket?: string;
          storage_key?: string | null;
          mime_type?: string | null;
          metadata?: Json;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          portfolio_id?: string;
          title?: string;
          reflection_text?: string | null;
          storage_bucket?: string;
          storage_key?: string | null;
          mime_type?: string | null;
          metadata?: Json;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portfolio_items_portfolio_id_fkey";
            columns: ["portfolio_id"];
            isOneToOne: false;
            referencedRelation: "portfolios";
            referencedColumns: ["id"];
          },
        ];
      };
      student_reflections: {
        Row: {
          id: string;
          owner_id: string;
          week_start: string;
          mood: string | null;
          body: string;
          ai_reflection: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          week_start: string;
          mood?: string | null;
          body: string;
          ai_reflection?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          week_start?: string;
          mood?: string | null;
          body?: string;
          ai_reflection?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_reflections_owner_id_fkey";
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
    Functions: {
      join_study_group: {
        Args: { p_join_code: string; p_display_name?: string | null };
        Returns: string;
      };
      install_shared_deck_for_members: {
        Args: { p_deck_id: string };
        Returns: number;
      };
      claim_worker_job: {
        Args: {
          requested_queue_name: string;
          worker_id: string;
          lease_seconds?: number;
        };
        Returns: Database["public"]["Tables"]["worker_jobs"]["Row"];
      };
      reserve_worker_rate_limit: {
        Args: {
          requested_tenant_id: string;
          requested_owner_id: string;
          requested_feature: string;
          requested_scope: string;
          window_seconds: number;
          max_count: number;
        };
        Returns: {
          allowed: boolean;
          count: number;
          remaining: number;
          reset_at: string;
        }[];
      };
      is_study_group_member: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      is_study_group_owner: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      purge_due_deletion_requests: {
        Args: { p_now?: string };
        Returns: number;
      };
    };
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
export type VisualPacing = "off" | "word" | "line";
export type ReadingSpacing = "normal" | "wide" | "wider";
export type TtsProvider = "browser" | "openai" | "elevenlabs";

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
