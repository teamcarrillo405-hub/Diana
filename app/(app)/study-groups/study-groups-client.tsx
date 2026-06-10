"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Brain, FileText, ListTodo, MessageSquare, Plus, Timer, Users } from "lucide-react";
import {
  COLLAB_NOTE_REFRESH_MS,
  normalizeJoinCode,
  statusLabel,
  type ProjectTaskStatus,
} from "@/lib/social/collaboration";
import {
  addPeerExplanation,
  addProjectTask,
  createSharedDeck,
  createStudyGroup,
  createStudySession,
  joinStudyGroup,
  saveCollaborativeNote,
  updateProjectTaskStatus,
} from "./actions";

export type StudyGroupRow = {
  id: string;
  name: string;
  subject: string;
  join_code: string;
  visibility: string;
  created_at: string;
};

type SessionRow = {
  id: string;
  title: string;
  work_minutes: number;
  break_minutes: number;
  starts_at: string;
  status: string;
  created_at: string;
};

type DeckRow = {
  id: string;
  title: string;
  source: string;
  created_at: string;
  cardCount: number;
};

type CollaborativeNoteRow = {
  id: string;
  title: string;
  body_text: string;
  version: number;
  updated_at: string;
} | null;

type PeerExplanationRow = {
  id: string;
  concept: string;
  explanation: string;
  created_at: string;
};

type ProjectTaskRow = {
  id: string;
  title: string;
  assignee_name: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
};

export type StudyGroupWorkspace = {
  group: StudyGroupRow;
  memberCount: number;
  sessions: SessionRow[];
  decks: DeckRow[];
  note: CollaborativeNoteRow;
  explanations: PeerExplanationRow[];
  tasks: ProjectTaskRow[];
};

type DeckDraftCard = { front: string; back: string };

const EMPTY_CARDS: DeckDraftCard[] = [
  { front: "", back: "" },
  { front: "", back: "" },
  { front: "", back: "" },
];

const FIELD_CLASS = "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm";
const PRIMARY_BUTTON_CLASS = "inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60";
const SECONDARY_BUTTON_CLASS = "inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm disabled:opacity-60";

