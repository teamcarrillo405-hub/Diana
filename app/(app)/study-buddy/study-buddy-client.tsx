"use client";

import { BookOpen, ChevronDown, Loader2, MoreHorizontal, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import {z} from "zod";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { isRefusalNeeded } from "@/lib/ai/refuse-redirect";
import {
  createTutorResponseEvidence,
  parseTutorResponseEvidence,
  tutorResponseEvidenceLabel,
  type TutorResponseEvidence,
} from "@/lib/ai/tutor-response-evidence";
import {
  parseVisibleTutorProviderState,
  resolveVisibleTutorProviderState,
  type VisibleTutorProviderState,
} from "@/lib/assignment-help/provider-state";
import type { StudyBuddyRouteResponse } from "@/lib/assignment-workspace-contracts";
import {PRECALCULUS_BOOK} from "@/lib/learning-engine/textbook-catalog";
import styles from "./reference-chat.module.css";

type Mode = "guide" | "hint" | "quiz";
type ReferenceBookSelection = {bookId:string;chapter?:number};
const referenceViewSchema=z.object({bookId:z.literal(PRECALCULUS_BOOK.id),status:z.enum(["matched","no_evidence","unavailable"]),
  passages:z.array(z.object({id:z.string(),chapter:z.number().int().min(1).max(9),location:z.object({page:z.number().int().positive(),pageLabel:z.string()})})).max(6)});
type ReferenceView=z.infer<typeof referenceViewSchema>;
function selectedReferences(raw:unknown,selected:ReferenceBookSelection|null):ReferenceView|undefined{
  if(!selected)return undefined;
  const parsed=referenceViewSchema.safeParse(raw);
  if(!parsed.success||parsed.data.bookId!==selected.bookId||parsed.data.passages.some(passage=>selected.chapter!==undefined&&passage.chapter!==selected.chapter)){
    return {bookId:PRECALCULUS_BOOK.id,status:"unavailable",passages:[]};
  }
  return {...parsed.data,status:parsed.data.status==="matched"&&!parsed.data.passages.length?"no_evidence":parsed.data.status};
}

type DianaResponse = {
  title: string;
  main: string;
  reason: string;
  steps: string[];
  anchor: string;
};

type ChatMessage =
  | { id: string; role: "student"; text: string }
  | {
      id: string;
      role: "coach";
      response: DianaResponse;
      evidence: TutorResponseEvidence;
      providerState: VisibleTutorProviderState;
      references?:ReferenceView;
    };

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "guide", label: "Guide me" },
  { id: "hint", label: "Hint ladder" },
  { id: "quiz", label: "Quiz me" },
];

const BOUNDARY_RESPONSE: DianaResponse = {
  title: "Help boundary",
  main: "I can help you build the next part, but the final work stays yours.",
  reason: "That protects authorship and keeps the learning move visible.",
  anchor: "",
  steps: [
    "Name the part you want to create first.",
    "Draft one rough sentence or setup line.",
    "Ask Diana to check structure, evidence, or reasoning.",
  ],
};

const AVAILABLE_PROVIDER_STATE = resolveVisibleTutorProviderState({ availability: "available" });

const BOUNDARY_EVIDENCE = createTutorResponseEvidence({
  verificationLevel: "ai_guidance",
  confidence: 0.7,
  limitations: ["This response applies Diana's student-ownership rule rather than checking subject content."],
});

