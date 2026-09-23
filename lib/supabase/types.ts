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
      accommodation_confirmations: {
        Row: {
          accommodations: Json
          class_id: string | null
          confirmed_at: string
          confirmed_by: string
          created_at: string
          dyslexia_font: boolean
          extra_time_pct: number
          id: string
          notes: string | null
          owner_id: string
          tts_enabled: boolean
        }
        Insert: {
          accommodations?: Json
          class_id?: string | null
          confirmed_at?: string
          confirmed_by: string
          created_at?: string
          dyslexia_font?: boolean
          extra_time_pct?: number
          id?: string
          notes?: string | null
          owner_id: string
          tts_enabled?: boolean
        }
        Update: {
          accommodations?: Json
          class_id?: string | null
          confirmed_at?: string
          confirmed_by?: string
          created_at?: string
          dyslexia_font?: boolean
          extra_time_pct?: number
          id?: string
          notes?: string | null
          owner_id?: string
          tts_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_confirmations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_audit: {
        Row: {
          attempted_at: string
          auth_user_present: boolean | null
          failure_code: string | null
          finished_at: string
          id: string
          manifest_version: number
          phase: string
          public_residue: number | null
          public_rows_deleted: number
          request_digest: string
          result: string
          storage_objects_deleted: number
          storage_residue: number | null
        }
        Insert: {
          attempted_at: string
          auth_user_present?: boolean | null
          failure_code?: string | null
          finished_at: string
          id?: string
          manifest_version: number
          phase: string
          public_residue?: number | null
          public_rows_deleted?: number
          request_digest: string
          result: string
          storage_objects_deleted?: number
          storage_residue?: number | null
        }
        Update: {
          attempted_at?: string
          auth_user_present?: boolean | null
          failure_code?: string | null
          finished_at?: string
          id?: string
          manifest_version?: number
          phase?: string
          public_residue?: number | null
          public_rows_deleted?: number
          request_digest?: string
          result?: string
          storage_objects_deleted?: number
          storage_residue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_audit_manifest_version_fkey"
            columns: ["manifest_version"]
            isOneToOne: false
            referencedRelation: "account_deletion_manifest_versions"
            referencedColumns: ["manifest_version"]
          },
        ]
      }
      account_deletion_manifest_versions: {
        Row: {
          actor_columns: string[]
          created_at: string
          manifest_version: number
          owner_columns: string[]
          public_table_exclusions: string[]
          storage_buckets: string[]
          storage_owner_columns: string[]
        }
        Insert: {
          actor_columns: string[]
          created_at?: string
          manifest_version: number
          owner_columns: string[]
          public_table_exclusions?: string[]
          storage_buckets: string[]
          storage_owner_columns: string[]
        }
        Update: {
          actor_columns?: string[]
          created_at?: string
          manifest_version?: number
          owner_columns?: string[]
          public_table_exclusions?: string[]
          storage_buckets?: string[]
          storage_owner_columns?: string[]
        }
        Relationships: []
      }
      ai_budget_reconciliation_jobs: {
        Row: {
          actual_units: number
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          next_attempt_at: string
          owner_id: string
          reservation_id: string
          reservation_kind: string
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_units: number
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          owner_id: string
          reservation_id: string
          reservation_kind: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_units?: number
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          owner_id?: string
          reservation_id?: string
          reservation_kind?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_calls: {
        Row: {
          blocked_reason: string | null
          cost_micros: number | null
          created_at: string
          feature: string
          id: string
          model: string
          owner_id: string
          prompt_summary: string | null
          status: string
        }
        Insert: {
          blocked_reason?: string | null
          cost_micros?: number | null
          created_at?: string
          feature: string
          id?: string
          model: string
          owner_id: string
          prompt_summary?: string | null
          status: string
        }
        Update: {
          blocked_reason?: string | null
          cost_micros?: number | null
          created_at?: string
          feature?: string
          id?: string
          model?: string
          owner_id?: string
          prompt_summary?: string | null
          status?: string
        }
        Relationships: []
      }
      ai_help_feedback: {
        Row: {
          assignment_id: string | null
          created_at: string
          feature: string
          helpful: boolean
          id: string
          owner_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          feature: string
          helpful: boolean
          id?: string
          owner_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          feature?: string
          helpful?: boolean
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_help_feedback_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_interactions: {
        Row: {
          assignment_id: string | null
          created_at: string
          feature: string
          id: string
          model: string
          owner_id: string
          prompt_summary: string | null
          tokens_used: number
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          feature: string
          id?: string
          model: string
          owner_id: string
          prompt_summary?: string | null
          tokens_used?: number
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          feature?: string
          id?: string
          model?: string
          owner_id?: string
          prompt_summary?: string | null
          tokens_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_media_cost_unit_reservations: {
        Row: {
          actual_cost_units: number | null
          charged_cost_units: number
          conservatively_settled_at: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          known_not_consumed_at: string | null
          owner_id: string
          provider_start_key: string | null
          provider_started_at: string | null
          refunded_cost_units: number
          reserved_cost_units: number
          reset_date: string
          settled_at: string | null
          settlement_overage_cost_units: number
          status: string
        }
        Insert: {
          actual_cost_units?: number | null
          charged_cost_units?: number
          conservatively_settled_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key: string
          known_not_consumed_at?: string | null
          owner_id: string
          provider_start_key?: string | null
          provider_started_at?: string | null
          refunded_cost_units?: number
          reserved_cost_units: number
          reset_date: string
          settled_at?: string | null
          settlement_overage_cost_units?: number
          status?: string
        }
        Update: {
          actual_cost_units?: number | null
          charged_cost_units?: number
          conservatively_settled_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          known_not_consumed_at?: string | null
          owner_id?: string
          provider_start_key?: string | null
          provider_started_at?: string | null
          refunded_cost_units?: number
          reserved_cost_units?: number
          reset_date?: string
          settled_at?: string | null
          settlement_overage_cost_units?: number
          status?: string
        }
        Relationships: []
      }
      ai_token_budget_reservations: {
        Row: {
          actual_tokens: number | null
          charged_tokens: number
          conservatively_settled_at: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          known_not_consumed_at: string | null
          owner_id: string
          provider_start_key: string | null
          provider_started_at: string | null
          refunded_tokens: number
          reserved_tokens: number
          settled_at: string | null
          settlement_overage_tokens: number
          status: string
          token_reset_date: string
        }
        Insert: {
          actual_tokens?: number | null
          charged_tokens?: number
          conservatively_settled_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key: string
          known_not_consumed_at?: string | null
          owner_id: string
          provider_start_key?: string | null
          provider_started_at?: string | null
          refunded_tokens?: number
          reserved_tokens: number
          settled_at?: string | null
          settlement_overage_tokens?: number
          status?: string
          token_reset_date: string
        }
        Update: {
          actual_tokens?: number | null
          charged_tokens?: number
          conservatively_settled_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          known_not_consumed_at?: string | null
          owner_id?: string
          provider_start_key?: string | null
          provider_started_at?: string | null
          refunded_tokens?: number
          reserved_tokens?: number
          settled_at?: string | null
          settlement_overage_tokens?: number
          status?: string
          token_reset_date?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          event_name: string
          feature: string | null
          id: number
          metadata: Json
          owner_id: string
          route: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event_name: string
          feature?: string | null
          id?: number
          metadata?: Json
          owner_id: string
          route?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event_name?: string
          feature?: string | null
          id?: number
          metadata?: Json
          owner_id?: string
          route?: string | null
        }
        Relationships: []
      }
      ap_exam_plans: {
        Row: {
          active: boolean
          created_at: string
          current_focus: string | null
          exam_date: string
          goal_band: string | null
          id: string
          owner_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          current_focus?: string | null
          exam_date: string
          goal_band?: string | null
          id?: string
          owner_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          current_focus?: string | null
          exam_date?: string
          goal_band?: string | null
          id?: string
          owner_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      ap_practice_attempts: {
        Row: {
          correct_count: number | null
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          plan_id: string | null
          practice_type: string
          practiced_at: string
          score_band: string | null
          subject: string
          total_count: number | null
        }
        Insert: {
          correct_count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          plan_id?: string | null
          practice_type: string
          practiced_at?: string
          score_band?: string | null
          subject: string
          total_count?: number | null
        }
        Update: {
          correct_count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          plan_id?: string | null
          practice_type?: string
          practiced_at?: string
          score_band?: string | null
          subject?: string
          total_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_practice_attempts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ap_exam_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_blocks: {
        Row: {
          assignment_id: string
          block_key: string
          block_type: string
          capability: string
          content: Json
          created_at: string
          document_id: string
          id: string
          label: string
          owner_id: string
          plain_text: string
          position: number
          source_anchors: Json
          updated_at: string
          version: number
        }
        Insert: {
          assignment_id: string
          block_key: string
          block_type: string
          capability: string
          content?: Json
          created_at?: string
          document_id: string
          id?: string
          label: string
          owner_id: string
          plain_text?: string
          position?: number
          source_anchors?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          assignment_id?: string
          block_key?: string
          block_type?: string
          capability?: string
          content?: Json
          created_at?: string
          document_id?: string
          id?: string
          label?: string
          owner_id?: string
          plain_text?: string
          position?: number
          source_anchors?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "artifact_blocks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_blocks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "artifact_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_documents: {
        Row: {
          artifact_type: string
          assignment_id: string
          created_at: string
          id: string
          owner_id: string
          schema_version: number
          state: string
          title: string | null
          updated_at: string
        }
        Insert: {
          artifact_type: string
          assignment_id: string
          created_at?: string
          id?: string
          owner_id: string
          schema_version?: number
          state?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          artifact_type?: string
          assignment_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          schema_version?: number
          state?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_documents_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_revisions: {
        Row: {
          assignment_id: string
          block_id: string
          content: Json
          created_at: string
          document_id: string
          id: string
          owner_id: string
          plain_text: string
          source_anchors: Json
          version: number
        }
        Insert: {
          assignment_id: string
          block_id: string
          content: Json
          created_at?: string
          document_id: string
          id?: string
          owner_id: string
          plain_text?: string
          source_anchors?: Json
          version: number
        }
        Update: {
          assignment_id?: string
          block_id?: string
          content?: Json
          created_at?: string
          document_id?: string
          id?: string
          owner_id?: string
          plain_text?: string
          source_anchors?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "artifact_revisions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_revisions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "artifact_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_revisions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "artifact_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          allotted_minutes: number | null
          attempt_number: number
          auto_score: number | null
          blueprint_id: string
          blueprint_version: number
          confirmed_at: string | null
          confirmed_by: string | null
          expires_at: string | null
          extra_time_pct: number
          final_percent: number | null
          final_score: number | null
          id: string
          last_saved_at: string | null
          points_possible: number | null
          scored_at: string | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          teacher_score: number | null
        }
        Insert: {
          allotted_minutes?: number | null
          attempt_number: number
          auto_score?: number | null
          blueprint_id: string
          blueprint_version: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          expires_at?: string | null
          extra_time_pct?: number
          final_percent?: number | null
          final_score?: number | null
          id?: string
          last_saved_at?: string | null
          points_possible?: number | null
          scored_at?: string | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          teacher_score?: number | null
        }
        Update: {
          allotted_minutes?: number | null
          attempt_number?: number
          auto_score?: number | null
          blueprint_id?: string
          blueprint_version?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          expires_at?: string | null
          extra_time_pct?: number
          final_percent?: number | null
          final_score?: number | null
          id?: string
          last_saved_at?: string | null
          points_possible?: number | null
          scored_at?: string | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          teacher_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "assessment_blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_blueprints: {
        Row: {
          allow_resume: boolean
          course_id: string
          created_at: string
          created_by: string | null
          external_assignment_id: string | null
          feedback_release: string
          id: string
          instructions: string | null
          max_attempts: number
          parent_version_id: string | null
          published_at: string | null
          published_by: string | null
          purpose: string
          release_conditions: Json
          status: string
          time_limit_minutes: number | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          allow_resume?: boolean
          course_id: string
          created_at?: string
          created_by?: string | null
          external_assignment_id?: string | null
          feedback_release?: string
          id?: string
          instructions?: string | null
          max_attempts?: number
          parent_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          purpose?: string
          release_conditions?: Json
          status?: string
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          allow_resume?: boolean
          course_id?: string
          created_at?: string
          created_by?: string | null
          external_assignment_id?: string | null
          feedback_release?: string
          id?: string
          instructions?: string | null
          max_attempts?: number
          parent_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          purpose?: string
          release_conditions?: Json
          status?: string
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_blueprints_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_blueprints_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "assessment_blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_item_objectives: {
        Row: {
          evidence_weight: number
          item_id: string
          objective_id: string
        }
        Insert: {
          evidence_weight?: number
          item_id: string
          objective_id: string
        }
        Update: {
          evidence_weight?: number
          item_id?: string
          objective_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_item_objectives_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "assessment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_item_objectives_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_items: {
        Row: {
          blueprint_id: string
          body: Json
          created_at: string
          id: string
          identifier: string
          interaction_type: string
          points_possible: number
          position: number
          prompt: string
          response_declaration: Json
          title: string
          updated_at: string
        }
        Insert: {
          blueprint_id: string
          body?: Json
          created_at?: string
          id?: string
          identifier: string
          interaction_type: string
          points_possible: number
          position?: number
          prompt: string
          response_declaration?: Json
          title: string
          updated_at?: string
        }
        Update: {
          blueprint_id?: string
          body?: Json
          created_at?: string
          id?: string
          identifier?: string
          interaction_type?: string
          points_possible?: number
          position?: number
          prompt?: string
          response_declaration?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_items_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "assessment_blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          attempt_id: string
          auto_score: number | null
          created_at: string
          id: string
          item_id: string
          scored_at: string | null
          scored_by: string | null
          student_response: Json
          teacher_feedback: string | null
          teacher_score: number | null
          updated_at: string
        }
        Insert: {
          attempt_id: string
          auto_score?: number | null
          created_at?: string
          id?: string
          item_id: string
          scored_at?: string | null
          scored_by?: string | null
          student_response?: Json
          teacher_feedback?: string | null
          teacher_score?: number | null
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          auto_score?: number | null
          created_at?: string
          id?: string
          item_id?: string
          scored_at?: string | null
          scored_by?: string | null
          student_response?: Json
          teacher_feedback?: string | null
          teacher_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "assessment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_checklists: {
        Row: {
          assignment_id: string
          id: string
          items: Json
          owner_id: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          id?: string
          items?: Json
          owner_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          id?: string
          items?: Json
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_checklists_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_intentions: {
        Row: {
          assignment_id: string
          created_at: string
          cue_text: string
          cue_type: string
          fired_at: string | null
          id: string
          owner_id: string
          scheduled_for: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string
          cue_text: string
          cue_type: string
          fired_at?: string | null
          id?: string
          owner_id: string
          scheduled_for?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string
          cue_text?: string
          cue_type?: string
          fired_at?: string | null
          id?: string
          owner_id?: string
          scheduled_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_intentions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_media_upload_candidates: {
        Row: {
          assignment_id: string
          claim_epoch: number
          claim_token: string
          cleanup_attempts: number
          cleanup_claim_expires_at: string | null
          cleanup_claim_token: string | null
          cleanup_dead_lettered_at: string | null
          cleanup_last_error: string | null
          cleanup_next_attempt_at: string
          cleanup_requested_at: string | null
          cleanup_started_at: string | null
          closed_at: string | null
          created_at: string
          last_absence_confirmed_at: string | null
          lease_expires_at: string
          owner_id: string
          promoted_at: string | null
          quiescence_not_before: string
          removed_at: string | null
          storage_key: string
          upload_id: string
        }
        Insert: {
          assignment_id: string
          claim_epoch: number
          claim_token: string
          cleanup_attempts?: number
          cleanup_claim_expires_at?: string | null
          cleanup_claim_token?: string | null
          cleanup_dead_lettered_at?: string | null
          cleanup_last_error?: string | null
          cleanup_next_attempt_at: string
          cleanup_requested_at?: string | null
          cleanup_started_at?: string | null
          closed_at?: string | null
          created_at?: string
          last_absence_confirmed_at?: string | null
          lease_expires_at: string
          owner_id: string
          promoted_at?: string | null
          quiescence_not_before: string
          removed_at?: string | null
          storage_key: string
          upload_id: string
        }
        Update: {
          assignment_id?: string
          claim_epoch?: number
          claim_token?: string
          cleanup_attempts?: number
          cleanup_claim_expires_at?: string | null
          cleanup_claim_token?: string | null
          cleanup_dead_lettered_at?: string | null
          cleanup_last_error?: string | null
          cleanup_next_attempt_at?: string
          cleanup_requested_at?: string | null
          cleanup_started_at?: string | null
          closed_at?: string | null
          created_at?: string
          last_absence_confirmed_at?: string | null
          lease_expires_at?: string
          owner_id?: string
          promoted_at?: string | null
          quiescence_not_before?: string
          removed_at?: string | null
          storage_key?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_media_upload_candidates_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_media_upload_candidates_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "assignment_media_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_media_uploads: {
        Row: {
          assignment_id: string
          claim_epoch: number
          claim_expires_at: string | null
          claim_token: string | null
          claimed_at: string | null
          cleanup_attempts: number
          cleanup_completed_at: string | null
          cleanup_dead_letter_error_code: string | null
          cleanup_dead_lettered_at: string | null
          cleanup_last_error: string | null
          cleanup_next_attempt_at: string
          cleanup_quiescence_not_before: string | null
          cleanup_requested_at: string | null
          cleanup_state: string
          consent_confirmed_at: string
          created_at: string
          declared_mime_type: string
          declared_size_bytes: number
          discarded_at: string | null
          durable_removed_at: string | null
          durable_storage_key: string | null
          expires_at: string
          file_name: string
          finalized_at: string | null
          id: string
          media_kind: string
          owner_id: string
          signed_upload_expires_at: string | null
          storage_key: string
          temporary_removed_at: string | null
          token_issuance_failed_at: string | null
        }
        Insert: {
          assignment_id: string
          claim_epoch?: number
          claim_expires_at?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          cleanup_attempts?: number
          cleanup_completed_at?: string | null
          cleanup_dead_letter_error_code?: string | null
          cleanup_dead_lettered_at?: string | null
          cleanup_last_error?: string | null
          cleanup_next_attempt_at?: string
          cleanup_quiescence_not_before?: string | null
          cleanup_requested_at?: string | null
          cleanup_state?: string
          consent_confirmed_at: string
          created_at?: string
          declared_mime_type: string
          declared_size_bytes: number
          discarded_at?: string | null
          durable_removed_at?: string | null
          durable_storage_key?: string | null
          expires_at?: string
          file_name: string
          finalized_at?: string | null
          id: string
          media_kind: string
          owner_id: string
          signed_upload_expires_at?: string | null
          storage_key: string
          temporary_removed_at?: string | null
          token_issuance_failed_at?: string | null
        }
        Update: {
          assignment_id?: string
          claim_epoch?: number
          claim_expires_at?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          cleanup_attempts?: number
          cleanup_completed_at?: string | null
          cleanup_dead_letter_error_code?: string | null
          cleanup_dead_lettered_at?: string | null
          cleanup_last_error?: string | null
          cleanup_next_attempt_at?: string
          cleanup_quiescence_not_before?: string | null
          cleanup_requested_at?: string | null
          cleanup_state?: string
          consent_confirmed_at?: string
          created_at?: string
          declared_mime_type?: string
          declared_size_bytes?: number
          discarded_at?: string | null
          durable_removed_at?: string | null
          durable_storage_key?: string | null
          expires_at?: string
          file_name?: string
          finalized_at?: string | null
          id?: string
          media_kind?: string
          owner_id?: string
          signed_upload_expires_at?: string | null
          storage_key?: string
          temporary_removed_at?: string | null
          token_issuance_failed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_media_uploads_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_objectives: {
        Row: {
          assignment_id: string
          created_at: string
          evidence_weight: number
          objective_id: string
          owner_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          evidence_weight?: number
          objective_id: string
          owner_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          evidence_weight?: number
          objective_id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_objectives_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_objectives_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_problems: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          owner_id: string
          problem_number: number
          problem_text: string
          scaffold: Json | null
          source: string
          student_work: Json
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          owner_id: string
          problem_number: number
          problem_text: string
          scaffold?: Json | null
          source?: string
          student_work?: Json
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          problem_number?: number
          problem_text?: string
          scaffold?: Json | null
          source?: string
          student_work?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_problems_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_source_chunks: {
        Row: {
          assignment_id: string
          content: string
          created_at: string
          id: string
          ordinal: number
          owner_id: string
          page_label: string | null
          source_id: string
        }
        Insert: {
          assignment_id: string
          content: string
          created_at?: string
          id?: string
          ordinal: number
          owner_id: string
          page_label?: string | null
          source_id: string
        }
        Update: {
          assignment_id?: string
          content?: string
          created_at?: string
          id?: string
          ordinal?: number
          owner_id?: string
          page_label?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_source_chunks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_source_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "assignment_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_sources: {
        Row: {
          assignment_id: string
          created_at: string
          error_message: string | null
          external_id: string | null
          extracted_text: string | null
          id: string
          import_status: string
          materialization_claim_expires_at: string | null
          materialization_claim_token: string | null
          mime_type: string | null
          owner_id: string
          provider: string | null
          source_location: string | null
          source_type: string
          storage_key: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          extracted_text?: string | null
          id?: string
          import_status?: string
          materialization_claim_expires_at?: string | null
          materialization_claim_token?: string | null
          mime_type?: string | null
          owner_id: string
          provider?: string | null
          source_location?: string | null
          source_type: string
          storage_key?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          extracted_text?: string | null
          id?: string
          import_status?: string
          materialization_claim_expires_at?: string | null
          materialization_claim_token?: string | null
          mime_type?: string | null
          owner_id?: string
          provider?: string | null
          source_location?: string | null
          source_type?: string
          storage_key?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_sources_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_steps: {
        Row: {
          assignment_id: string
          generated_at: string
          id: string
          owner_id: string
          steps: Json
          updated_at: string
        }
        Insert: {
          assignment_id: string
          generated_at?: string
          id?: string
          owner_id: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          generated_at?: string
          id?: string
          owner_id?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_steps_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submission_files: {
        Row: {
          assignment_id: string
          byte_size: number
          canonical_mime_type: string | null
          created_at: string
          filename: string
          id: string
          integrity_bound_at: string | null
          integrity_status: string
          mime_type: string | null
          owner_id: string
          sha256_digest: string | null
          storage_bucket: string | null
          storage_key: string
          storage_version: string | null
        }
        Insert: {
          assignment_id: string
          byte_size: number
          canonical_mime_type?: string | null
          created_at?: string
          filename: string
          id?: string
          integrity_bound_at?: string | null
          integrity_status?: string
          mime_type?: string | null
          owner_id: string
          sha256_digest?: string | null
          storage_bucket?: string | null
          storage_key: string
          storage_version?: string | null
        }
        Update: {
          assignment_id?: string
          byte_size?: number
          canonical_mime_type?: string | null
          created_at?: string
          filename?: string
          id?: string
          integrity_bound_at?: string | null
          integrity_status?: string
          mime_type?: string | null
          owner_id?: string
          sha256_digest?: string | null
          storage_bucket?: string | null
          storage_key?: string
          storage_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submission_files_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submission_receipts: {
        Row: {
          assignment_id: string
          capability: string
          created_at: string
          detail: string | null
          id: string
          idempotency_key: string
          owner_id: string
          provider: string
          provider_receipt_id: string | null
          provider_response: Json
          status: string
          submission_file_id: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          capability: string
          created_at?: string
          detail?: string | null
          id?: string
          idempotency_key: string
          owner_id: string
          provider: string
          provider_receipt_id?: string | null
          provider_response?: Json
          status: string
          submission_file_id?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          capability?: string
          created_at?: string
          detail?: string | null
          id?: string
          idempotency_key?: string
          owner_id?: string
          provider?: string
          provider_receipt_id?: string | null
          provider_response?: Json
          status?: string
          submission_file_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submission_receipts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submission_receipts_submission_file_id_fkey"
            columns: ["submission_file_id"]
            isOneToOne: false
            referencedRelation: "assignment_submission_files"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_templates: {
        Row: {
          checklist_items: Json
          created_at: string
          id: string
          kind: string
          name: string
          rubric_items: Json
        }
        Insert: {
          checklist_items?: Json
          created_at?: string
          id?: string
          kind: string
          name: string
          rubric_items?: Json
        }
        Update: {
          checklist_items?: Json
          created_at?: string
          id?: string
          kind?: string
          name?: string
          rubric_items?: Json
        }
        Relationships: []
      }
      assignment_time_log: {
        Row: {
          assignment_id: string
          edited_by_student: boolean
          elapsed_minutes: number | null
          ended_at: string | null
          id: number
          owner_id: string
          started_at: string
        }
        Insert: {
          assignment_id: string
          edited_by_student?: boolean
          elapsed_minutes?: number | null
          ended_at?: string | null
          id?: number
          owner_id: string
          started_at?: string
        }
        Update: {
          assignment_id?: string
          edited_by_student?: boolean
          elapsed_minutes?: number | null
          ended_at?: string | null
          id?: number
          owner_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_time_log_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_type_estimates: {
        Row: {
          kind: string
          mean_minutes: number
          n_samples: number
          owner_id: string
          updated_at: string
        }
        Insert: {
          kind: string
          mean_minutes?: number
          n_samples?: number
          owner_id: string
          updated_at?: string
        }
        Update: {
          kind?: string
          mean_minutes?: number
          n_samples?: number
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          ai_mode_override: string | null
          ai_policy_override: string | null
          assignment_profile: Json | null
          assignment_profile_version: number
          assignment_type: string | null
          class_id: string
          course_mode_assignment_id: string | null
          course_mode_course_id: string | null
          created_at: string
          description: string | null
          difficulty: number | null
          due_at: string | null
          estimated_minutes: number | null
          external_id: string | null
          external_source: string | null
          external_url: string | null
          id: string
          kind: string
          last_shown_at: string | null
          last_synced_at: string | null
          last_thought: string | null
          owner_id: string
          parent_assignment_id: string | null
          pivot_note: string | null
          provider_assignment_id: string | null
          reading_load: number
          rubric_id: string | null
          rubric_text: string | null
          saved_work: Json
          source_import_status: string
          state: string | null
          status: string
          submission_proof_path: string | null
          submission_sync_status: string | null
          submission_synced_at: string | null
          submission_url: string | null
          submitted_at: string | null
          title: string
          updated_at: string
          work_profile: string | null
          work_profile_source: string | null
          writing_load: number
        }
        Insert: {
          ai_mode_override?: string | null
          ai_policy_override?: string | null
          assignment_profile?: Json | null
          assignment_profile_version?: number
          assignment_type?: string | null
          class_id: string
          course_mode_assignment_id?: string | null
          course_mode_course_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: number | null
          due_at?: string | null
          estimated_minutes?: number | null
          external_id?: string | null
          external_source?: string | null
          external_url?: string | null
          id?: string
          kind?: string
          last_shown_at?: string | null
          last_synced_at?: string | null
          last_thought?: string | null
          owner_id: string
          parent_assignment_id?: string | null
          pivot_note?: string | null
          provider_assignment_id?: string | null
          reading_load?: number
          rubric_id?: string | null
          rubric_text?: string | null
          saved_work?: Json
          source_import_status?: string
          state?: string | null
          status?: string
          submission_proof_path?: string | null
          submission_sync_status?: string | null
          submission_synced_at?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          title: string
          updated_at?: string
          work_profile?: string | null
          work_profile_source?: string | null
          writing_load?: number
        }
        Update: {
          ai_mode_override?: string | null
          ai_policy_override?: string | null
          assignment_profile?: Json | null
          assignment_profile_version?: number
          assignment_type?: string | null
          class_id?: string
          course_mode_assignment_id?: string | null
          course_mode_course_id?: string | null
          created_at?: string
          description?: string | null
          difficulty?: number | null
          due_at?: string | null
          estimated_minutes?: number | null
          external_id?: string | null
          external_source?: string | null
          external_url?: string | null
          id?: string
          kind?: string
          last_shown_at?: string | null
          last_synced_at?: string | null
          last_thought?: string | null
          owner_id?: string
          parent_assignment_id?: string | null
          pivot_note?: string | null
          provider_assignment_id?: string | null
          reading_load?: number
          rubric_id?: string | null
          rubric_text?: string | null
          saved_work?: Json
          source_import_status?: string
          state?: string | null
          status?: string
          submission_proof_path?: string | null
          submission_sync_status?: string | null
          submission_synced_at?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          title?: string
          updated_at?: string
          work_profile?: string | null
          work_profile_source?: string | null
          writing_load?: number
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_course_mode_assignment_id_fkey"
            columns: ["course_mode_assignment_id"]
            isOneToOne: false
            referencedRelation: "course_mode_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_course_mode_course_id_fkey"
            columns: ["course_mode_course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_parent_assignment_id_fkey"
            columns: ["parent_assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      authorship_log: {
        Row: {
          actor: string
          assignment_id: string | null
          created_at: string
          event_type: string
          id: string
          owner_id: string
          payload: Json
          source_artifact_id: string | null
        }
        Insert: {
          actor: string
          assignment_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          owner_id: string
          payload?: Json
          source_artifact_id?: string | null
        }
        Update: {
          actor?: string
          assignment_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          owner_id?: string
          payload?: Json
          source_artifact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authorship_log_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorship_log_source_artifact_id_fkey"
            columns: ["source_artifact_id"]
            isOneToOne: false
            referencedRelation: "study_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      canva_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          owner_id: string
          refresh_token: string
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          owner_id: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          owner_id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      class_documents: {
        Row: {
          class_id: string
          extracted_text: string | null
          id: string
          kind: string | null
          storage_path: string | null
          title: string | null
          uploaded_at: string | null
        }
        Insert: {
          class_id: string
          extracted_text?: string | null
          id?: string
          kind?: string | null
          storage_path?: string | null
          title?: string | null
          uploaded_at?: string | null
        }
        Update: {
          class_id?: string
          extracted_text?: string | null
          id?: string
          kind?: string | null
          storage_path?: string | null
          title?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_documents_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_roster_members: {
        Row: {
          class_id: string
          consent_visible: boolean
          created_at: string
          display_name: string
          email: string | null
          id: string
          owner_id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          class_id: string
          consent_visible?: boolean
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          owner_id: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          consent_visible?: boolean
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          owner_id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_roster_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_syllabi: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          owner_id: string
          parsed: Json | null
          raw_text: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          owner_id: string
          parsed?: Json | null
          raw_text?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          parsed?: Json | null
          raw_text?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_syllabi_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          ai_mode: string
          ai_policy: string | null
          archived_at: string | null
          color: string
          course_mode_course_id: string | null
          created_at: string
          external_id: string | null
          external_source: string | null
          external_url: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          rubric_summary: Json | null
          rubric_summary_cache_key: string | null
          schedule_text: string | null
          subject_category: string | null
          teacher: string | null
          updated_at: string
        }
        Insert: {
          ai_mode?: string
          ai_policy?: string | null
          archived_at?: string | null
          color?: string
          course_mode_course_id?: string | null
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          external_url?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          rubric_summary?: Json | null
          rubric_summary_cache_key?: string | null
          schedule_text?: string | null
          subject_category?: string | null
          teacher?: string | null
          updated_at?: string
        }
        Update: {
          ai_mode?: string
          ai_policy?: string | null
          archived_at?: string | null
          color?: string
          course_mode_course_id?: string | null
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          external_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          rubric_summary?: Json | null
          rubric_summary_cache_key?: string | null
          schedule_text?: string | null
          subject_category?: string | null
          teacher?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_mode_course_id_fkey"
            columns: ["course_mode_course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_notes: {
        Row: {
          body_text: string
          created_at: string
          group_id: string
          id: string
          owner_id: string
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          body_text?: string
          created_at?: string
          group_id: string
          id?: string
          owner_id: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          body_text?: string
          created_at?: string
          group_id?: string
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      competitive_benchmark_runs: {
        Row: {
          competitor_pattern: string
          created_at: string
          id: string
          observations: Json
          owner_id: string | null
          passed: boolean
          run_label: string
          scenario_id: string
          score: Json
        }
        Insert: {
          competitor_pattern: string
          created_at?: string
          id?: string
          observations?: Json
          owner_id?: string | null
          passed?: boolean
          run_label?: string
          scenario_id: string
          score?: Json
        }
        Update: {
          competitor_pattern?: string
          created_at?: string
          id?: string
          observations?: Json
          owner_id?: string | null
          passed?: boolean
          run_label?: string
          scenario_id?: string
          score?: Json
        }
        Relationships: []
      }
      course_grading_rules: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assessment_blueprint_id: string
          course_id: string
          created_at: string
          created_by: string | null
          grading_period: string
          id: string
          parent_version_id: string | null
          status: string
          updated_at: string
          version: number
          weight: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_blueprint_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
          grading_period: string
          id?: string
          parent_version_id?: string | null
          status?: string
          updated_at?: string
          version?: number
          weight: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_blueprint_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          grading_period?: string
          id?: string
          parent_version_id?: string | null
          status?: string
          updated_at?: string
          version?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_grading_rules_assessment_blueprint_id_fkey"
            columns: ["assessment_blueprint_id"]
            isOneToOne: false
            referencedRelation: "assessment_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grading_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grading_rules_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "course_grading_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mode_assignments: {
        Row: {
          artifact_contract: Json
          assessment_blueprint_id: string | null
          assignment_kind: string
          assignment_profile: Json
          course_id: string
          created_at: string
          created_by: string | null
          due_at: string | null
          estimated_minutes: number | null
          external_assignment_id: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          parent_version_id: string | null
          published_at: string | null
          published_by: string | null
          rubric_text: string | null
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          artifact_contract?: Json
          assessment_blueprint_id?: string | null
          assignment_kind?: string
          assignment_profile?: Json
          course_id: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          estimated_minutes?: number | null
          external_assignment_id?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          parent_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          rubric_text?: string | null
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          artifact_contract?: Json
          assessment_blueprint_id?: string | null
          assignment_kind?: string
          assignment_profile?: Json
          course_id?: string
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          estimated_minutes?: number | null
          external_assignment_id?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          parent_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          rubric_text?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_mode_assignments_assessment_blueprint_id_fkey"
            columns: ["assessment_blueprint_id"]
            isOneToOne: false
            referencedRelation: "assessment_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_mode_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_assignments_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "course_mode_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mode_courses: {
        Row: {
          course_level: string | null
          created_at: string
          created_by: string | null
          grade_band: string
          id: string
          jurisdiction_code: string | null
          organization_id: string
          parent_version_id: string | null
          published_at: string | null
          published_by: string | null
          retired_at: string | null
          standards_framework_id: string | null
          status: string
          subject_domain: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          course_level?: string | null
          created_at?: string
          created_by?: string | null
          grade_band: string
          id?: string
          jurisdiction_code?: string | null
          organization_id: string
          parent_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          retired_at?: string | null
          standards_framework_id?: string | null
          status?: string
          subject_domain: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          course_level?: string | null
          created_at?: string
          created_by?: string | null
          grade_band?: string
          id?: string
          jurisdiction_code?: string | null
          organization_id?: string
          parent_version_id?: string | null
          published_at?: string | null
          published_by?: string | null
          retired_at?: string | null
          standards_framework_id?: string | null
          status?: string
          subject_domain?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_mode_courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_courses_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_courses_standards_framework_id_fkey"
            columns: ["standards_framework_id"]
            isOneToOne: false
            referencedRelation: "standards_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mode_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          enrollment_role: string
          id: string
          membership_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          enrollment_role: string
          id?: string
          membership_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          enrollment_role?: string
          id?: string
          membership_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_mode_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_enrollments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mode_lesson_objectives: {
        Row: {
          alignment_type: string
          lesson_id: string
          objective_id: string
        }
        Insert: {
          alignment_type?: string
          lesson_id: string
          objective_id: string
        }
        Update: {
          alignment_type?: string
          lesson_id?: string
          objective_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_mode_lesson_objectives_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_mode_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_lesson_objectives_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mode_lesson_progress: {
        Row: {
          completed_at: string | null
          evidence: Json
          id: string
          lesson_id: string
          started_at: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          evidence?: Json
          id?: string
          lesson_id: string
          started_at?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          evidence?: Json
          id?: string
          lesson_id?: string
          started_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_mode_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_mode_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mode_lesson_resources: {
        Row: {
          content_text: string | null
          created_at: string
          id: string
          lesson_id: string
          position: number
          provenance: Json
          resource_type: string
          source_uri: string | null
          storage_path: string | null
          title: string
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          position?: number
          provenance?: Json
          resource_type: string
          source_uri?: string | null
          storage_path?: string | null
          title: string
        }
        Update: {
          content_text?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          position?: number
          provenance?: Json
          resource_type?: string
          source_uri?: string | null
          storage_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_mode_lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_mode_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mode_lessons: {
        Row: {
          accessibility_variants: Json
          created_at: string
          created_by: string | null
          estimated_minutes: number | null
          id: string
          parent_version_id: string | null
          position: number
          published_at: string | null
          published_by: string | null
          status: string
          summary: string | null
          title: string
          unit_id: string
          updated_at: string
          version: number
        }
        Insert: {
          accessibility_variants?: Json
          created_at?: string
          created_by?: string | null
          estimated_minutes?: number | null
          id?: string
          parent_version_id?: string | null
          position?: number
          published_at?: string | null
          published_by?: string | null
          status?: string
          summary?: string | null
          title: string
          unit_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          accessibility_variants?: Json
          created_at?: string
          created_by?: string | null
          estimated_minutes?: number | null
          id?: string
          parent_version_id?: string | null
          position?: number
          published_at?: string | null
          published_by?: string | null
          status?: string
          summary?: string | null
          title?: string
          unit_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_mode_lessons_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "course_mode_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "course_mode_units"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mode_lms_links: {
        Row: {
          connection_id: string
          course_id: string
          created_at: string
          created_by: string | null
          external_course_id: string
          id: string
          provider: string
        }
        Insert: {
          connection_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
          external_course_id: string
          id?: string
          provider: string
        }
        Update: {
          connection_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          external_course_id?: string
          id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_mode_lms_links_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "lms_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_lms_links_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_mode_units: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          id: string
          parent_version_id: string | null
          position: number
          published_at: string | null
          published_by: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          parent_version_id?: string | null
          position?: number
          published_at?: string | null
          published_by?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          parent_version_id?: string | null
          position?: number
          published_at?: string | null
          published_by?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_mode_units_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_mode_units_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "course_mode_units"
            referencedColumns: ["id"]
          },
        ]
      }
      criterion_scores: {
        Row: {
          attempt_id: string
          confirmed_at: string
          confirmed_by: string | null
          criterion_identifier: string
          id: string
          label: string
          points_awarded: number
          points_possible: number
          rationale: string | null
        }
        Insert: {
          attempt_id: string
          confirmed_at?: string
          confirmed_by?: string | null
          criterion_identifier: string
          id?: string
          label: string
          points_awarded: number
          points_possible: number
          rationale?: string | null
        }
        Update: {
          attempt_id?: string
          confirmed_at?: string
          confirmed_by?: string | null
          criterion_identifier?: string
          id?: string
          label?: string
          points_awarded?: number
          points_possible?: number
          rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criterion_scores_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_runs: {
        Row: {
          completed_at: string | null
          correlation_id: string
          dead_letter_count: number
          dead_letter_signaled: boolean
          error_code: string | null
          error_summary: string | null
          failed_count: number
          job_name: string
          processed_count: number
          retry_count: number
          retry_signaled: boolean
          route_name: string
          run_id: string
          started_at: string
          status: string
          succeeded_count: number
        }
        Insert: {
          completed_at?: string | null
          correlation_id: string
          dead_letter_count?: number
          dead_letter_signaled?: boolean
          error_code?: string | null
          error_summary?: string | null
          failed_count?: number
          job_name: string
          processed_count?: number
          retry_count?: number
          retry_signaled?: boolean
          route_name: string
          run_id?: string
          started_at?: string
          status?: string
          succeeded_count?: number
        }
        Update: {
          completed_at?: string | null
          correlation_id?: string
          dead_letter_count?: number
          dead_letter_signaled?: boolean
          error_code?: string | null
          error_summary?: string | null
          failed_count?: number
          job_name?: string
          processed_count?: number
          retry_count?: number
          retry_signaled?: boolean
          route_name?: string
          run_id?: string
          started_at?: string
          status?: string
          succeeded_count?: number
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          ai_disabled_at: string | null
          export_offered: boolean
          id: string
          notes: string | null
          owner_id: string | null
          purge_attempted_at: string | null
          purge_claim_expires_at: string | null
          purge_claim_token: string | null
          purge_completed_at: string | null
          purge_failure_code: string | null
          purge_manifest_version: number | null
          purge_phase: string
          requested_at: string
          status: string
          storage_objects_deleted: number
          storage_purge_verified_at: string | null
        }
        Insert: {
          ai_disabled_at?: string | null
          export_offered?: boolean
          id?: string
          notes?: string | null
          owner_id?: string | null
          purge_attempted_at?: string | null
          purge_claim_expires_at?: string | null
          purge_claim_token?: string | null
          purge_completed_at?: string | null
          purge_failure_code?: string | null
          purge_manifest_version?: number | null
          purge_phase?: string
          requested_at?: string
          status?: string
          storage_objects_deleted?: number
          storage_purge_verified_at?: string | null
        }
        Update: {
          ai_disabled_at?: string | null
          export_offered?: boolean
          id?: string
          notes?: string | null
          owner_id?: string | null
          purge_attempted_at?: string | null
          purge_claim_expires_at?: string | null
          purge_claim_token?: string | null
          purge_completed_at?: string | null
          purge_failure_code?: string | null
          purge_manifest_version?: number | null
          purge_phase?: string
          requested_at?: string
          status?: string
          storage_objects_deleted?: number
          storage_purge_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_deletion_requests_purge_manifest_version_fkey"
            columns: ["purge_manifest_version"]
            isOneToOne: false
            referencedRelation: "account_deletion_manifest_versions"
            referencedColumns: ["manifest_version"]
          },
        ]
      }
      data_retention_runs: {
        Row: {
          completed_requests: number
          due_requests: number
          failed_requests: number
          id: string
          manifest_version: number | null
          notes: string | null
          ran_at: string
        }
        Insert: {
          completed_requests?: number
          due_requests?: number
          failed_requests?: number
          id?: string
          manifest_version?: number | null
          notes?: string | null
          ran_at?: string
        }
        Update: {
          completed_requests?: number
          due_requests?: number
          failed_requests?: number
          id?: string
          manifest_version?: number | null
          notes?: string | null
          ran_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_runs_manifest_version_fkey"
            columns: ["manifest_version"]
            isOneToOne: false
            referencedRelation: "account_deletion_manifest_versions"
            referencedColumns: ["manifest_version"]
          },
        ]
      }
      error_events: {
        Row: {
          created_at: string
          diagnosis_tags: string[]
          id: number
          message: string
          owner_id: string
          route: string | null
          severity: string
          stack: string | null
        }
        Insert: {
          created_at?: string
          diagnosis_tags?: string[]
          id?: number
          message: string
          owner_id: string
          route?: string | null
          severity?: string
          stack?: string | null
        }
        Update: {
          created_at?: string
          diagnosis_tags?: string[]
          id?: number
          message?: string
          owner_id?: string
          route?: string | null
          severity?: string
          stack?: string | null
        }
        Relationships: []
      }
      experiments: {
        Row: {
          allocation_pct: number
          created_at: string
          description: string | null
          enabled: boolean
          experiment_key: string
          id: string
          owner_id: string
          surface: string
          updated_at: string
          variants: Json
        }
        Insert: {
          allocation_pct?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          experiment_key: string
          id?: string
          owner_id: string
          surface?: string
          updated_at?: string
          variants?: Json
        }
        Update: {
          allocation_pct?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          experiment_key?: string
          id?: string
          owner_id?: string
          surface?: string
          updated_at?: string
          variants?: Json
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          audience: string
          created_at: string
          description: string | null
          enabled: boolean
          flag_key: string
          id: string
          owner_id: string
          rollout_pct: number
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          flag_key: string
          id?: string
          owner_id: string
          rollout_pct?: number
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          flag_key?: string
          id?: string
          owner_id?: string
          rollout_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      final_grade_records: {
        Row: {
          calculated_percent: number | null
          calculation_summary: Json
          confirmed_at: string
          confirmed_by: string | null
          course_id: string
          created_at: string
          final_percent: number
          grading_period: string
          id: string
          letter_grade: string | null
          status: string
          student_id: string
          supersedes_id: string | null
          version: number
        }
        Insert: {
          calculated_percent?: number | null
          calculation_summary?: Json
          confirmed_at?: string
          confirmed_by?: string | null
          course_id: string
          created_at?: string
          final_percent: number
          grading_period: string
          id?: string
          letter_grade?: string | null
          status?: string
          student_id: string
          supersedes_id?: string | null
          version?: number
        }
        Update: {
          calculated_percent?: number | null
          calculation_summary?: Json
          confirmed_at?: string
          confirmed_by?: string | null
          course_id?: string
          created_at?: string
          final_percent?: number
          grading_period?: string
          id?: string
          letter_grade?: string | null
          status?: string
          student_id?: string
          supersedes_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "final_grade_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "final_grade_records_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "final_grade_records"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          card_id: string
          difficulty: number
          elapsed_days: number
          id: number
          lapses: number
          owner_id: string
          rating: number
          reps: number
          reviewed_at: string
          scheduled_days: number
          scheduled_for: string
          stability: number
          state: string
        }
        Insert: {
          card_id: string
          difficulty: number
          elapsed_days: number
          id?: number
          lapses: number
          owner_id: string
          rating: number
          reps: number
          reviewed_at?: string
          scheduled_days: number
          scheduled_for: string
          stability: number
          state: string
        }
        Update: {
          card_id?: string
          difficulty?: number
          elapsed_days?: number
          id?: number
          lapses?: number
          owner_id?: string
          rating?: number
          reps?: number
          reviewed_at?: string
          scheduled_days?: number
          scheduled_for?: string
          stability?: number
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          ai_contribution_level: string
          back: string
          concept_id: string | null
          created_at: string
          difficulty: number
          due_at: string
          front: string
          id: string
          image_storage_key: string | null
          lapses: number
          last_review_at: string | null
          owner_id: string
          reps: number
          source_anchor: string | null
          source_artifact_id: string | null
          source_assignment_id: string | null
          source_note_id: string | null
          stability: number
          state: string
          student_required_action: string | null
          updated_at: string
        }
        Insert: {
          ai_contribution_level?: string
          back: string
          concept_id?: string | null
          created_at?: string
          difficulty?: number
          due_at?: string
          front: string
          id?: string
          image_storage_key?: string | null
          lapses?: number
          last_review_at?: string | null
          owner_id: string
          reps?: number
          source_anchor?: string | null
          source_artifact_id?: string | null
          source_assignment_id?: string | null
          source_note_id?: string | null
          stability?: number
          state?: string
          student_required_action?: string | null
          updated_at?: string
        }
        Update: {
          ai_contribution_level?: string
          back?: string
          concept_id?: string | null
          created_at?: string
          difficulty?: number
          due_at?: string
          front?: string
          id?: string
          image_storage_key?: string | null
          lapses?: number
          last_review_at?: string | null
          owner_id?: string
          reps?: number
          source_anchor?: string | null
          source_artifact_id?: string | null
          source_assignment_id?: string | null
          source_note_id?: string | null
          stability?: number
          state?: string
          student_required_action?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "mastery_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_source_artifact_id_fkey"
            columns: ["source_artifact_id"]
            isOneToOne: false
            referencedRelation: "study_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_source_assignment_id_fkey"
            columns: ["source_assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_change_events: {
        Row: {
          changed_at: string
          changed_by: string | null
          course_id: string
          grade_kind: string
          grade_record_id: string
          id: string
          next_value: Json
          prior_value: Json | null
          reason: string
          student_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          course_id: string
          grade_kind: string
          grade_record_id: string
          id?: string
          next_value: Json
          prior_value?: Json | null
          reason: string
          student_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          course_id?: string
          grade_kind?: string
          grade_record_id?: string
          id?: string
          next_value?: Json
          prior_value?: Json | null
          reason?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_change_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      group_project_tasks: {
        Row: {
          assignee_name: string | null
          created_at: string
          due_at: string | null
          group_id: string
          id: string
          owner_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_name?: string | null
          created_at?: string
          due_at?: string | null
          group_id: string
          id?: string
          owner_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_name?: string | null
          created_at?: string
          due_at?: string | null
          group_id?: string
          id?: string
          owner_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_project_tasks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      iep_imports: {
        Row: {
          applied_at: string
          created_at: string
          extracted_summary: Json
          id: string
          owner_id: string
          source_name: string | null
        }
        Insert: {
          applied_at?: string
          created_at?: string
          extracted_summary?: Json
          id?: string
          owner_id: string
          source_name?: string | null
        }
        Update: {
          applied_at?: string
          created_at?: string
          extracted_summary?: Json
          id?: string
          owner_id?: string
          source_name?: string | null
        }
        Relationships: []
      }
      inbox_items: {
        Row: {
          assignment_id: string | null
          capture_mode: string
          classified_at: string | null
          created_at: string
          id: string
          owner_id: string
          photo_storage_key: string | null
          raw: string
          source_note_id: string | null
          status: string
          suggested_class_id: string | null
          suggested_due_at: string | null
          suggested_kind: string | null
          suggestion_confidence: number | null
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          capture_mode?: string
          classified_at?: string | null
          created_at?: string
          id?: string
          owner_id: string
          photo_storage_key?: string | null
          raw: string
          source_note_id?: string | null
          status?: string
          suggested_class_id?: string | null
          suggested_due_at?: string | null
          suggested_kind?: string | null
          suggestion_confidence?: number | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          capture_mode?: string
          classified_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          photo_storage_key?: string | null
          raw?: string
          source_note_id?: string | null
          status?: string
          suggested_class_id?: string | null
          suggested_due_at?: string | null
          suggested_kind?: string | null
          suggestion_confidence?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_ai_suggested_class_id_fkey"
            columns: ["suggested_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_user_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          access_token: string | null
          canva_connection_owner_id: string | null
          created_at: string
          credential_key: string
          id: string
          lms_connection_id: string | null
          owner_id: string
          provider: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          canva_connection_owner_id?: string | null
          created_at?: string
          credential_key: string
          id?: string
          lms_connection_id?: string | null
          owner_id: string
          provider: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          canva_connection_owner_id?: string | null
          created_at?: string
          credential_key?: string
          id?: string
          lms_connection_id?: string | null
          owner_id?: string
          provider?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_canva_connection_owner_id_fkey"
            columns: ["canva_connection_owner_id"]
            isOneToOne: false
            referencedRelation: "canva_connections"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "integration_credentials_lms_owner_fkey"
            columns: ["lms_connection_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "lms_connections"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      landing_page_drafts: {
        Row: {
          config: Json
          created_at: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config: Json
          created_at?: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      landing_page_publications: {
        Row: {
          config: Json
          created_at: string
          published_at: string
          published_by: string | null
          slug: string
        }
        Insert: {
          config: Json
          created_at?: string
          published_at?: string
          published_by?: string | null
          slug: string
        }
        Update: {
          config?: Json
          created_at?: string
          published_at?: string
          published_by?: string | null
          slug?: string
        }
        Relationships: []
      }
      learner_profile_snapshots: {
        Row: {
          computed_at: string
          confidence_json: Json
          created_at: string
          id: string
          owner_id: string
          profile_json: Json
          source_counts_json: Json
          version: number
        }
        Insert: {
          computed_at?: string
          confidence_json?: Json
          created_at?: string
          id?: string
          owner_id: string
          profile_json?: Json
          source_counts_json?: Json
          version?: number
        }
        Update: {
          computed_at?: string
          confidence_json?: Json
          created_at?: string
          id?: string
          owner_id?: string
          profile_json?: Json
          source_counts_json?: Json
          version?: number
        }
        Relationships: []
      }
      learning_events: {
        Row: {
          assignment_id: string | null
          created_at: string
          event_name: string
          feature: string | null
          id: string
          occurred_at: string
          owner_id: string
          payload: Json
          source_id: string | null
          source_table: string | null
          tenant_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          event_name: string
          feature?: string | null
          id?: string
          occurred_at?: string
          owner_id: string
          payload?: Json
          source_id?: string | null
          source_table?: string | null
          tenant_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          event_name?: string
          feature?: string | null
          id?: string
          occurred_at?: string
          owner_id?: string
          payload?: Json
          source_id?: string | null
          source_table?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_objectives: {
        Row: {
          class_id: string | null
          course_mode_course_id: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string
          parent_version_id: string | null
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          class_id?: string | null
          course_mode_course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          parent_version_id?: string | null
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          class_id?: string | null
          course_mode_course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          parent_version_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_objectives_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_objectives_course_mode_course_id_fkey"
            columns: ["course_mode_course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_objectives_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_rollup_jobs: {
        Row: {
          attempts: number
          available_at: string
          completed_at: string | null
          error_summary: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          locked_until: string | null
          max_attempts: number
          owner_id: string
          queued_at: string
          reason: string
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          completed_at?: string | null
          error_summary?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          owner_id: string
          queued_at?: string
          reason?: string
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          available_at?: string
          completed_at?: string | null
          error_summary?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          owner_id?: string
          queued_at?: string
          reason?: string
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      lms_connections: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_synced_at: string | null
          owner_id: string
          provider: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_synced_at?: string | null
          owner_id: string
          provider: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_synced_at?: string | null
          owner_id?: string
          provider?: string
        }
        Relationships: []
      }
      lms_grade_sync_receipts: {
        Row: {
          attempt_id: string | null
          confirmed_at: string
          confirmed_by: string | null
          course_id: string
          created_at: string
          error_detail: string | null
          external_assignment_id: string | null
          external_course_id: string
          external_student_id: string
          final_grade_id: string | null
          id: string
          idempotency_key: string
          points_possible: number | null
          provider: string
          provider_receipt_id: string | null
          provider_response: Json
          score: number
          status: string
          synced_at: string | null
        }
        Insert: {
          attempt_id?: string | null
          confirmed_at: string
          confirmed_by?: string | null
          course_id: string
          created_at?: string
          error_detail?: string | null
          external_assignment_id?: string | null
          external_course_id: string
          external_student_id: string
          final_grade_id?: string | null
          id?: string
          idempotency_key: string
          points_possible?: number | null
          provider: string
          provider_receipt_id?: string | null
          provider_response?: Json
          score: number
          status?: string
          synced_at?: string | null
        }
        Update: {
          attempt_id?: string | null
          confirmed_at?: string
          confirmed_by?: string | null
          course_id?: string
          created_at?: string
          error_detail?: string | null
          external_assignment_id?: string | null
          external_course_id?: string
          external_student_id?: string
          final_grade_id?: string | null
          id?: string
          idempotency_key?: string
          points_possible?: number | null
          provider?: string
          provider_receipt_id?: string | null
          provider_response?: Json
          score?: number
          status?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_grade_sync_receipts_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_grade_sync_receipts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_grade_sync_receipts_final_grade_id_fkey"
            columns: ["final_grade_id"]
            isOneToOne: false
            referencedRelation: "final_grade_records"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_concepts: {
        Row: {
          class_id: string
          created_at: string
          id: string
          last_practiced_at: string | null
          mastery_level: number
          name: string
          owner_id: string
          self_confidence: number | null
          source: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number
          name: string
          owner_id: string
          self_confidence?: number | null
          source?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number
          name?: string
          owner_id?: string
          self_confidence?: number | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_concepts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_events: {
        Row: {
          concept_id: string
          created_at: string
          delta: number
          evidence_text: string | null
          id: number
          owner_id: string
          rating: number | null
          source: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          delta?: number
          evidence_text?: string | null
          id?: number
          owner_id: string
          rating?: number | null
          source: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          delta?: number
          evidence_text?: string | null
          id?: number
          owner_id?: string
          rating?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_events_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "mastery_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      media_annotations: {
        Row: {
          assignment_id: string
          author_role: string
          created_at: string
          id: string
          media_asset_id: string
          note: string
          owner_id: string
          time_seconds: number
        }
        Insert: {
          assignment_id: string
          author_role: string
          created_at?: string
          id?: string
          media_asset_id: string
          note: string
          owner_id: string
          time_seconds: number
        }
        Update: {
          assignment_id?: string
          author_role?: string
          created_at?: string
          id?: string
          media_asset_id?: string
          note?: string
          owner_id?: string
          time_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_annotations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_annotations_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_asset_deletion_jobs: {
        Row: {
          assignment_id: string
          attempts: number
          claim_expires_at: string | null
          claim_token: string | null
          completed_at: string | null
          dead_letter_error_code: string | null
          dead_lettered_at: string | null
          id: string
          last_error: string | null
          media_asset_id: string
          next_attempt_at: string
          owner_id: string
          reason: string
          requested_at: string
          state: string
          storage_absence_confirmed_at: string | null
          storage_key: string
          storage_removed_at: string | null
          temporary_storage_key: string | null
          updated_at: string
          upload_id: string | null
        }
        Insert: {
          assignment_id: string
          attempts?: number
          claim_expires_at?: string | null
          claim_token?: string | null
          completed_at?: string | null
          dead_letter_error_code?: string | null
          dead_lettered_at?: string | null
          id?: string
          last_error?: string | null
          media_asset_id: string
          next_attempt_at?: string
          owner_id: string
          reason: string
          requested_at?: string
          state?: string
          storage_absence_confirmed_at?: string | null
          storage_key: string
          storage_removed_at?: string | null
          temporary_storage_key?: string | null
          updated_at?: string
          upload_id?: string | null
        }
        Update: {
          assignment_id?: string
          attempts?: number
          claim_expires_at?: string | null
          claim_token?: string | null
          completed_at?: string | null
          dead_letter_error_code?: string | null
          dead_lettered_at?: string | null
          id?: string
          last_error?: string | null
          media_asset_id?: string
          next_attempt_at?: string
          owner_id?: string
          reason?: string
          requested_at?: string
          state?: string
          storage_absence_confirmed_at?: string | null
          storage_key?: string
          storage_removed_at?: string | null
          temporary_storage_key?: string | null
          updated_at?: string
          upload_id?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          assignment_id: string
          consent_confirmed_at: string
          created_at: string
          duration_seconds: number | null
          file_name: string
          file_size_bytes: number
          id: string
          media_kind: string
          mime_type: string
          owner_id: string
          retention_expires_at: string
          storage_key: string
          student_selected_for_submission: boolean
          updated_at: string
          upload_intent_id: string | null
        }
        Insert: {
          assignment_id: string
          consent_confirmed_at: string
          created_at?: string
          duration_seconds?: number | null
          file_name: string
          file_size_bytes: number
          id?: string
          media_kind: string
          mime_type: string
          owner_id: string
          retention_expires_at?: string
          storage_key: string
          student_selected_for_submission?: boolean
          updated_at?: string
          upload_intent_id?: string | null
        }
        Update: {
          assignment_id?: string
          consent_confirmed_at?: string
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_size_bytes?: number
          id?: string
          media_kind?: string
          mime_type?: string
          owner_id?: string
          retention_expires_at?: string
          storage_key?: string
          student_selected_for_submission?: boolean
          updated_at?: string
          upload_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          action_items_json: Json
          ai_suggested_tags: string[]
          assignment_id: string | null
          audio_storage_key: string | null
          body_text: string
          class_id: string | null
          created_at: string
          doc_storage_key: string | null
          id: string
          outline_json: Json | null
          owner_id: string
          search_vector: unknown
          source: string
          tags: string[]
          title: string
          transcript_text: string | null
          updated_at: string
        }
        Insert: {
          action_items_json?: Json
          ai_suggested_tags?: string[]
          assignment_id?: string | null
          audio_storage_key?: string | null
          body_text?: string
          class_id?: string | null
          created_at?: string
          doc_storage_key?: string | null
          id?: string
          outline_json?: Json | null
          owner_id: string
          search_vector?: unknown
          source?: string
          tags?: string[]
          title?: string
          transcript_text?: string | null
          updated_at?: string
        }
        Update: {
          action_items_json?: Json
          ai_suggested_tags?: string[]
          assignment_id?: string | null
          audio_storage_key?: string | null
          body_text?: string
          class_id?: string | null
          created_at?: string
          doc_storage_key?: string | null
          id?: string
          outline_json?: Json | null
          owner_id?: string
          search_vector?: unknown
          source?: string
          tags?: string[]
          title?: string
          transcript_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_alignments: {
        Row: {
          alignment_type: string
          created_at: string
          id: string
          objective_id: string
          owner_id: string
          standard_item_id: string
        }
        Insert: {
          alignment_type?: string
          created_at?: string
          id?: string
          objective_id: string
          owner_id: string
          standard_item_id: string
        }
        Update: {
          alignment_type?: string
          created_at?: string
          id?: string
          objective_id?: string
          owner_id?: string
          standard_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_alignments_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_alignments_standard_item_id_fkey"
            columns: ["standard_item_id"]
            isOneToOne: false
            referencedRelation: "standard_items"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_mastery_evidence: {
        Row: {
          confirmed_by: string | null
          course_id: string
          created_at: string
          evidence_detail: Json
          id: string
          mastery: number
          objective_id: string
          source_id: string
          source_type: string
          student_id: string
        }
        Insert: {
          confirmed_by?: string | null
          course_id: string
          created_at?: string
          evidence_detail?: Json
          id?: string
          mastery: number
          objective_id: string
          source_id: string
          source_type: string
          student_id: string
        }
        Update: {
          confirmed_by?: string | null
          course_id?: string
          created_at?: string
          evidence_detail?: Json
          id?: string
          mastery?: number
          objective_id?: string
          source_id?: string
          source_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_mastery_evidence_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_mastery_evidence_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_explanations: {
        Row: {
          concept: string
          created_at: string
          explanation: string
          group_id: string
          id: string
          owner_id: string
        }
        Insert: {
          concept: string
          created_at?: string
          explanation: string
          group_id: string
          id?: string
          owner_id: string
        }
        Update: {
          concept?: string
          created_at?: string
          explanation?: string
          group_id?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_explanations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_events: {
        Row: {
          budget_value: number | null
          created_at: string
          id: number
          metric_name: string
          owner_id: string
          route: string
          value: number
        }
        Insert: {
          budget_value?: number | null
          created_at?: string
          id?: number
          metric_name: string
          owner_id: string
          route: string
          value: number
        }
        Update: {
          budget_value?: number | null
          created_at?: string
          id?: number
          metric_name?: string
          owner_id?: string
          route?: string
          value?: number
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          mime_type: string | null
          owner_id: string
          portfolio_id: string
          position: number
          reflection_text: string | null
          storage_bucket: string
          storage_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          owner_id: string
          portfolio_id: string
          position?: number
          reflection_text?: string | null
          storage_bucket?: string
          storage_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          owner_id?: string
          portfolio_id?: string
          position?: number
          reflection_text?: string | null
          storage_bucket?: string
          storage_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          class_id: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      practical_activity_sessions: {
        Row: {
          assignment_id: string
          course_id: string
          created_at: string
          expires_at: string
          id: string
          protocol_id: string
          protocol_version: number
          signed_off_at: string | null
          signed_off_by: string | null
          signoff_notes: string | null
          student_id: string
          supervision_active: boolean
          unlocked_at: string
          unlocked_by: string | null
        }
        Insert: {
          assignment_id: string
          course_id: string
          created_at?: string
          expires_at: string
          id?: string
          protocol_id: string
          protocol_version: number
          signed_off_at?: string | null
          signed_off_by?: string | null
          signoff_notes?: string | null
          student_id: string
          supervision_active?: boolean
          unlocked_at?: string
          unlocked_by?: string | null
        }
        Update: {
          assignment_id?: string
          course_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          protocol_id?: string
          protocol_version?: number
          signed_off_at?: string | null
          signed_off_by?: string | null
          signoff_notes?: string | null
          student_id?: string
          supervision_active?: boolean
          unlocked_at?: string
          unlocked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practical_activity_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practical_activity_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practical_activity_sessions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "safety_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_attempts: {
        Row: {
          artifact_id: string
          assignment_id: string | null
          attempt_number: number
          completed_at: string | null
          id: string
          owner_id: string
          points_earned: number
          points_possible: number
          result: Json
          score: number | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          artifact_id: string
          assignment_id?: string | null
          attempt_number?: number
          completed_at?: string | null
          id?: string
          owner_id: string
          points_earned?: number
          points_possible?: number
          result?: Json
          score?: number | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          artifact_id?: string
          assignment_id?: string | null
          attempt_number?: number
          completed_at?: string | null
          id?: string
          owner_id?: string
          points_earned?: number
          points_possible?: number
          result?: Json
          score?: number | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "study_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_responses: {
        Row: {
          answered_at: string
          attempt_id: string
          explanation: string
          id: string
          points_earned: number | null
          question_index: number
          response: string
          result_category: string
          scored: boolean
          source_anchor: string
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          explanation?: string
          id?: string
          points_earned?: number | null
          question_index: number
          response: string
          result_category: string
          scored?: boolean
          source_anchor?: string
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          explanation?: string
          id?: string
          points_earned?: number | null
          question_index?: number
          response?: string
          result_category?: string
          scored?: boolean
          source_anchor?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "practice_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      prerequisite_edges: {
        Row: {
          created_at: string
          id: string
          minimum_mastery: number
          objective_id: string
          owner_id: string
          prerequisite_objective_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          minimum_mastery?: number
          objective_id: string
          owner_id: string
          prerequisite_objective_id: string
        }
        Update: {
          created_at?: string
          id?: string
          minimum_mastery?: number
          objective_id?: string
          owner_id?: string
          prerequisite_objective_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prerequisite_edges_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prerequisite_edges_prerequisite_objective_id_fkey"
            columns: ["prerequisite_objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accommodations: string[]
          age_bracket: string
          ai_verbosity_by_subject: Json
          bionic_reading: boolean
          class_count_hint: number | null
          consent_ai: boolean
          consent_ai_at: string | null
          created_at: string
          daily_media_cost_unit_budget: number
          daily_token_budget: number
          date_of_birth: string
          diagnoses: string[]
          display_name: string | null
          dyslexia_font: boolean
          extra_time_pct: number
          font_size: string
          high_contrast: boolean
          interests: string[]
          last_mood_checkin_at: string | null
          last_weekly_reflection_at: string | null
          learning_hurdle: string | null
          learning_loop_paused: boolean
          learning_loop_reset_at: string | null
          line_focus: boolean
          line_spacing: string
          mastery_signals: Json
          media_cost_unit_reset_date: string
          media_cost_units_used_today: number
          mood_checkin_disabled: boolean
          notification_preferences: Json
          onboarded_at: string | null
          photo_offset_x: number
          photo_offset_y: number
          photo_url: string | null
          privacy_preferences: Json
          reading_font: string
          reading_letter_spacing: string
          reading_word_spacing: string
          reduced_motion: boolean
          rough_mode_until: string | null
          school_year: number | null
          session_mood: string | null
          study_schedule_preference: string | null
          timezone: string
          token_reset_date: string
          tokens_used_today: number
          tts_enabled: boolean
          tts_pitch: number
          tts_provider: string
          tts_speed: number
          tts_voice: string
          tutor_complexity: string
          tutor_persona: string
          tutor_style: string
          updated_at: string
          user_id: string
          visual_pacing: string
        }
        Insert: {
          accommodations?: string[]
          age_bracket: string
          ai_verbosity_by_subject?: Json
          bionic_reading?: boolean
          class_count_hint?: number | null
          consent_ai?: boolean
          consent_ai_at?: string | null
          created_at?: string
          daily_media_cost_unit_budget?: number
          daily_token_budget?: number
          date_of_birth: string
          diagnoses?: string[]
          display_name?: string | null
          dyslexia_font?: boolean
          extra_time_pct?: number
          font_size?: string
          high_contrast?: boolean
          interests?: string[]
          last_mood_checkin_at?: string | null
          last_weekly_reflection_at?: string | null
          learning_hurdle?: string | null
          learning_loop_paused?: boolean
          learning_loop_reset_at?: string | null
          line_focus?: boolean
          line_spacing?: string
          mastery_signals?: Json
          media_cost_unit_reset_date?: string
          media_cost_units_used_today?: number
          mood_checkin_disabled?: boolean
          notification_preferences?: Json
          onboarded_at?: string | null
          photo_offset_x?: number
          photo_offset_y?: number
          photo_url?: string | null
          privacy_preferences?: Json
          reading_font?: string
          reading_letter_spacing?: string
          reading_word_spacing?: string
          reduced_motion?: boolean
          rough_mode_until?: string | null
          school_year?: number | null
          session_mood?: string | null
          study_schedule_preference?: string | null
          timezone?: string
          token_reset_date?: string
          tokens_used_today?: number
          tts_enabled?: boolean
          tts_pitch?: number
          tts_provider?: string
          tts_speed?: number
          tts_voice?: string
          tutor_complexity?: string
          tutor_persona?: string
          tutor_style?: string
          updated_at?: string
          user_id: string
          visual_pacing?: string
        }
        Update: {
          accommodations?: string[]
          age_bracket?: string
          ai_verbosity_by_subject?: Json
          bionic_reading?: boolean
          class_count_hint?: number | null
          consent_ai?: boolean
          consent_ai_at?: string | null
          created_at?: string
          daily_media_cost_unit_budget?: number
          daily_token_budget?: number
          date_of_birth?: string
          diagnoses?: string[]
          display_name?: string | null
          dyslexia_font?: boolean
          extra_time_pct?: number
          font_size?: string
          high_contrast?: boolean
          interests?: string[]
          last_mood_checkin_at?: string | null
          last_weekly_reflection_at?: string | null
          learning_hurdle?: string | null
          learning_loop_paused?: boolean
          learning_loop_reset_at?: string | null
          line_focus?: boolean
          line_spacing?: string
          mastery_signals?: Json
          media_cost_unit_reset_date?: string
          media_cost_units_used_today?: number
          mood_checkin_disabled?: boolean
          notification_preferences?: Json
          onboarded_at?: string | null
          photo_offset_x?: number
          photo_offset_y?: number
          photo_url?: string | null
          privacy_preferences?: Json
          reading_font?: string
          reading_letter_spacing?: string
          reading_word_spacing?: string
          reduced_motion?: boolean
          rough_mode_until?: string | null
          school_year?: number | null
          session_mood?: string | null
          study_schedule_preference?: string | null
          timezone?: string
          token_reset_date?: string
          tokens_used_today?: number
          tts_enabled?: boolean
          tts_pitch?: number
          tts_provider?: string
          tts_speed?: number
          tts_voice?: string
          tutor_complexity?: string
          tutor_persona?: string
          tutor_style?: string
          updated_at?: string
          user_id?: string
          visual_pacing?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          owner_id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          owner_id: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          owner_id?: string
          p256dh?: string
        }
        Relationships: []
      }
      reading_annotations: {
        Row: {
          assignment_id: string | null
          class_id: string | null
          color: string
          created_at: string
          id: string
          note_id: string | null
          note_text: string
          owner_id: string
          selected_text: string
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          class_id?: string | null
          color?: string
          created_at?: string
          id?: string
          note_id?: string | null
          note_text: string
          owner_id: string
          selected_text: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          class_id?: string | null
          color?: string
          created_at?: string
          id?: string
          note_id?: string | null
          note_text?: string
          owner_id?: string
          selected_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_annotations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_annotations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_annotations_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_sessions: {
        Row: {
          comprehension_checks: Json | null
          current_offset: number | null
          ended_at: string | null
          id: string
          reading_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          comprehension_checks?: Json | null
          current_offset?: number | null
          ended_at?: string | null
          id?: string
          reading_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          comprehension_checks?: Json | null
          current_offset?: number | null
          ended_at?: string | null
          id?: string
          reading_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_sessions_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "readings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      readings: {
        Row: {
          class_id: string
          comprehension_questions: Json | null
          created_at: string | null
          full_text: string | null
          id: string
          source_url: string | null
          title: string
          user_id: string
          vocab_preview: Json | null
        }
        Insert: {
          class_id: string
          comprehension_questions?: Json | null
          created_at?: string | null
          full_text?: string | null
          id?: string
          source_url?: string | null
          title: string
          user_id: string
          vocab_preview?: Json | null
        }
        Update: {
          class_id?: string
          comprehension_questions?: Json | null
          created_at?: string | null
          full_text?: string | null
          id?: string
          source_url?: string | null
          title?: string
          user_id?: string
          vocab_preview?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "readings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rubrics: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          owner_id: string
          parse_error: string | null
          parse_status: string
          parsed: Json | null
          raw_text: string | null
          source_kind: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          owner_id: string
          parse_error?: string | null
          parse_status?: string
          parsed?: Json | null
          raw_text?: string | null
          source_kind: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          parse_error?: string | null
          parse_status?: string
          parsed?: Json | null
          raw_text?: string | null
          source_kind?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubrics_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          protocol_id: string
          protocol_version: number
          student_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          protocol_id: string
          protocol_version: number
          student_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          protocol_id?: string
          protocol_version?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_acknowledgments_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "safety_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_protocols: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          disposal_steps: Json
          emergency_steps: Json
          id: string
          minimum_age: number | null
          organization_id: string
          parent_version_id: string | null
          procedure_steps: Json
          published_at: string | null
          published_by: string | null
          required_ppe: Json
          safety_class: string
          source_kind: string
          source_uri: string
          status: string
          supervision_required: boolean
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          disposal_steps?: Json
          emergency_steps?: Json
          id?: string
          minimum_age?: number | null
          organization_id: string
          parent_version_id?: string | null
          procedure_steps?: Json
          published_at?: string | null
          published_by?: string | null
          required_ppe?: Json
          safety_class: string
          source_kind: string
          source_uri: string
          status?: string
          supervision_required?: boolean
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          disposal_steps?: Json
          emergency_steps?: Json
          id?: string
          minimum_age?: number | null
          organization_id?: string
          parent_version_id?: string | null
          procedure_steps?: Json
          published_at?: string | null
          published_by?: string | null
          required_ppe?: Json
          safety_class?: string
          source_kind?: string
          source_uri?: string
          status?: string
          supervision_required?: boolean
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "safety_protocols_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_protocols_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_protocols_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "safety_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      school_organizations: {
        Row: {
          created_at: string
          id: string
          jurisdiction_code: string | null
          name: string
          organization_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction_code?: string | null
          name: string
          organization_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction_code?: string | null
          name?: string
          organization_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_handoffs: {
        Row: {
          context: Json
          owner_id: string
          route: string
          updated_at: string
        }
        Insert: {
          context?: Json
          owner_id: string
          route: string
          updated_at?: string
        }
        Update: {
          context?: Json
          owner_id?: string
          route?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          owner_id: string
          revoked_at: string | null
          share_type: string
          token: string
          token_digest: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          owner_id: string
          revoked_at?: string | null
          share_type: string
          token?: string
          token_digest: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          owner_id?: string
          revoked_at?: string | null
          share_type?: string
          token?: string
          token_digest?: string
        }
        Relationships: []
      }
      shared_flashcard_cards: {
        Row: {
          back: string
          created_at: string
          deck_id: string
          front: string
          id: string
          owner_id: string
          position: number
        }
        Insert: {
          back: string
          created_at?: string
          deck_id: string
          front: string
          id?: string
          owner_id: string
          position?: number
        }
        Update: {
          back?: string
          created_at?: string
          deck_id?: string
          front?: string
          id?: string
          owner_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_flashcard_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "shared_flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_flashcard_decks: {
        Row: {
          created_at: string
          group_id: string
          id: string
          owner_id: string
          source: string
          title: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          owner_id: string
          source?: string
          title: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          owner_id?: string
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_flashcard_decks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_flashcard_installs: {
        Row: {
          deck_id: string
          installed_at: string
          owner_id: string
        }
        Insert: {
          deck_id: string
          installed_at?: string
          owner_id: string
        }
        Update: {
          deck_id?: string
          installed_at?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_flashcard_installs_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "shared_flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_logs: {
        Row: {
          created_at: string
          focus_note: string | null
          id: string
          movement_20_min: boolean | null
          owner_id: string
          sleep_date: string
          sleep_hours: number | null
          sleep_quality: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          focus_note?: string | null
          id?: string
          movement_20_min?: boolean | null
          owner_id: string
          sleep_date?: string
          sleep_hours?: number | null
          sleep_quality: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          focus_note?: string | null
          id?: string
          movement_20_min?: boolean | null
          owner_id?: string
          sleep_date?: string
          sleep_hours?: number | null
          sleep_quality?: string
          updated_at?: string
        }
        Relationships: []
      }
      standard_associations: {
        Row: {
          association_type: string
          case_identifier: string
          created_at: string
          destination_uri: string
          framework_id: string
          id: string
          origin_uri: string
          owner_id: string
          raw_metadata: Json
          uri: string | null
        }
        Insert: {
          association_type: string
          case_identifier: string
          created_at?: string
          destination_uri: string
          framework_id: string
          id?: string
          origin_uri: string
          owner_id: string
          raw_metadata?: Json
          uri?: string | null
        }
        Update: {
          association_type?: string
          case_identifier?: string
          created_at?: string
          destination_uri?: string
          framework_id?: string
          id?: string
          origin_uri?: string
          owner_id?: string
          raw_metadata?: Json
          uri?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standard_associations_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "standards_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_items: {
        Row: {
          case_identifier: string
          created_at: string
          education_levels: string[]
          framework_id: string
          human_coding_scheme: string | null
          id: string
          item_type: string | null
          owner_id: string
          raw_metadata: Json
          statement: string | null
          statement_hash: string | null
          updated_at: string
          uri: string
        }
        Insert: {
          case_identifier: string
          created_at?: string
          education_levels?: string[]
          framework_id: string
          human_coding_scheme?: string | null
          id?: string
          item_type?: string | null
          owner_id: string
          raw_metadata?: Json
          statement?: string | null
          statement_hash?: string | null
          updated_at?: string
          uri: string
        }
        Update: {
          case_identifier?: string
          created_at?: string
          education_levels?: string[]
          framework_id?: string
          human_coding_scheme?: string | null
          id?: string
          item_type?: string | null
          owner_id?: string
          raw_metadata?: Json
          statement?: string | null
          statement_hash?: string | null
          updated_at?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_items_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "standards_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      standards_frameworks: {
        Row: {
          adoption_status: string | null
          case_identifier: string
          created_at: string
          creator: string | null
          id: string
          jurisdiction: string | null
          language: string | null
          license_uri: string | null
          owner_id: string
          provenance: Json
          statement_storage_authorized: boolean
          status: string
          title: string
          updated_at: string
          uri: string
          version_label: string | null
        }
        Insert: {
          adoption_status?: string | null
          case_identifier: string
          created_at?: string
          creator?: string | null
          id?: string
          jurisdiction?: string | null
          language?: string | null
          license_uri?: string | null
          owner_id: string
          provenance?: Json
          statement_storage_authorized?: boolean
          status?: string
          title: string
          updated_at?: string
          uri: string
          version_label?: string | null
        }
        Update: {
          adoption_status?: string | null
          case_identifier?: string
          created_at?: string
          creator?: string | null
          id?: string
          jurisdiction?: string | null
          language?: string | null
          license_uri?: string | null
          owner_id?: string
          provenance?: Json
          statement_storage_authorized?: boolean
          status?: string
          title?: string
          updated_at?: string
          uri?: string
          version_label?: string | null
        }
        Relationships: []
      }
      student_reflections: {
        Row: {
          ai_reflection: string | null
          body: string
          created_at: string
          id: string
          mood: string | null
          owner_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          ai_reflection?: string | null
          body: string
          created_at?: string
          id?: string
          mood?: string | null
          owner_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          ai_reflection?: string | null
          body?: string
          created_at?: string
          id?: string
          mood?: string | null
          owner_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      student_state_snapshots: {
        Row: {
          ai_policy: string
          assignment_id: string | null
          assignment_kind: string | null
          class_id: string | null
          created_at: string
          friction_signals: Json
          id: string
          mastery_signals: Json
          next_step: string
          owner_id: string
          ownership_meter: Json
          readiness: Json
          recall_signals: Json
          source_anchors: Json
          state_version: number
          struggle_state: string
          support_intensity: string
          trigger: string
        }
        Insert: {
          ai_policy: string
          assignment_id?: string | null
          assignment_kind?: string | null
          class_id?: string | null
          created_at?: string
          friction_signals?: Json
          id?: string
          mastery_signals?: Json
          next_step: string
          owner_id: string
          ownership_meter?: Json
          readiness?: Json
          recall_signals?: Json
          source_anchors?: Json
          state_version?: number
          struggle_state: string
          support_intensity: string
          trigger: string
        }
        Update: {
          ai_policy?: string
          assignment_id?: string | null
          assignment_kind?: string | null
          class_id?: string | null
          created_at?: string
          friction_signals?: Json
          id?: string
          mastery_signals?: Json
          next_step?: string
          owner_id?: string
          ownership_meter?: Json
          readiness?: Json
          recall_signals?: Json
          source_anchors?: Json
          state_version?: number
          struggle_state?: string
          support_intensity?: string
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_state_snapshots_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_state_snapshots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_artifacts: {
        Row: {
          ai_policy: string
          artifact_edit_state: Json
          artifact_type: string
          authorship_receipt: Json
          cards_saved_count: number
          class_id: string | null
          created_at: string
          id: string
          last_reviewed_at: string | null
          loop_state: string
          owner_id: string
          payload: Json
          practice_settings: Json
          source_anchor_count: number
          source_id: string
          source_type: string
          study_mode: string
          title: string
          updated_at: string
          visual_breakdown: Json
        }
        Insert: {
          ai_policy: string
          artifact_edit_state?: Json
          artifact_type: string
          authorship_receipt?: Json
          cards_saved_count?: number
          class_id?: string | null
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          loop_state?: string
          owner_id: string
          payload?: Json
          practice_settings?: Json
          source_anchor_count?: number
          source_id: string
          source_type: string
          study_mode: string
          title: string
          updated_at?: string
          visual_breakdown?: Json
        }
        Update: {
          ai_policy?: string
          artifact_edit_state?: Json
          artifact_type?: string
          authorship_receipt?: Json
          cards_saved_count?: number
          class_id?: string | null
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          loop_state?: string
          owner_id?: string
          payload?: Json
          practice_settings?: Json
          source_anchor_count?: number
          source_id?: string
          source_type?: string
          study_mode?: string
          title?: string
          updated_at?: string
          visual_breakdown?: Json
        }
        Relationships: [
          {
            foreignKeyName: "study_artifacts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          display_name: string | null
          group_id: string
          joined_at: string
          owner_id: string
          role: string
        }
        Insert: {
          display_name?: string | null
          group_id: string
          joined_at?: string
          owner_id: string
          role?: string
        }
        Update: {
          display_name?: string | null
          group_id?: string
          joined_at?: string
          owner_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_sessions: {
        Row: {
          break_minutes: number
          created_at: string
          group_id: string
          id: string
          owner_id: string
          starts_at: string
          status: string
          title: string
          work_minutes: number
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          group_id: string
          id?: string
          owner_id: string
          starts_at?: string
          status?: string
          title: string
          work_minutes?: number
        }
        Update: {
          break_minutes?: number
          created_at?: string
          group_id?: string
          id?: string
          owner_id?: string
          starts_at?: string
          status?: string
          title?: string
          work_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_group_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string
          id: string
          join_code: string
          name: string
          owner_id: string
          subject: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          id?: string
          join_code?: string
          name: string
          owner_id: string
          subject?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          join_code?: string
          name?: string
          owner_id?: string
          subject?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      submission_checklist: {
        Row: {
          assignment_id: string
          checked: boolean
          created_at: string
          detail: string | null
          id: string
          label: string
          owner_id: string
          position: number
          required: boolean
        }
        Insert: {
          assignment_id: string
          checked?: boolean
          created_at?: string
          detail?: string | null
          id?: string
          label: string
          owner_id: string
          position?: number
          required?: boolean
        }
        Update: {
          assignment_id?: string
          checked?: boolean
          created_at?: string
          detail?: string | null
          id?: string
          label?: string
          owner_id?: string
          position?: number
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "submission_checklist_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      task_signals: {
        Row: {
          assignment_id: string | null
          id: number
          kind: string
          occurred_at: string
          owner_id: string
          value: Json | null
        }
        Insert: {
          assignment_id?: string | null
          id?: number
          kind: string
          occurred_at?: string
          owner_id: string
          value?: Json | null
        }
        Update: {
          assignment_id?: string | null
          id?: number
          kind?: string
          occurred_at?: string
          owner_id?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "task_signals_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_approvals: {
        Row: {
          course_id: string | null
          decided_at: string
          decided_by: string | null
          decision: string
          id: string
          notes: string | null
          organization_id: string
          subject_id: string
          subject_type: string
          subject_version: number
        }
        Insert: {
          course_id?: string | null
          decided_at?: string
          decided_by?: string | null
          decision: string
          id?: string
          notes?: string | null
          organization_id: string
          subject_id: string
          subject_type: string
          subject_version?: number
        }
        Update: {
          course_id?: string | null
          decided_at?: string
          decided_by?: string | null
          decision?: string
          id?: string
          notes?: string | null
          organization_id?: string
          subject_id?: string
          subject_type?: string
          subject_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_approvals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "course_mode_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "school_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_progress_notes: {
        Row: {
          assignment_id: string | null
          author_name: string
          class_id: string | null
          created_at: string
          id: string
          note_text: string
          owner_id: string
          updated_at: string
          visible_to_parent: boolean
        }
        Insert: {
          assignment_id?: string | null
          author_name: string
          class_id?: string | null
          created_at?: string
          id?: string
          note_text: string
          owner_id: string
          updated_at?: string
          visible_to_parent?: boolean
        }
        Update: {
          assignment_id?: string | null
          author_name?: string
          class_id?: string | null
          created_at?: string
          id?: string
          note_text?: string
          owner_id?: string
          updated_at?: string
          visible_to_parent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "teacher_progress_notes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_progress_notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teen_test_observations: {
        Row: {
          created_at: string
          id: string
          no_pii: boolean
          observation: Json
          owner_id: string | null
          score: Json
          session_label: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          no_pii?: boolean
          observation?: Json
          owner_id?: string | null
          score?: Json
          session_label?: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          no_pii?: boolean
          observation?: Json
          owner_id?: string | null
          score?: Json
          session_label?: string
          task_id?: string
        }
        Relationships: []
      }
      tool_runs: {
        Row: {
          artifact_block_id: string | null
          assignment_id: string
          capability: string
          completed_at: string | null
          error_detail: string | null
          id: string
          input: Json
          output: Json
          owner_id: string
          started_at: string
          status: string
        }
        Insert: {
          artifact_block_id?: string | null
          assignment_id: string
          capability: string
          completed_at?: string | null
          error_detail?: string | null
          id?: string
          input?: Json
          output?: Json
          owner_id: string
          started_at?: string
          status: string
        }
        Update: {
          artifact_block_id?: string | null
          assignment_id?: string
          capability?: string
          completed_at?: string | null
          error_detail?: string | null
          id?: string
          input?: Json
          output?: Json
          owner_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_runs_artifact_block_id_fkey"
            columns: ["artifact_block_id"]
            isOneToOne: false
            referencedRelation: "artifact_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_runs_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_terms: {
        Row: {
          assignment_id: string | null
          class_id: string | null
          context_text: string | null
          created_at: string
          definition: string
          flashcard_id: string | null
          id: string
          note_id: string | null
          owner_id: string
          phonics: Json
          source: string
          updated_at: string
          word: string
        }
        Insert: {
          assignment_id?: string | null
          class_id?: string | null
          context_text?: string | null
          created_at?: string
          definition: string
          flashcard_id?: string | null
          id?: string
          note_id?: string | null
          owner_id: string
          phonics?: Json
          source?: string
          updated_at?: string
          word: string
        }
        Update: {
          assignment_id?: string | null
          class_id?: string | null
          context_text?: string | null
          created_at?: string
          definition?: string
          flashcard_id?: string | null
          id?: string
          note_id?: string | null
          owner_id?: string
          phonics?: Json
          source?: string
          updated_at?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_terms_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_terms_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_terms_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_terms_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_activity_logs: {
        Row: {
          activity_type: string
          created_at: string
          duration_minutes: number
          felt: string
          id: string
          logged_for: string
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          duration_minutes: number
          felt: string
          id?: string
          logged_for?: string
          notes?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          duration_minutes?: number
          felt?: string
          id?: string
          logged_for?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      wellness_goals: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          next_step: string | null
          owner_id: string
          target_text: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          next_step?: string | null
          owner_id: string
          target_text: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          next_step?: string | null
          owner_id?: string
          target_text?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      wellness_weekly_targets: {
        Row: {
          check_in_days: number
          movement_days: number
          owner_id: string
          sleep_hours: number
          updated_at: string
        }
        Insert: {
          check_in_days?: number
          movement_days?: number
          owner_id: string
          sleep_hours?: number
          updated_at?: string
        }
        Update: {
          check_in_days?: number
          movement_days?: number
          owner_id?: string
          sleep_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      worker_jobs: {
        Row: {
          attempts: number
          available_at: string
          completed_at: string | null
          constraints: Json
          created_at: string
          error_summary: string | null
          feature: string
          id: string
          idempotency_key: string
          input_summary: Json
          locked_at: string | null
          locked_by: string | null
          locked_until: string | null
          max_attempts: number
          observability: Json
          owner_id: string
          payload: Json
          priority: number
          queue_mode: string
          queue_name: string
          result_payload: Json
          started_at: string | null
          status: string
          tenant_id: string
          trace_id: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          completed_at?: string | null
          constraints?: Json
          created_at?: string
          error_summary?: string | null
          feature: string
          id?: string
          idempotency_key: string
          input_summary?: Json
          locked_at?: string | null
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          observability?: Json
          owner_id: string
          payload?: Json
          priority?: number
          queue_mode: string
          queue_name: string
          result_payload?: Json
          started_at?: string | null
          status?: string
          tenant_id: string
          trace_id: string
        }
        Update: {
          attempts?: number
          available_at?: string
          completed_at?: string | null
          constraints?: Json
          created_at?: string
          error_summary?: string | null
          feature?: string
          id?: string
          idempotency_key?: string
          input_summary?: Json
          locked_at?: string | null
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          observability?: Json
          owner_id?: string
          payload?: Json
          priority?: number
          queue_mode?: string
          queue_name?: string
          result_payload?: Json
          started_at?: string | null
          status?: string
          tenant_id?: string
          trace_id?: string
        }
        Relationships: []
      }
      worker_rate_limits: {
        Row: {
          count: number
          created_at: string
          feature: string
          id: string
          owner_id: string
          scope: string
          tenant_id: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          feature: string
          id?: string
          owner_id: string
          scope: string
          tenant_id: string
          updated_at?: string
          window_start: string
        }
        Update: {
          count?: number
          created_at?: string
          feature?: string
          id?: string
          owner_id?: string
          scope?: string
          tenant_id?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_deletion_delete_public_rows: {
        Args: {
          p_manifest_version: number
          p_owner_id: string
          p_request_id: string
        }
        Returns: number
      }
      account_deletion_public_residue: {
        Args: {
          p_manifest_version: number
          p_owner_id: string
          p_request_id: string
        }
        Returns: number
      }
      account_deletion_request_digest: {
        Args: { p_manifest_version: number; p_request_id: string }
        Returns: string
      }
      account_deletion_storage_residue: {
        Args: { p_manifest_version: number; p_owner_id: string }
        Returns: number
      }
      acknowledge_assignment_safety_protocol: {
        Args: { p_assignment_id: string; p_protocol_id: string }
        Returns: boolean
      }
      assessment_release_available: {
        Args: {
          p_blueprint: Database["public"]["Tables"]["assessment_blueprints"]["Row"]
          p_student_id: string
        }
        Returns: boolean
      }
      calculate_course_grade: {
        Args: {
          p_course_id: string
          p_grading_period: string
          p_student_id: string
        }
        Returns: Json
      }
      can_author_course: {
        Args: { target_course_id: string }
        Returns: boolean
      }
      cancel_account_deletion_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      claim_account_deletion_request: {
        Args: { p_now?: string; p_request_id: string }
        Returns: {
          claim_token: string
          manifest_version: number
          owner_id: string
          purge_phase: string
          request_id: string
          storage_buckets: string[]
          storage_objects_deleted: number
        }[]
      }
      claim_assignment_media_deletion: {
        Args: {
          p_assignment_id: string
          p_claim_token: string
          p_job_id: string
          p_media_asset_id: string
          p_now?: string
          p_owner_id: string
        }
        Returns: Json
      }
      claim_assignment_media_upload: {
        Args: {
          p_assignment_id: string
          p_claim_token: string
          p_owner_id: string
          p_upload_id: string
        }
        Returns: Json
      }
      claim_assignment_source_materializations: {
        Args: { p_assignment_id: string; p_claim_token: string }
        Returns: {
          assignment_id: string
          created_at: string
          error_message: string | null
          external_id: string | null
          extracted_text: string | null
          id: string
          import_status: string
          materialization_claim_expires_at: string | null
          materialization_claim_token: string | null
          mime_type: string | null
          owner_id: string
          provider: string | null
          source_location: string | null
          source_type: string
          storage_key: string | null
          title: string
          updated_at: string
          url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "assignment_sources"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_assignment_submission: {
        Args: {
          p_assignment_id: string
          p_capability: string
          p_idempotency_key: string
          p_provider: string
          p_submission_file_id?: string
        }
        Returns: Json
      }
      claim_due_assignment_media_candidate_cleanups: {
        Args: { p_cleanup_token: string; p_limit?: number; p_now?: string }
        Returns: {
          assignment_id: string
          claim_epoch: number
          claim_token: string
          cleanup_expires_at: string
          cleanup_token: string
          owner_id: string
          storage_key: string
          upload_id: string
        }[]
      }
      claim_due_assignment_media_deletions: {
        Args: { p_claim_token: string; p_limit?: number; p_now?: string }
        Returns: {
          assignment_id: string
          claim_expires_at: string
          claim_token: string
          job_id: string
          media_asset_id: string
          owner_id: string
          storage_key: string
          temporary_storage_key: string
          upload_id: string
        }[]
      }
      claim_lms_grade_sync_receipt: {
        Args: {
          p_attempt_id: string
          p_external_student_id: string
          p_provider: string
        }
        Returns: {
          claimed: boolean
          receipt_id: string
          receipt_status: string
        }[]
      }
      claim_worker_job: {
        Args: {
          lease_seconds?: number
          requested_queue_name: string
          worker_id: string
        }
        Returns: {
          attempts: number
          available_at: string
          completed_at: string | null
          constraints: Json
          created_at: string
          error_summary: string | null
          feature: string
          id: string
          idempotency_key: string
          input_summary: Json
          locked_at: string | null
          locked_by: string | null
          locked_until: string | null
          max_attempts: number
          observability: Json
          owner_id: string
          payload: Json
          priority: number
          queue_mode: string
          queue_name: string
          result_payload: Json
          started_at: string | null
          status: string
          tenant_id: string
          trace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "worker_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cleanup_assignment_media_copy: {
        Args: {
          p_assignment_id: string
          p_candidate_storage_key: string
          p_claim_epoch: number
          p_claim_token: string
          p_owner_id: string
          p_upload_id: string
        }
        Returns: Json
      }
      complete_assignment_media_candidate_cleanup: {
        Args: {
          p_assignment_id: string
          p_candidate_storage_key: string
          p_claim_epoch: number
          p_claim_token: string
          p_failure_code?: string
          p_now?: string
          p_owner_id: string
          p_removed?: boolean
          p_upload_id: string
        }
        Returns: Json
      }
      complete_assignment_media_deletion: {
        Args: {
          p_assignment_id: string
          p_claim_token: string
          p_failure_code?: string
          p_job_id: string
          p_media_asset_id: string
          p_now?: string
          p_owner_id: string
          p_storage_absence_confirmed?: boolean
          p_storage_key: string
          p_storage_removed?: boolean
        }
        Returns: Json
      }
      complete_assignment_media_upload_cleanup: {
        Args: {
          p_assignment_id: string
          p_claim_token?: string
          p_durable_absence_confirmed?: boolean
          p_durable_removed?: boolean
          p_failure_code?: string
          p_now?: string
          p_owner_id: string
          p_temporary_absence_confirmed?: boolean
          p_temporary_removed?: boolean
          p_upload_id: string
        }
        Returns: Json
      }
      complete_assignment_submission: {
        Args: {
          p_detail: string
          p_provider_receipt_id: string
          p_provider_response?: Json
          p_receipt_id: string
        }
        Returns: undefined
      }
      complete_claimed_assignment_media_candidate_cleanup: {
        Args: {
          p_absence_confirmed?: boolean
          p_assignment_id: string
          p_candidate_storage_key: string
          p_claim_epoch: number
          p_claim_token: string
          p_cleanup_token: string
          p_failure_code?: string
          p_now?: string
          p_owner_id: string
          p_removed?: boolean
          p_upload_id: string
        }
        Returns: Json
      }
      complete_lms_grade_sync_receipt: {
        Args: {
          p_error_detail?: string
          p_final_status: string
          p_provider_receipt_id?: string
          p_provider_response?: Json
          p_receipt_id: string
        }
        Returns: {
          completed: boolean
          receipt_id: string
          receipt_status: string
        }[]
      }
      confirm_assessment_grade: {
        Args: { p_attempt_id: string; p_reason: string }
        Returns: Json
      }
      confirm_calculated_course_final_grade: {
        Args: {
          p_course_id: string
          p_final_percent: number
          p_grading_period: string
          p_letter_grade: string
          p_reason: string
          p_student_id: string
        }
        Returns: string
      }
      confirm_course_final_grade: {
        Args: {
          p_calculated_percent: number
          p_calculation_summary: Json
          p_course_id: string
          p_final_percent: number
          p_grading_period: string
          p_letter_grade: string
          p_reason: string
          p_student_id: string
        }
        Returns: string
      }
      create_assignment_media_upload_intent: {
        Args: {
          p_assignment_id: string
          p_declared_mime_type: string
          p_declared_size_bytes: number
          p_file_name: string
          p_media_kind: string
          p_owner_id: string
          p_storage_key: string
          p_upload_id: string
        }
        Returns: Json
      }
      create_course_content_revision: {
        Args: { p_kind: string; p_subject_id: string }
        Returns: string
      }
      create_course_objective_revision: {
        Args: { p_objective_id: string }
        Returns: string
      }
      create_course_revision: { Args: { p_course_id: string }; Returns: string }
      discard_assignment_media_upload: {
        Args: {
          p_assignment_id: string
          p_claim_token?: string
          p_owner_id: string
          p_upload_id: string
        }
        Returns: Json
      }
      distribute_course_mode_assignment: {
        Args: { p_course_assignment_id: string }
        Returns: Json
      }
      fail_account_deletion_storage_phase: {
        Args: {
          p_claim_token: string
          p_failure_code: string
          p_now?: string
          p_request_id: string
          p_storage_objects_deleted?: number
        }
        Returns: boolean
      }
      finalize_assignment_media_upload: {
        Args: {
          p_assignment_id: string
          p_candidate_storage_key: string
          p_claim_epoch: number
          p_claim_token: string
          p_owner_id: string
          p_upload_id: string
          p_verified_mime_type: string
          p_verified_size_bytes: number
        }
        Returns: Json
      }
      get_assignment_media_deletion_monitoring: {
        Args: { p_now?: string }
        Returns: Json
      }
      get_assignment_media_upload_cleanup_monitoring: {
        Args: { p_now?: string }
        Returns: Json
      }
      get_assignment_practical_gate: {
        Args: { p_assignment_id: string }
        Returns: Json
      }
      get_cron_job_run_health: {
        Args: { p_now?: string }
        Returns: {
          dead_letter_signaled: boolean
          job_name: string
          last_success_age_seconds: number
          last_success_at: string
          oldest_running_age_seconds: number
          oldest_running_started_at: string
          retry_signaled: boolean
          route_name: string
          running_count: number
        }[]
      }
      get_my_course_objective_readiness: {
        Args: { p_course_id: string }
        Returns: Json
      }
      install_shared_deck_for_members: {
        Args: { p_deck_id: string }
        Returns: number
      }
      is_enrolled_in_course: {
        Args: { target_course_id: string }
        Returns: boolean
      }
      is_study_group_member: { Args: { p_group_id: string }; Returns: boolean }
      is_study_group_owner: { Args: { p_group_id: string }; Returns: boolean }
      is_verified_organization_member: {
        Args: { allowed_roles?: string[]; target_organization_id: string }
        Returns: boolean
      }
      join_study_group: {
        Args: { p_display_name?: string; p_join_code: string }
        Returns: string
      }
      mark_ai_budget_provider_started: {
        Args: {
          p_provider_start_key: string
          p_reservation_id: string
          p_reservation_kind: string
        }
        Returns: {
          provider_start_status: string
          provider_started_at: string
          reservation_id: string
          reservation_status: string
        }[]
      }
      mark_assignment_media_upload_token_issuance_failed: {
        Args: {
          p_assignment_id: string
          p_owner_id: string
          p_storage_key: string
          p_upload_id: string
        }
        Returns: Json
      }
      merge_assignment_problem_work: {
        Args: { p_patch: Json; p_problem_id: string }
        Returns: boolean
      }
      merge_assignment_saved_work: {
        Args: { p_assignment_id: string; p_patch: Json }
        Returns: boolean
      }
      preflight_account_deletion_request: {
        Args: { p_claim_token: string; p_now?: string; p_request_id: string }
        Returns: boolean
      }
      process_ai_budget_reconciliation: {
        Args: { p_job_id: string; p_max_attempts?: number; p_now?: string }
        Returns: {
          attempt_count: number
          failure_code: string
          next_attempt_at: string
          reconciliation_id: string
          reconciliation_status: string
          reservation_status: string
        }[]
      }
      purge_account_deletion_request: {
        Args: { p_claim_token: string; p_now?: string; p_request_id: string }
        Returns: boolean
      }
      purge_due_deletion_requests: { Args: { p_now?: string }; Returns: number }
      queue_ai_budget_reconciliation: {
        Args: {
          p_actual_units: number
          p_last_error?: string
          p_reservation_id: string
          p_reservation_kind: string
        }
        Returns: {
          reconciliation_id: string
          reconciliation_status: string
        }[]
      }
      reconcile_assignment_submission_receipt: {
        Args: {
          p_detail: string
          p_provider_receipt_id: string
          p_provider_response?: Json
          p_receipt_id: string
          p_status: string
        }
        Returns: Json
      }
      reconcile_stale_started_ai_budget_reservations: {
        Args: { p_limit?: number; p_now?: string }
        Returns: {
          media_reservations: number
          token_reservations: number
        }[]
      }
      record_assessment_teacher_score: {
        Args: {
          p_attempt_id: string
          p_feedback?: string
          p_item_id: string
          p_score: number
        }
        Returns: boolean
      }
      record_assignment_media_upload_token_expiry: {
        Args: {
          p_assignment_id: string
          p_owner_id: string
          p_signed_upload_expires_at: string
          p_storage_key: string
          p_upload_id: string
        }
        Returns: Json
      }
      record_daily_wellness_check_in: {
        Args: {
          p_focus_note: string
          p_mood: string
          p_mood_metadata?: Json
          p_sleep_date: string
          p_sleep_hours: number
          p_sleep_quality: string
        }
        Returns: undefined
      }
      record_wellness_activity: {
        Args: {
          p_activity_type: string
          p_duration_minutes: number
          p_felt: string
          p_logged_for: string
          p_notes: string
        }
        Returns: undefined
      }
      record_wellness_sleep_log: {
        Args: {
          p_focus_note: string
          p_sleep_date: string
          p_sleep_hours: number
          p_sleep_quality: string
        }
        Returns: boolean
      }
      recover_assignment_media_candidate_cleanup: {
        Args: {
          p_assignment_id: string
          p_claim_epoch: number
          p_now?: string
          p_owner_id: string
          p_upload_id: string
        }
        Returns: Json
      }
      recover_assignment_media_deletion: {
        Args: {
          p_assignment_id: string
          p_job_id: string
          p_media_asset_id: string
          p_now?: string
          p_owner_id: string
        }
        Returns: Json
      }
      recover_assignment_media_upload_cleanup: {
        Args: {
          p_assignment_id: string
          p_now?: string
          p_owner_id: string
          p_upload_id: string
        }
        Returns: Json
      }
      release_ai_budget_known_not_consumed: {
        Args: {
          p_provider_start_key: string
          p_reservation_id: string
          p_reservation_kind: string
        }
        Returns: {
          refunded_units: number
          reservation_id: string
          reservation_status: string
        }[]
      }
      release_ai_media_cost_budget: {
        Args: { p_reservation_id: string }
        Returns: {
          refunded_cost_units: number
          reservation_id: string
          reservation_status: string
        }[]
      }
      release_ai_token_budget: {
        Args: { p_reservation_id: string }
        Returns: {
          refunded_tokens: number
          reservation_id: string
          reservation_status: string
        }[]
      }
      renew_assignment_source_materialization_claim: {
        Args: {
          p_assignment_id: string
          p_claim_token: string
          p_source_id: string
        }
        Returns: boolean
      }
      request_assignment_media_deletion: {
        Args: {
          p_assignment_id: string
          p_media_asset_id: string
          p_now?: string
          p_owner_id: string
          p_reason: string
        }
        Returns: Json
      }
      request_due_assignment_media_retention_deletions: {
        Args: { p_limit?: number; p_now?: string }
        Returns: Json
      }
      reserve_ai_media_cost_budget: {
        Args: {
          p_idempotency_key: string
          p_owner_id: string
          p_requested_cost_units: number
        }
        Returns: {
          allowed: boolean
          remaining_cost_units: number
          reservation_id: string
          reservation_status: string
          reserved_cost_units: number
        }[]
      }
      reserve_ai_token_budget: {
        Args: {
          p_idempotency_key: string
          p_owner_id: string
          p_requested_tokens: number
        }
        Returns: {
          allowed: boolean
          remaining_tokens: number
          reservation_id: string
          reservation_status: string
          reserved_tokens: number
        }[]
      }
      reserve_worker_rate_limit: {
        Args: {
          max_count: number
          requested_feature: string
          requested_owner_id: string
          requested_scope: string
          requested_tenant_id: string
          window_seconds: number
        }
        Returns: {
          allowed: boolean
          count: number
          remaining: number
          reset_at: string
        }[]
      }
      revalidate_assignment_media_upload_claim: {
        Args: {
          p_assignment_id: string
          p_candidate_storage_key: string
          p_claim_epoch: number
          p_claim_token: string
          p_owner_id: string
          p_upload_id: string
        }
        Returns: Json
      }
      save_assessment_response: {
        Args: { p_attempt_id: string; p_item_id: string; p_response: Json }
        Returns: boolean
      }
      save_assignment_artifact_block: {
        Args: {
          p_artifact_type: string
          p_assignment_id: string
          p_block_key: string
          p_block_type: string
          p_capability: string
          p_content: Json
          p_label: string
          p_plain_text: string
          p_position: number
          p_source_anchors?: Json
        }
        Returns: Json
      }
      save_practice_attempt: {
        Args: {
          p_artifact_id: string
          p_assignment_id: string
          p_attempt_number: number
          p_completed: boolean
          p_responses: Json
          p_result: Json
        }
        Returns: string
      }
      score_qti_item_response: {
        Args: {
          item_interaction_type: string
          item_points: number
          item_response_declaration: Json
          student_response: Json
        }
        Returns: number
      }
      select_assignment_work_profile: {
        Args: { p_assignment_id: string; p_mode: string }
        Returns: boolean
      }
      settle_ai_media_cost_budget: {
        Args: { p_actual_cost_units: number; p_reservation_id: string }
        Returns: {
          actual_cost_units: number
          charged_cost_units: number
          refunded_cost_units: number
          reservation_id: string
          reservation_status: string
        }[]
      }
      settle_ai_token_budget: {
        Args: { p_actual_tokens: number; p_reservation_id: string }
        Returns: {
          actual_tokens: number
          charged_tokens: number
          refunded_tokens: number
          reservation_id: string
          reservation_status: string
        }[]
      }
      start_assessment_attempt: {
        Args: { p_blueprint_id: string }
        Returns: string
      }
      submit_assessment_attempt: {
        Args: { p_attempt_id: string }
        Returns: Json
      }
      update_assignment_submission_receipt: {
        Args: { p_detail: string; p_receipt_id: string; p_status: string }
        Returns: undefined
      }
      update_course_mode_lesson_progress: {
        Args: { p_evidence?: Json; p_lesson_id: string; p_status: string }
        Returns: boolean
      }
      upsert_integration_connection: {
        Args: {
          p_access_token: string
          p_connection_id?: string
          p_metadata: Json
          p_owner_id: string
          p_provider: string
          p_refresh_token?: string
        }
        Returns: string
      }
      upsert_type_estimate: {
        Args: { p_elapsed: number; p_kind: string; p_owner_id: string }
        Returns: undefined
      }
      verify_account_deletion_storage: {
        Args: {
          p_claim_token: string
          p_now?: string
          p_request_id: string
          p_storage_objects_deleted?: number
        }
        Returns: boolean
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

// Application-level unions constrained by database checks. Keep below the
// generated schema so regeneration drift can compare the generated region.
export type AssignmentStatus =
  | "todo"
  | "drafting"
  | "checking"
  | "exporting"
  | "submitted"
  | "graded"
  | "abandoned"

export type AgeBracket = "under_13" | "13_to_17" | "adult"

export type AssignmentKind =
  | "essay"
  | "lab"
  | "problem_set"
  | "presentation"
  | "test_prep"
  | "reading"
  | "other"

export type FontSize = "small" | "normal" | "large" | "xlarge"
export type LineSpacing = "compact" | "normal" | "loose"
export type VisualPacing = "off" | "word" | "line"
export type ReadingSpacing = "normal" | "wide" | "wider"
export type TtsProvider = "browser" | "openai" | "elevenlabs"

export type Diagnosis =
  | "adhd"
  | "dyslexia"
  | "dyscalculia"
  | "dysgraphia"
  | "asd"
  | "anxiety"
  | "other"
  | "none"

export type Accommodation =
  | "extended_time"
  | "reduced_quantity"
  | "alternate_format"
  | "reader"
  | "scribe"
  | "breaks"
  | "quiet_setting"
  | "other"
