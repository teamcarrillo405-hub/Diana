/**
 * T2-01 — Assignment templates: types + pure helpers.
 * Reads from public.assignment_templates (see migration 0013).
 */
import type { ChecklistItem } from "@/lib/checklists/templates";

export interface TemplateChecklistItem {
  label: string;
  required: boolean;
}

export interface TemplateRubricItem {
  criterion: string;
  weight: number;
}

export interface AssignmentTemplate {
  id: string;
  name: string;
  kind: string;
  checklistItems: TemplateChecklistItem[];
  rubricItems: TemplateRubricItem[];
}

/** Parse the raw jsonb shape from Supabase into typed arrays. */
export function parseTemplateRow(row: {
  id: string;
  name: string;
  kind: string;
  checklist_items: unknown;
  rubric_items: unknown;
}): AssignmentTemplate {
  const checklistItems = Array.isArray(row.checklist_items)
    ? (row.checklist_items as TemplateChecklistItem[])
    : [];
  const rubricItems = Array.isArray(row.rubric_items)
    ? (row.rubric_items as TemplateRubricItem[])
    : [];
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    checklistItems,
    rubricItems,
  };
}

/** Build the description body that pre-fills the new-assignment form. */
export function templateToDescription(t: AssignmentTemplate): string {
  const header = `Template: ${t.name}`;
  const bullets = t.checklistItems.map((it) => `- ${it.label}`).join("\n");
  return bullets ? `${header}\n${bullets}` : header;
}

/** Convert template items to ChecklistItem shape for assignment_checklists insert. */
export function templateToChecklistItems(t: AssignmentTemplate): ChecklistItem[] {
  return t.checklistItems.map((it) => ({
    label: it.label,
    detail: null,
    required: it.required,
  }));
}

/**
 * Convenience helpers — used by server components that need all templates
 * or a single template by id. Both operate on a pre-fetched array to avoid
 * multiple round trips.
 */
export function getTemplates(rows: AssignmentTemplate[]): AssignmentTemplate[] {
  return rows;
}

export function getTemplateById(
  rows: AssignmentTemplate[],
  id: string,
): AssignmentTemplate | undefined {
  return rows.find((t) => t.id === id);
}
