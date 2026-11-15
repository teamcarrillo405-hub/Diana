import type { Database, Json } from "@/lib/supabase/types";
import type {LearningDomain} from "./course-domains";

type Table<Row> = { Row: Row; Insert: Row; Update: Partial<Row>; Relationships: [] };
export type LearningDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      learning_course_modules: Table<{id:string;course_id:string;content_hash:string;subject:string;payload:Json;created_by:string;created_at:string;status:string;published_by:string|null;published_at:string|null}>;
      learning_course_reviews: Table<{id:string;module_id:string;reviewer_id:string;qualification_ref:string;checks:Json;decision:string;notes:string;reviewed_at:string}>;
      learning_course_events: Table<{id:string;module_id:string;actor_id:string;action:string;reason:string;created_at:string}>;
      learning_rollout_cohorts: Table<{owner_id:string;enabled_features:string[];updated_at:string}>;
      learning_problem_records: Table<{id:string;owner_id:string;class_id:string;assignment_id:string|null;exercise_id:string;current_revision:number;updated_at:string}>;
      learning_problem_revisions: Table<{record_id:string;owner_id:string;revision:number;request_id:string;state:Json;created_at:string}>;
      learning_documents: Table<{
        id: string; owner_id: string; assignment_id: string | null; class_id: string | null;
        document_id: string; content_hash: string; metadata: Json; pages: Json; created_at: string;
      }>;
      learning_blocks: Table<{ id: string; version_id: string; owner_id: string; payload: Json }>;
      learning_chunks: Table<{ id: string; version_id: string; owner_id: string; payload: Json; content: string; embedding: string | null; embedding_model: string | null; search_terms: unknown }>;
      learning_attempts: Table<{ id: string; owner_id: string; assignment_id: string; problem_id: string; revision: number; payload: Json; payload_hash: string; assessment: Json; created_at: string }>;
      learning_ingestion_jobs: Table<{ id: string; owner_id: string; assignment_id: string; source_id: string; content_hash: string; state: string; cursor: number; version_id: string | null; lease_token: string | null; lease_until: string | null; attempts: number; error_code: string | null; updated_at: string; pages:Json;total_pages:number|null;subject:LearningDomain }>;
    };
    Functions: Database["public"]["Functions"] & {
      learning_list_response_review_invitations:{Args:{p_role:string};Returns:Json};
      learning_accept_response_review_invitation:{Args:{p_invitation:string};Returns:boolean};
      learning_request_response_review_by_invitations:{Args:{p_record:string;p_revision:number;p_invitations:string[]};Returns:string};
      learning_request_response_review:{Args:{p_record:string;p_revision:number;p_reviewers:string[]};Returns:string};
      learning_response_review_draft:{Args:{p_request:string};Returns:Json};
      learning_response_review_seal_ready:{Args:{p_challenge:string;p_signature:string};Returns:boolean};
      learning_response_review_seal_challenge:{Args:{p_request:string;p_packet:Json};Returns:string};
      learning_seal_response_review:{Args:{p_request:string;p_packet:Json;p_signature:string};Returns:boolean};
      learning_revoke_response_review:{Args:{p_request:string};Returns:boolean};
      learning_response_review_access:{Args:{p_request:string};Returns:Json};
      learning_list_response_reviews:{Args:{p_role:string};Returns:Json};
      learning_submit_response_rating:{Args:{p_request:string;p_subject:string;p_assessment:Json};Returns:string};
      learning_response_review_ratings:{Args:{p_request:string};Returns:Json};
      learning_response_review_registry:{Args:{p_request:string};Returns:Json};
      learning_editor_profile:{Args:Record<string,never>;Returns:Json};
      learning_course_publications:{Args:{p_expected:Json};Returns:Json};
      learning_register_course:{Args:{p_course:string;p_hash:string;p_payload:Json};Returns:string};
      learning_review_course:{Args:{p_module:string;p_checks:Json;p_notes:string;p_no_conflict:boolean};Returns:string};
      learning_set_course_publication:{Args:{p_module:string;p_action:string;p_reason:string};Returns:boolean};
      learning_save_problem:{Args:{p_id:string;p_class:string;p_assignment:string|null;p_exercise:string;p_expected:number;p_request:string;p_state:Json};Returns:Json};
      learning_recognition_provenance_ready:{Args:{p_challenge:string;p_signature:string};Returns:boolean};
      learning_enqueue_ingestion:{Args:{p_assignment:string;p_source:string;p_hash:string;p_subject:string};Returns:string};
      learning_claim_ingestion:{Args:{p_job:string};Returns:Json};
      learning_checkpoint_ingestion:{Args:{p_job:string;p_token:string;p_pages:Json;p_total:number};Returns:boolean};
      learning_finish_ingestion:{Args:{p_job:string;p_token:string;p_version:string};Returns:boolean};
      learning_fail_ingestion:{Args:{p_job:string;p_token:string;p_code:string};Returns:boolean};
      learning_list_exercises: {Args:{p_assignment:string;p_versions:string[]};Returns:Array<{id:string;version_id:string;skill_id:string;prompt:string;reviewed:boolean;next_revision:number;practice_check:Json}>};
      apply_offline_event: { Args: { p_owner: string; p_event: Json; p_schedule?: Json }; Returns: Json };
      learning_store_document: { Args: { p_document: Json }; Returns: string };
      learning_search: { Args: { p_assignment: string; p_versions: string[]; p_query: string; p_embedding?: string }; Returns: Array<{ payload: Json; lexical_rank: number | null; semantic_rank: number | null }> };
    };
  };
};