export function StudyGroupsClient({
  groups,
  selectedGroupId,
  workspace,
}: {
  groups: StudyGroupRow[];
  selectedGroupId: string | null;
  workspace: StudyGroupWorkspace | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [subject, setSubject] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [sessionTitle, setSessionTitle] = useState("Shared focus block");
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [deckTitle, setDeckTitle] = useState("Group review deck");
  const [deckCards, setDeckCards] = useState<DeckDraftCard[]>(EMPTY_CARDS);
  const [noteBody, setNoteBody] = useState(workspace?.note?.body_text ?? "");
  const [noteVersion, setNoteVersion] = useState(workspace?.note?.version ?? 1);
  const [noteDirty, setNoteDirty] = useState(false);
  const [concept, setConcept] = useState("");
  const [explanation, setExplanation] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    if (!workspace?.note || noteDirty) return;
    setNoteBody(workspace.note.body_text);
    setNoteVersion(workspace.note.version);
  }, [noteDirty, workspace?.note]);

  // Realtime: group note edits arrive as change events. If the channel
  // can't connect, fall back to slow polling — never the old 500ms storm.
  useEffect(() => {
    const noteId = workspace?.note?.id;
    if (!noteId) return;

    const supabase = createBrowserClient();
    let fallback: number | null = null;
    const channel = supabase
      .channel(`collab-note-${noteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "collaborative_notes", filter: `id=eq.${noteId}` },
        () => router.refresh(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (fallback === null) {
            fallback = window.setInterval(() => router.refresh(), COLLAB_NOTE_REFRESH_MS * 10);
          }
        }
      });

    return () => {
      if (fallback !== null) window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [router, workspace?.note?.id]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  function submitCreateGroup() {
    startTransition(async () => {
      const result = await createStudyGroup({ name: groupName, subject, displayName });
      if (result.ok) {
        setGroupName("");
        setSubject("");
        router.push(`/study-groups?group=${result.id}`);
        setMessage("Group created.");
      } else {
        setMessage(result.error);
      }
    });
  }

  function submitJoinGroup() {
    startTransition(async () => {
      const result = await joinStudyGroup({ joinCode: normalizeJoinCode(joinCode), displayName });
      if (result.ok) {
        setJoinCode("");
        router.push(`/study-groups?group=${result.id}`);
        setMessage("Group joined.");
      } else {
        setMessage(result.error);
      }
    });
  }

  function submitSession() {
    if (!workspace) return;
    startTransition(async () => {
      const result = await createStudySession({
        groupId: workspace.group.id,
        title: sessionTitle,
        workMinutes,
        breakMinutes,
      });
      setMessage(result.ok ? "Shared session created." : result.error);
      if (result.ok) router.refresh();
    });
  }

  function submitDeck() {
    if (!workspace) return;
    startTransition(async () => {
      const result = await createSharedDeck({
        groupId: workspace.group.id,
        title: deckTitle,
        source: "student",
        cards: deckCards,
      });
      if (result.ok) {
        setDeckCards(EMPTY_CARDS);
        setMessage(`${result.installedCards} cards added to member review queues.`);
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  function submitNote() {
    if (!workspace?.note) return;
    const note = workspace.note;
    startTransition(async () => {
      const result = await saveCollaborativeNote({
        noteId: note.id,
        bodyText: noteBody,
        version: noteVersion,
      });
      if (result.ok) {
        setNoteVersion(result.version);
        setNoteDirty(false);
        setMessage("Group notes saved.");
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  function submitExplanation() {
    if (!workspace) return;
    startTransition(async () => {
      const result = await addPeerExplanation({
        groupId: workspace.group.id,
        concept,
        explanation,
      });
      if (result.ok) {
        setConcept("");
        setExplanation("");
        setMessage("Explanation added.");
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  function submitTask() {
    if (!workspace) return;
    startTransition(async () => {
      const result = await addProjectTask({
        groupId: workspace.group.id,
        title: taskTitle,
        assigneeName,
        dueAt,
      });
      if (result.ok) {
        setTaskTitle("");
        setAssigneeName("");
        setDueAt("");
        setMessage("Task added.");
        router.refresh();
      } else {
        setMessage(result.error);
      }
    });
  }

  function updateTask(taskId: string, status: ProjectTaskStatus) {
    startTransition(async () => {
      const result = await updateProjectTaskStatus({ taskId, status });
      setMessage(result.ok ? "Task updated." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Study groups</p>
        <h1 className="text-display">Shared focus room</h1>
        <p className="text-sm text-muted">Invite-only rooms for shared work, notes, decks, and project tasks.</p>
      </header>

      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users size={16} />
            Rooms
          </div>
          <div className="space-y-1">
            {groups.length === 0 ? (
              <p className="text-sm text-muted">No rooms yet.</p>
            ) : (
              groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/study-groups?group=${group.id}`}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    group.id === selectedGroupId ? "bg-accent/10 text-accent" : "text-fg/80 hover:bg-border/40"
                  }`}
                >
                  <span className="block font-medium">{group.name}</span>
                  <span className="text-xs text-muted">{group.subject || "General"}</span>
                </Link>
              ))
            )}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2">
            <Panel title="Create room" icon={Plus}>
              <div className="space-y-2">
                <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Room name" className={FIELD_CLASS} />
                <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className={FIELD_CLASS} />
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" className={FIELD_CLASS} />
                <button onClick={submitCreateGroup} disabled={pending || !groupName.trim()} className={PRIMARY_BUTTON_CLASS}>
                  Create
                </button>
              </div>
            </Panel>

            <Panel title="Join room" icon={Users}>
              <div className="space-y-2">
                <input value={joinCode} onChange={(event) => setJoinCode(normalizeJoinCode(event.target.value))} placeholder="Invite code" className={FIELD_CLASS} />
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" className={FIELD_CLASS} />
                <button onClick={submitJoinGroup} disabled={pending || !joinCode.trim()} className={PRIMARY_BUTTON_CLASS}>
                  Join
                </button>
              </div>
            </Panel>
          </section>

          {workspace && selectedGroup ? (
            <div className="space-y-4">
              <section className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{workspace.group.name}</h2>
                    <p className="text-sm text-muted">{workspace.group.subject || "General"} - {workspace.memberCount} members</p>
                  </div>
                  <div className="rounded-md border border-border px-3 py-2 text-sm">
                    <span className="text-muted">Invite</span>{" "}
                    <span className="font-mono font-semibold">{workspace.group.join_code}</span>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <Panel title="Shared Pomodoro" icon={Timer}>
                  <div className="space-y-3">
                    <input value={sessionTitle} onChange={(event) => setSessionTitle(event.target.value)} className={FIELD_CLASS} />
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField label="Work" value={workMinutes} min={5} max={60} onChange={setWorkMinutes} />
                      <NumberField label="Break" value={breakMinutes} min={1} max={30} onChange={setBreakMinutes} />
                    </div>
                    <button onClick={submitSession} disabled={pending} className={PRIMARY_BUTTON_CLASS}>
                      Start shared session
                    </button>
                    <RowList rows={workspace.sessions.map((session) => ({
                      id: session.id,
                      title: session.title,
                      meta: `${session.work_minutes}/${session.break_minutes} min - ${session.status}`,
                    }))} empty="No shared sessions yet." />
                  </div>
                </Panel>

                <Panel title="Shared deck" icon={Brain}>
                  <div className="space-y-3">
                    <input value={deckTitle} onChange={(event) => setDeckTitle(event.target.value)} className={FIELD_CLASS} />
                    {deckCards.map((card, index) => (
                      <div key={index} className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={card.front}
                          onChange={(event) => updateDeckCard(index, "front", event.target.value, setDeckCards)}
                          placeholder="Front"
                          className={FIELD_CLASS}
                        />
                        <input
                          value={card.back}
                          onChange={(event) => updateDeckCard(index, "back", event.target.value, setDeckCards)}
                          placeholder="Back"
                          className={FIELD_CLASS}
                        />
                      </div>
                    ))}
                    <button onClick={submitDeck} disabled={pending} className={PRIMARY_BUTTON_CLASS}>
                      Share deck
                    </button>
                    <RowList rows={workspace.decks.map((deck) => ({
                      id: deck.id,
                      title: deck.title,
                      meta: `${deck.cardCount} cards - ${deck.source}`,
                    }))} empty="No shared decks yet." />
                  </div>
                </Panel>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <Panel title="Collaborative notes" icon={FileText}>
                  {workspace.note ? (
                    <div className="space-y-3">
                      <textarea
                        value={noteBody}
                        onChange={(event) => {
                          setNoteBody(event.target.value);
                          setNoteDirty(true);
                        }}
                        className="min-h-56 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                        <span>Version {noteVersion} - refresh {COLLAB_NOTE_REFRESH_MS} ms</span>
                        <button onClick={submitNote} disabled={pending || !noteDirty} className={SECONDARY_BUTTON_CLASS}>
                          Save notes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No shared note exists for this room.</p>
                  )}
                </Panel>

                <Panel title="Peer explanation" icon={MessageSquare}>
                  <div className="space-y-3">
                    <input value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="Concept" className={FIELD_CLASS} />
                    <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder="Teach it in your words" className="min-h-24 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
                    <button onClick={submitExplanation} disabled={pending || !concept.trim() || !explanation.trim()} className={PRIMARY_BUTTON_CLASS}>
                      Add explanation
                    </button>
                    <RowList rows={workspace.explanations.map((item) => ({
                      id: item.id,
                      title: item.concept,
                      meta: item.explanation,
                    }))} empty="No peer explanations yet." />
                  </div>
                </Panel>
              </section>

              <Panel title="Project coordinator" icon={ListTodo}>
                <div className="grid gap-2 sm:grid-cols-[1fr_160px_150px_auto]">
                  <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Task" className={FIELD_CLASS} />
                  <input value={assigneeName} onChange={(event) => setAssigneeName(event.target.value)} placeholder="Owner" className={FIELD_CLASS} />
                  <input value={dueAt} onChange={(event) => setDueAt(event.target.value)} type="date" className={FIELD_CLASS} />
                  <button onClick={submitTask} disabled={pending || !taskTitle.trim()} className={PRIMARY_BUTTON_CLASS}>
                    Add
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {workspace.tasks.length === 0 ? (
                    <p className="text-sm text-muted">No project tasks yet.</p>
                  ) : (
                    workspace.tasks.map((task) => (
                      <div key={task.id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted">{task.assignee_name || "Unassigned"}{task.due_at ? ` - ${task.due_at}` : ""}</p>
                        </div>
                        <select
                          value={task.status}
                          onChange={(event) => updateTask(task.id, event.target.value as ProjectTaskStatus)}
                          className="rounded-md border border-border bg-bg px-2 py-1 text-sm"
                        >
                          {(["open", "in_progress", "done"] as ProjectTaskStatus[]).map((status) => (
                            <option key={status} value={status}>{statusLabel(status)}</option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon size={16} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1 text-xs text-muted">
      <span>{label}: {value} min</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </label>
  );
}

function RowList({
  rows,
  empty,
}: {
  rows: Array<{ id: string; title: string; meta: string }>;
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-border px-3 py-2">
          <p className="text-sm font-medium">{row.title}</p>
          <p className="line-clamp-2 text-xs text-muted">{row.meta}</p>
        </div>
      ))}
    </div>
  );
}

function updateDeckCard(
  index: number,
  key: keyof DeckDraftCard,
  value: string,
  setDeckCards: React.Dispatch<React.SetStateAction<DeckDraftCard[]>>,
) {
  setDeckCards((cards) => cards.map((card, cardIndex) => (
    cardIndex === index ? { ...card, [key]: value } : card
  )));
}
