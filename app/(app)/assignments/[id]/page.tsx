import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { formatDueAt } from "@/lib/format";
import { STATUS_LABEL, STATUS_HINT, nextStatesFor } from "@/lib/state-machine/assignment";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { StatusButtons } from "./status-buttons";
import { RubricPanel } from "@/components/rubric-panel";
import { explainLearnerProfileChoice } from "@/lib/learning-loop/profile";
import { getLearnerProfile } from "@/lib/learning-loop/server";
import { TestPrepPanel } from "@/components/test-prep-panel";
import {
  buildTestPrepPlan,
  coverageWindowStart,
  looksLikeTest,
  previousTestDueAt,
  type TestPrepPlan,
} from "@/lib/test-prep/plan";
import { CanvaPanel } from "@/components/canva-panel";
import { canvaEnv, looksLikeVisualProject } from "@/lib/integrations/canva";
import { isCanvaConnected } from "@/lib/integrations/canva-server";
import { Breadcrumb } from "./breadcrumb";
import { ExternalSubmissionSync } from "./external-submission-sync";
import { PivotForm } from "./pivot-form";
import { TtsButton } from "@/components/tts-button";
import { AssignmentReadingBlock } from "@/components/assignment-reading-block";
import { IntentionPrompt } from "./intention-prompt";
import { ApHelper } from "./ap-helper";
import { ArtsHelper } from "./arts-helper";
import { AppTopNav } from "../../app-top-nav";
import { ReadingPanel } from "./reading-panel";
import { ComputerScienceHelper } from "./computer-science-helper";
import { ForeignLanguageHelper } from "./foreign-language-helper";
import { HealthHelper } from "./health-helper";
import { HistoryHelper } from "./history-helper";
import { MathHelper } from "./math-helper";
import { ScienceHelper } from "./science-helper";
import { WritingAid } from "./writing-aid";
import { CitationTool } from "./citation-tool";
import { TaskBreakdown } from "./task-breakdown";
import { TaskSwitchCue } from "./task-switch-cue";
import { StudyHelperModeCard } from "./study-helper-mode-card";
import { AiUsageLog } from "@/components/ai-usage-log";
import { StudyArtifactPanel } from "@/components/study-artifact-panel";
import { LearningTurnCard } from "@/components/learning-turn-card";
import { VisualBreakdownPanel } from "@/components/visual-breakdown-panel";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import {
  buildStudyHelperContext,
  normalizeStudyHelperMode,
  shellContextFromStudyHelper,
} from "@/lib/study-helper/modes";
import {
  energyFromBody,
  readinessFromSignalValue,
} from "@/lib/support/policy";
import { StudentStateCard } from "@/components/student-state-card";
import { buildStudentStateModel, sourceAnchorsFromAssignment } from "@/lib/student-state/model";
import { buildLearningTurn } from "@/lib/study-helper/guided-learning";
import { buildVisualBreakdown } from "@/lib/study-helper/visual-breakdown";
import type { AssignmentStatus } from "@/lib/supabase/types";
import type { BreakdownStep } from "@/lib/task-breakdown/parse";

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ intent?: string; focus?: string; study?: string }>;
}) {
  const { id } = await params;
  const { intent, focus, study } = await searchParams;
  const supabase = await createClient();
  const profile = await loadProfile();

  const { data: a } = await supabase
    .from("assignments")
    .select("id, title, description, due_at, status, kind, reading_load, writing_load, estimated_minutes, difficulty, class_id, last_thought, external_source, external_url, rubric_text, submission_sync_status, ai_mode_override, classes(id, name, color, ai_mode), rubric_id")
    .eq("id", id)
    .single();
  if (!a) notFound();

  const { data: aiLog } = await supabase
    .from("ai_interactions")
    .select("feature, model, tokens_used, created_at")
    .eq("assignment_id", id)
    .order("created_at", { ascending: false });

  // Governing rubric resolution: linked rubric doc, else newest class rubric.
  // resolveRubric gives the assignment's own rubric_text precedence.
  let classRubricText: string | null = null;
  if (a.rubric_id) {
    const { data: linkedRubric } = await supabase
      .from("rubrics")
      .select("raw_text")
      .eq("id", a.rubric_id)
      .maybeSingle();
    classRubricText = linkedRubric?.raw_text ?? null;
  }
  if (!classRubricText && a.class_id) {
    const { data: classRubrics } = await supabase
      .from("rubrics")
      .select("raw_text")
      .eq("class_id", a.class_id)
      .order("created_at", { ascending: false })
      .limit(1);
    classRubricText = classRubrics?.[0]?.raw_text ?? null;
  }

  const { data: stepsRow } = await supabase
    .from("assignment_steps")
    .select("steps")
    .eq("assignment_id", id)
    .maybeSingle();
  const initialSteps: BreakdownStep[] = (stepsRow?.steps as BreakdownStep[]) ?? [];

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSignals } = await supabase
    .from("task_signals")
    .select("kind, assignment_id, value, occurred_at")
    .gte("occurred_at", since24h)
    .order("occurred_at", { ascending: false });

  const status = a.status as AssignmentStatus;
  const nexts = nextStatesFor(status);
  const classMode: AiMode =
    a.classes?.ai_mode === "red" || a.classes?.ai_mode === "yellow"
      ? a.classes.ai_mode
      : "green";
  const assignmentOverride: AiMode | null =
    a.ai_mode_override === "red" || a.ai_mode_override === "yellow" || a.ai_mode_override === "green"
      ? a.ai_mode_override
      : null;
  const classAiMode = effectiveAiMode(classMode, assignmentOverride);
  const ttsOn = profile?.tts_enabled;
  const ttsProvider = profile?.tts_provider ?? "browser";
  const ttsSpeed = Number(profile?.tts_speed ?? 1);
  const ttsPitch = Number(profile?.tts_pitch ?? 1);
  const ttsVoice = profile?.tts_voice ?? "nova";
  const ownerId = profile?.user_id ?? "";
  const readingPrefs = {
    bionic_reading: Boolean(profile?.bionic_reading),
    visual_pacing: profile?.visual_pacing ?? "off",
    line_focus: Boolean(profile?.line_focus),
  };
  const readAloudText = [a.title, a.description].filter(Boolean).join(". ");
  const scienceLike =
    a.kind === "lab" ||
    /(biology|chemistry|physics|science|environmental)/i.test(a.classes?.name ?? "");
  const assignmentText = [a.title, a.description ?? ""].join("\n");
  const historyLike =
    /(history|social studies|government|civics|economics|geography|apush|human geography)/i.test(a.classes?.name ?? "") ||
    /(primary source|dbq|document-based|happ|historical|cause and effect|map annotation|current events)/i.test(assignmentText);
  const computerScienceLike =
    /(computer science|programming|coding|software|web design|ap csp|ap csa|javascript|python)/i.test(a.classes?.name ?? "") ||
    /(code|program|algorithm|debug|pseudocode|javascript|python|java\b|array|loop|function)/i.test(assignmentText);
  const foreignLanguageLike =
    /(spanish|french|german|mandarin|chinese|italian|latin|foreign language|world language|ap language)/i.test(a.classes?.name ?? "") ||
    /(vocab|vocabulary|conjugat|translate|speaking|pronunciation|spanish|french|german|mandarin|latin)/i.test(assignmentText);
  const artsLike =
    /(art|music|drama|theater|theatre|speech|photography|film|media arts|choir|band|orchestra|elective)/i.test(a.classes?.name ?? "") ||
    /(portfolio|artist statement|reflection|scale|triad|chord|monologue|stage direction|storyboard|shot list|formal analysis|ap art history)/i.test(assignmentText);
  const healthLike =
    /(health|wellness|physical education|\bpe\b|first aid|cpr|sports medicine)/i.test(a.classes?.name ?? "") ||
    /(health question|first aid|cpr|sleep|recovery|movement goal|nutrition|mental health|reproductive health)/i.test(assignmentText);
  const apLike =
    /\bap\b|advanced placement|college board/i.test(a.classes?.name ?? "") ||
    a.kind === "test_prep" ||
    /\bfrq\b|\bdbq\b|synthesis essay|multiple choice|\bmcq\b|score band|college board/i.test(assignmentText);
  const latestReadiness = (recentSignals ?? [])
    .map((signal) => readinessFromSignalValue(signal.value))
    .find(Boolean) ?? null;
  const assignmentSourceAnchors = sourceAnchorsFromAssignment({
    title: a.title,
    description: a.description ?? null,
    rubricText: a.rubric_text ?? null,
  });
  const studentStateModel = buildStudentStateModel({
    assignment: {
      id: a.id,
      title: a.title,
      kind: a.kind,
      reading_load: a.reading_load,
      writing_load: a.writing_load,
      difficulty: a.difficulty,
      effective_minutes: a.estimated_minutes ?? 20,
      status: a.status as AssignmentStatus,
      class_id: a.class_id,
    },
    aiPolicy: classAiMode,
    readiness: latestReadiness,
    energy: energyFromBody(latestReadiness?.body) ?? "medium",
    signals: recentSignals ?? [],
    sourceAnchors: assignmentSourceAnchors,
  });
  const supportPlan = studentStateModel.supportPlan;

  // Effectiveness loop: what kinds of help have worked for this student —
  // explicit taps plus automatic completed-after-help outcomes.
  const learnerProfile = ownerId
    ? await getLearnerProfile({ supabase, ownerId })
    : null;
  const learnedPreference = learnerProfile?.preferences.preferredStudyMode ?? null;

  const studyHelperContext = buildStudyHelperContext({
    assignmentKind: a.kind,
    classAiMode,
    selectedMode: normalizeStudyHelperMode(study),
    readingLoad: a.reading_load,
    writingLoad: a.writing_load,
    supportIntensity: supportPlan.intensity,
    focusNextStep: focus === "next-step",
    learnedPreference,
    learningLoopNote: learnerProfile
      ? explainLearnerProfileChoice(learnerProfile, {
          surface: "assignment",
          recommendedMode: learnedPreference,
          supportIntensity: supportPlan.intensity,
        })
      : null,
  });

  // Test Prep Engine: when this assignment is a quiz/test/final, plan the
  // days backward from the date using the class's concept mastery map.
  let testPrepPlan: TestPrepPlan | null = null;
  let coversSince: string | null = null;
  if (looksLikeTest(a.title, a.kind) && a.due_at && a.class_id) {
    const [{ data: classConcepts }, { data: classAssignments }] = await Promise.all([
      supabase
        .from("mastery_concepts")
        .select("id, name, mastery_level")
        .eq("class_id", a.class_id)
        .order("mastery_level", { ascending: true })
        .limit(24),
      supabase
        .from("assignments")
        .select("title, kind, due_at")
        .eq("class_id", a.class_id)
        .not("due_at", "is", null)
        .order("due_at", { ascending: false })
        .limit(40),
    ]);
    testPrepPlan = buildTestPrepPlan({
      testDueAt: a.due_at,
      now: new Date(),
      concepts: (classConcepts ?? []).map((c) => ({
        id: c.id as string,
        name: c.name as string,
        masteryLevel: Number(c.mastery_level),
      })),
    });
    coversSince = coverageWindowStart(
      previousTestDueAt(classAssignments ?? [], a.due_at),
      new Date(),
    );
  }
  const shellStudyContext = shellContextFromStudyHelper(studyHelperContext);
  const learningTurn = buildLearningTurn({
    assignmentKind: a.kind,
    studentPrompt: [intent ?? "", focus ?? "", study ?? ""].join(" "),
    sourceAnchors: assignmentSourceAnchors,
    supportIntensity: supportPlan.intensity,
  });
  const visualBreakdown = buildVisualBreakdown({
    assignmentKind: a.kind,
    className: a.classes?.name ?? null,
    sourceAnchors: assignmentSourceAnchors,
    title: a.title,
  });

  return (
    <>
      <AppTopNav active="Work" />
      <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)", padding: "var(--space-17) var(--space-17) var(--space-24)" }}>
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", display: "grid", gap: "var(--space-12)" }}>
      <header style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)", display: "grid", gap: "var(--space-6)" }}>
        <Link
          href={a.classes ? `/classes/${a.classes.id}` : "/assignments"}
          style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", textDecoration: "none" }}
        >
          ← {a.classes?.name ?? "Tasks"}
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-8)" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-34)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, lineHeight: "var(--leading-tight)" }}>{a.title}</h1>
          {ttsOn && (
            <TtsButton
              text={readAloudText}
              provider={ttsProvider}
              speed={ttsSpeed}
              pitch={ttsPitch}
              voice={ttsVoice}
            />
          )}
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-13)", color: "var(--gl-text-muted)", margin: 0 }}>
          {KIND_LABEL[a.kind]}
          {a.due_at && ` · ${formatDueAt(a.due_at)}`}
        </p>
        {a.external_source && (
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: 0 }}>
            Imported from {formatExternalSource(a.external_source)}
            {a.external_url && (
              <>
                {" "}
                <Link href={a.external_url} target="_blank" style={{ color: "var(--gl-cyan)", textDecoration: "underline" }}>
                  Open original
                </Link>
              </>
            )}
          </p>
        )}
        {(a.reading_load >= 3 || a.writing_load >= 3) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
            {a.reading_load >= 3 && (
              <span style={{ padding: "2px var(--space-6)", borderRadius: "var(--radius-pill)", background: "var(--gl-blue-12)", fontSize: "var(--text-11)", fontWeight: "var(--weight-600)", color: "var(--gl-blue)" }}>
                Heavy reading
              </span>
            )}
            {a.writing_load >= 3 && (
              <span style={{ padding: "2px var(--space-6)", borderRadius: "var(--radius-pill)", background: "var(--gl-purple-12)", fontSize: "var(--text-11)", fontWeight: "var(--weight-600)", color: "var(--gl-purple-light)" }}>
                Heavy writing
              </span>
            )}
          </div>
        )}
        {a.description && (
          <AssignmentReadingBlock
            assignmentId={a.id}
            ownerId={ownerId}
            text={a.description}
            readingPrefs={readingPrefs}
            aiMode={classAiMode}
          />
        )}
      </header>

      <TaskSwitchCue assignmentId={a.id} classId={a.classes?.id ?? null} title={a.title} />

      {focus === "next-step" && (
        <section style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-cyan-22)", background: "var(--gl-cyan-08)", padding: "var(--space-12)" }}>
          <p style={{ fontFamily: "var(--font-body)", fontWeight: "var(--weight-700)", fontSize: "var(--text-14)", color: "var(--gl-cyan)", margin: "0 0 var(--space-4)" }}>
            Next-step mode
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-muted)", margin: 0 }}>
            Start with the first visible academic move below. If the steps are not built yet, use Break it down first.
          </p>
        </section>
      )}

      {testPrepPlan && (
        <TestPrepPanel plan={testPrepPlan} className={a.classes?.name ?? null} coversSince={coversSince} />
      )}

      {canvaEnv() !== null && looksLikeVisualProject(a.title, a.kind) && (
        <CanvaPanel assignmentId={a.id} connected={await isCanvaConnected(supabase)} />
      )}

      <StudyHelperModeCard assignmentId={a.id} context={studyHelperContext} />

      <StudentStateCard model={studentStateModel} title="Adaptive support state" />

      <LearningTurnCard turn={learningTurn} />

      <VisualBreakdownPanel breakdown={visualBreakdown} />

      <div id="study-artifacts" />
      <StudyArtifactPanel
        sourceType="assignment"
        sourceId={a.id}
        aiMode={classAiMode}
        studyMode={studyHelperContext.selectedMode}
      />

      <RubricPanel
        assignmentId={a.id}
        classRubricText={classRubricText}
        assignmentRubricText={a.rubric_text ?? null}
      />

      <TaskBreakdown
        assignmentId={a.id}
        classAiMode={classAiMode}
        assignmentTitle={a.title}
        assignmentDescription={a.description ?? null}
        assignmentKind={a.kind}
        estimatedMinutes={a.estimated_minutes ?? null}
        initialSteps={initialSteps}
      />

      {(a.kind === "reading" || (a.reading_load != null && a.reading_load >= 3)) && a.description && (
        <ReadingPanel
          text={a.description}
          ownerId={ownerId}
          assignmentId={a.id}
          classAiMode={classAiMode}
          readingPrefs={readingPrefs}
          ttsProvider={ttsProvider}
          ttsSpeed={ttsSpeed}
          ttsPitch={ttsPitch}
          ttsVoice={ttsVoice}
          studyContext={shellStudyContext}
        />
      )}

      {(a.kind === "problem_set" || a.kind === "test_prep") && (
        <MathHelper assignmentId={a.id} classAiMode={classAiMode} studyContext={shellStudyContext} />
      )}

      {scienceLike && (
        <ScienceHelper
          assignmentId={a.id}
          classAiMode={classAiMode}
          initialPrompt={[a.title, a.description ?? ""].filter(Boolean).join("\n\n")}
          studyContext={shellStudyContext}
        />
      )}

      {historyLike && (
        <HistoryHelper
          assignmentId={a.id}
          classAiMode={classAiMode}
          initialPrompt={[a.title, a.description ?? ""].filter(Boolean).join("\n\n")}
          studyContext={shellStudyContext}
        />
      )}

      {computerScienceLike && (
        <ComputerScienceHelper
          assignmentId={a.id}
          classAiMode={classAiMode}
          initialPrompt={[a.title, a.description ?? ""].filter(Boolean).join("\n\n")}
        />
      )}

      {foreignLanguageLike && (
        <ForeignLanguageHelper
          assignmentId={a.id}
          classAiMode={classAiMode}
          initialPrompt={[a.title, a.description ?? ""].filter(Boolean).join("\n\n")}
        />
      )}

      {artsLike && (
        <ArtsHelper
          assignmentId={a.id}
          classAiMode={classAiMode}
          initialPrompt={[a.title, a.description ?? ""].filter(Boolean).join("\n\n")}
        />
      )}

      {healthLike && (
        <HealthHelper
          assignmentId={a.id}
          classAiMode={classAiMode}
          initialPrompt={[a.title, a.description ?? ""].filter(Boolean).join("\n\n")}
        />
      )}

      {apLike && (
        <ApHelper
          assignmentId={a.id}
          classAiMode={classAiMode}
          initialPrompt={[a.title, a.description ?? ""].filter(Boolean).join("\n\n")}
          studyContext={shellStudyContext}
        />
      )}

      {a.kind === "essay" && (
        <WritingAid assignmentId={a.id} classAiMode={classAiMode} studyContext={shellStudyContext} />
      )}

      {/* Citation tool is always available — any assignment may need a source citation */}
      <CitationTool assignmentId={a.id} classAiMode={classAiMode} />

      <section style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)", display: "grid", gap: "var(--space-6)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-8)" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0 }}>
            Where are you?
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: 0 }}>{STATUS_HINT[status]}</p>
        </div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-22)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>{STATUS_LABEL[status]}</p>
        <StatusButtons assignmentId={id} from={status} options={nexts} />
      </section>

      {(status === "exporting" || status === "submitted") && (
        <ExternalSubmissionSync
          assignmentId={a.id}
          provider={a.external_source}
          externalUrl={a.external_url}
          initialStatus={a.submission_sync_status}
        />
      )}

      {(status === "drafting" || status === "checking") && (
        <Breadcrumb assignmentId={id} initial={a.last_thought ?? ""} />
      )}

      {status === "drafting" && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <PivotForm assignmentId={id} />
        </div>
      )}

      {status === "exporting" && (
        <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-cyan-22)", background: "var(--gl-cyan-08)", padding: "var(--space-12)", display: "grid", gap: "var(--space-5)" }}>
          <p style={{ fontFamily: "var(--font-body)", fontWeight: "var(--weight-700)", fontSize: "var(--text-15)", color: "var(--gl-text-primary)", margin: 0 }}>Run through your submission checklist first.</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-muted)", margin: 0 }}>
            Diana will hold you here until you tick the required boxes.
          </p>
          <Link
            href={`/assignments/${id}/submit`}
            style={{ display: "inline-flex", alignItems: "center", padding: "var(--space-8) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-cyan)", color: "var(--gl-text-on-cyan)", fontFamily: "var(--font-body)", fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none", width: "fit-content" }}
          >
            Open the checklist
          </Link>
        </div>
      )}

      {intent === "new" && (
        <IntentionPrompt assignmentId={id} />
      )}

      <AiUsageLog interactions={aiLog ?? []} />
      </div>
    </div>
    </>
  );
}

function formatExternalSource(source: string): string {
  return ({
    canvas: "Canvas",
    google_classroom: "Google Classroom",
    ics: "calendar",
    clever: "Clever",
  } as Record<string, string>)[source] ?? source.replace(/_/g, " ");
}