export function StudyBuddyClient({
  initialSource,
  initialQuestion,
  initialMode = "guide",
  tutorName = "Coach Diana",
  tutorStyle = "socratic",
  complexity = "balanced",
  classId,
  assignmentId,
  qaScenario,
  initialReferenceBook,
  layout = "standalone",
}: {
  initialSource?: string;
  initialQuestion?: string;
  initialMode?: Mode;
  tutorName?: string;
  tutorStyle?: "socratic" | "supportive" | "direct";
  complexity?: "simple" | "balanced" | "advanced";
  classId?: string;
  assignmentId?: string;
  qaScenario?: string;
  initialReferenceBook?: ReferenceBookSelection;
  layout?: "standalone" | "class";
} = {}) {
  const [referenceBook,setReferenceBook]=useState<ReferenceBookSelection|null>(initialReferenceBook??null);
  const [source, setSource] = useState(
    initialSource?.trim() || (initialReferenceBook?"":"Rubric: use one quote, explain the evidence, and connect it to the claim."),
  );
  const [question, setQuestion] = useState(
    initialReferenceBook?"":initialQuestion?.trim() || "I have evidence but do not know how to start the paragraph.",
  );
  const [mode, setMode] = useState<Mode>(initialMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerNotice, setProviderNotice] = useState<VisibleTutorProviderState | null>(null);

  function appendResponse(
    response: DianaResponse,
    evidence: TutorResponseEvidence,
    providerState: VisibleTutorProviderState,
    references?:ReferenceView,
  ) {
    setMessages((current) => [
      ...current,
      {
        id: `coach-${Date.now()}-${current.length}`,
        role: "coach",
        response,
        evidence,
        providerState,
        references,
      },
    ]);
  }

  async function handleAsk() {
    const studentQuestion = question.trim();
    if (loading || studentQuestion.length < 2) return;

    setMessages((current) => [
      ...current,
      { id: `student-${Date.now()}-${current.length}`, role: "student", text: studentQuestion },
    ]);
    setQuestion("");
    setError(null);
    setProviderNotice(null);

    if (isRefusalNeeded(studentQuestion)) {
      appendResponse(BOUNDARY_RESPONSE, BOUNDARY_EVIDENCE, AVAILABLE_PROVIDER_STATE);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/diana/study-buddy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, question: studentQuestion, mode, classId, assignmentId, qaScenario,
          conversation:messages.slice(-10).map(message=>message.role==="student"
            ?{role:"student",text:message.text.slice(0,1000)}
            :{role:"assistant",text:[message.response.main,...message.response.steps].join("\n").slice(0,1000)}),
          ...(referenceBook?{referenceBook}:{}) }),
      });
      const data = (await res.json()) as StudyBuddyRouteResponse;
      if (!data.ok) {
        const providerState = parseVisibleTutorProviderState(data.providerState);
        setProviderNotice(providerState?.visible ? providerState : null);
        setError(providerState?.visible ? null : data.error ?? "Diana study help is unavailable right now.");
      } else {
        const evidence = parseTutorResponseEvidence(data.evidence);
        const providerState = parseVisibleTutorProviderState(data.providerState);
        if (!data.response || !evidence || !providerState) {
          setProviderNotice(resolveVisibleTutorProviderState({
            availability: "unavailable",
            reasonCode: "unknown",
            retryable: true,
          }));
        } else {
          appendResponse(data.response, evidence, providerState,selectedReferences(data.references,referenceBook));
        }
      }
    } catch {
      setProviderNotice(resolveVisibleTutorProviderState({
        availability: "unavailable",
        reasonCode: "network",
        retryable: true,
      }));
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  const Container=layout==="class"?"section":ScreenDesignViewport;
  const referenceChapter=PRECALCULUS_BOOK.chapters.find(chapter=>chapter.number===referenceBook?.chapter);
  const referenceHref=classId&&referenceBook?`/classes/${encodeURIComponent(classId)}/reference/${encodeURIComponent(referenceBook.bookId)}${referenceBook.chapter?`?chapter=${referenceBook.chapter}`:""}`:null;
  return (
    <Container className={layout==="class"?styles.root:"sd-tutor-chat"} aria-label="Tutor chat">
      {layout!=="class"&&<header className="sd-tutor-chat-header">
        <DianaWordmark />
        <div>
          <strong>{tutorName}</strong>
          <span><i aria-hidden="true" /> Active now</span>
        </div>
        <Link href="/settings/tutor" aria-label="More tutor options"><MoreHorizontal size={19} aria-hidden="true" /></Link>
      </header>}

      <div className="sd-tutor-chat-feed" aria-live="polite">
        <details className="sd-tutor-source" open={!!referenceBook}>
          <summary><BookOpen size={14} aria-hidden="true" /> Source context <ChevronDown size={14} aria-hidden="true" /></summary>
          {referenceBook&&<div className={styles.reference}>
            <strong>{PRECALCULUS_BOOK.title}</strong>
            {referenceChapter&&<span>Chapter {referenceChapter.number}: {referenceChapter.title}</span>}
            <div>{referenceHref&&<Link href={referenceHref}>Open chapter</Link>}<button type="button" disabled={loading} onClick={()=>setReferenceBook(null)}>Remove textbook</button></div>
          </div>}
          <textarea aria-label="Source or class material" placeholder="Add a passage or class directions (optional)" value={source} onChange={(event) => setSource(event.target.value)} />
        </details>

        <article className="sd-tutor-bubble sd-tutor-bubble-coach">
          <span>{tutorName}</span>
          <p>{layout==="class"?"What would you like to work through?":"What are you working through? Share where you feel stuck, and we will find the next move together."}</p>
        </article>

        {messages.map((message) => message.role === "student" ? (
          <article key={message.id} className="sd-tutor-bubble sd-tutor-bubble-student">
            <span>You</span>
            <p>{message.text}</p>
          </article>
        ) : (
          <article key={message.id} className="sd-tutor-bubble sd-tutor-bubble-coach">
            {message.providerState.visible ? (
              <div className="sd-tutor-error" role="status" data-provider-availability={message.providerState.availability}>
                <strong>{message.providerState.title}</strong>
                <p>{message.providerState.message}</p>
              </div>
            ) : null}
            <span>{message.response.title}</span>
            <p>{message.response.main}</p>
            <small>{message.response.reason}</small>
            {message.response.steps.length > 0 ? (
              <ol>{message.response.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            ) : null}
            {message.response.anchor ? <small>{message.response.anchor}</small> : null}
            <small data-verification-level={message.evidence.verificationLevel}>
              {tutorResponseEvidenceLabel(message.evidence)}
            </small>
            {message.references&&<aside className={styles.citations} aria-label="Textbook passages">
              {message.references.status==="matched"&&classId?<>
                <span>Source passages</span>
                {message.references.passages.map(passage=><Link key={passage.id} href={`/classes/${encodeURIComponent(classId)}/reference/${message.references!.bookId}?chapter=${passage.chapter}&page=${passage.location.page}`}>Chapter {passage.chapter} · PDF page {passage.location.page}</Link>)}
              </>:<p>{message.references.status==="no_evidence"?"No matching passage was found in the selected textbook context.":"Textbook passages are unavailable right now."}</p>}
            </aside>}
          </article>
        ))}

        {loading ? (
          <div className="sd-tutor-thinking"><Loader2 size={15} className="animate-spin" aria-hidden="true" /> {tutorName} is thinking...</div>
        ) : null}
        {providerNotice?.visible ? (
          <div className="sd-tutor-error" role="status" data-provider-availability={providerNotice.availability}>
            <strong>{providerNotice.title}</strong>
            <p>{providerNotice.message}</p>
          </div>
        ) : null}
        {error ? <p className="sd-tutor-error" role="status">{error}</p> : null}
      </div>

      <section className="sd-tutor-composer" aria-label="Tutor message composer">
        <div className="sd-tutor-modes" aria-label="Tutor mode">
          {MODES.map((item) => (
            <button key={item.id} type="button" onClick={() => setMode(item.id)} aria-pressed={mode === item.id}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="sd-tutor-input-row">
          <Sparkles size={16} aria-hidden="true" />
          <textarea
            aria-label="Tutor message"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleAsk();
              }
            }}
            placeholder={`Message ${tutorName}`}
            rows={1}
          />
          <button
            type="button"
            onClick={() => void handleAsk()}
            disabled={loading || question.trim().length < 2}
            aria-label="Send tutor message"
          >
            {loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
          </button>
        </div>
        <small>{tutorStyle} guidance · {complexity} detail</small>
      </section>
      {layout!=="class"&&<StudentBottomNav />}
    </Container>
  );
}
