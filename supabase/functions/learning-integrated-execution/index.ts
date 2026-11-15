import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import approvedPlan from './approved-plan.json' with { type: 'json' };
import { withStudentCors } from '../_shared/cors.ts';
import { requireStudentContext, type StudentAuthContext } from '../_shared/student-auth.ts';
import { runSafeBudgetedAiCall, moderateStudentContent, logInteraction } from '../_shared/safety.ts';
import { createIntegratedExecutionHandler } from '../_shared/learning/integrated-execution-handler.ts';
import { verifyIntegratedExecutionSources } from '../_shared/learning/integrated-execution-plan.ts';
import { readIntegratedResearchAssistanceReadiness, recordIntegratedResearchAssistance } from '../_shared/learning/integrated-research-assistance.ts';

// No approved corpus is bundled and the server flag is default off. A future
// reviewed deployment must replace only this function's null plan artifact.
Deno.serve(withStudentCors(async request => {
  let moderationCalls = 0, moderationUnavailable = 0;
  const handler = createIntegratedExecutionHandler({
    plan: approvedPlan, env: key => Deno.env.get(key), fetch,
    logInteraction,
    moderationState: () => ({ calls: moderationCalls, unavailable: moderationUnavailable }),
    authenticate: (request, assignmentId) => requireStudentContext(request, { assignmentId, requireAiGreen: true }),
    assistanceReadiness: (auth, row, plan) => readIntegratedResearchAssistanceReadiness(auth.serviceClient, auth.ownerId, plan, row),
    verifySources: async (auth, row) => {
      const student = auth.userClient as StudentAuthContext['userClient'];
      const selected = await student.from('learning_documents').select('id,owner_id,assignment_id,content_hash,metadata,pages').eq('owner_id', auth.ownerId)
        .eq('assignment_id', row.assignmentId).in('id', row.sourcePins.map(pin => pin.id));
      return !selected.error && verifyIntegratedExecutionSources(auth.ownerId, row, selected.data);
    },
    recordAssistance: (auth, row, _system, _user, plan) => recordIntegratedResearchAssistance(auth.serviceClient, auth.ownerId, plan, row),
    guard: async input => {
      return runSafeBudgetedAiCall({ ...input, moderator: async request => {
        if (moderationCalls >= 2) throw new Error('moderation_call_ceiling');
        moderationCalls++;
        try { return await moderateStudentContent(request, (url, init) => fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(20_000) })); }
        catch (error) { moderationUnavailable++; throw error; }
      } });
    },
  });
  return handler(request);
}));
