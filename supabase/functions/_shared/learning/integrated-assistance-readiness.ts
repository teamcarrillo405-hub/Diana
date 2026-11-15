export type IntegratedAssistanceReadiness = 'ready' | 'staged' | 'unauthorized' | 'unavailable';
type ReadinessClient = {
  from(table: 'learning_task_assistance_control'): {
    select(columns: 'singleton,enforced'): {
      eq(column: 'singleton', value: true): {
        maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
};

/** Read the actual database control using the authenticated context's service client.
 * This read-only preflight is not a substitute for the mandatory write receipt.
 */
export async function readIntegratedAssistanceReadiness(client: ReadinessClient): Promise<IntegratedAssistanceReadiness> {
  try {
    const { data, error } = await client.from('learning_task_assistance_control')
      .select('singleton,enforced').eq('singleton', true).maybeSingle();
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) return 'unavailable';
    const row = data as Record<string, unknown>;
    if (row.singleton !== true || typeof row.enforced !== 'boolean') return 'unavailable';
    return row.enforced ? 'ready' : 'staged';
  } catch { return 'unavailable'; }
}
