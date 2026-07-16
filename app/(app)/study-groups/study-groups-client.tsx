"use client";

import {
  ArrowRight,
  Clock3,
  Copy,
  LockKeyhole,
  Send,
  ShieldCheck,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import type { ScreenDesignAssetId } from "@/lib/screendesign/assets";
import { normalizeJoinCode } from "@/lib/social/collaboration";
import {
  createSharedDeck,
  createStudyGroup,
  createStudySession,
  joinStudyGroup,
  saveCollaborativeNote,
} from "./actions";

export type StudyGroupRow = {
  id: string;
  owner_id: string;
  name: string;
  subject: string;
  join_code: string;
  visibility: string;
  created_at: string;
};

type MemberRow = {
  owner_id: string;
  display_name: string | null;
  role: string;
  joined_at: string;
  sessionCount: number;
};

type SessionRow = {
  id: string;
  owner_id: string;
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

export type StudyGroupWorkspace = {
  group: StudyGroupRow;
  currentDisplayName: string;
  members: MemberRow[];
  sessions: SessionRow[];
  decks: DeckRow[];
  note: CollaborativeNoteRow;
};

const COMMUNITY_AVATARS: readonly ScreenDesignAssetId[] = [
  "community-sarah-avatar",
  "community-felix-avatar",
  "community-leo-avatar",
  "community-buster-avatar",
];

export function StudyGroupsClient({
  groups,
  selectedGroupId,
  workspace,
  view,
}: {
  groups: StudyGroupRow[];
  selectedGroupId: string | null;
  workspace: StudyGroupWorkspace | null;
  view: "room" | "community";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [subject, setSubject] = useState("");
  const [displayName, setDisplayName] = useState(workspace?.currentDisplayName ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [sessionTitle, setSessionTitle] = useState("Shared focus block");
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [deckTitle, setDeckTitle] = useState("Group review deck");
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [noteBody, setNoteBody] = useState(workspace?.note?.body_text ?? "");
  const [noteVersion, setNoteVersion] = useState(workspace?.note?.version ?? 1);
  const [noteDirty, setNoteDirty] = useState(false);

  useEffect(() => {
    if (!workspace?.note || noteDirty) return;
    setNoteBody(workspace.note.body_text);
    setNoteVersion(workspace.note.version);
  }, [noteDirty, workspace?.note]);

  useEffect(() => {
    if (workspace?.currentDisplayName) setDisplayName(workspace.currentDisplayName);
  }, [workspace?.currentDisplayName]);

  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? success : result.error);
      if (result.ok) router.refresh();
    });
  };

  const openCurrentRoom = () => {
    if (!workspace) {
      run(
        async () => {
          const result = await joinStudyGroup({
            joinCode: normalizeJoinCode(joinCode),
            displayName,
          });
          if (result.ok) router.push(`/study-groups?group=${result.id}`);
          return result;
        },
        "Study room joined.",
      );
      return;
    }
    run(
      () => joinStudyGroup({
        joinCode: workspace.group.join_code,
        displayName: workspace.currentDisplayName,
      }),
      "Study room opened.",
    );
  };

  const copyInvite = () => {
    if (!workspace) return;
    void navigator.clipboard?.writeText(workspace.group.join_code);
    setMessage("Invite code copied.");
  };

  if (view === "community") {
    return (
      <>
        <header className="sd-study-header">
          <div className="sd-study-header-row">
            <div>
              <DianaWordmark />
              <h1>Community<br /><span>activity</span></h1>
            </div>
            <div className="sd-study-timer" aria-label="Private group activity">
              <LockKeyhole size={17} aria-hidden="true" />
              <strong>{groups.length}</strong>
            </div>
          </div>
          <p>Your opted-in study rooms</p>
        </header>

        <main className="sd-study-scroll">
          <p className="sd-study-community-privacy">
            <ShieldCheck size={17} aria-hidden="true" />
            Activity stays inside authenticated rooms you chose to join. Diana does not publish student rankings.
          </p>

          {workspace?.members.length ? (
            <section aria-labelledby="active-roster-title">
              <div className="sd-study-section-head">
                <h2 id="active-roster-title">Active roster</h2>
                <span className="sd-study-invite">{workspace.group.name}</span>
              </div>
              <div className="sd-study-activity-spotlight" style={{ marginTop: 12 }}>
                {workspace.members.slice(0, 4).map((member, index) => (
                  <article className="sd-study-activity-card" key={member.owner_id}>
                    <SourceMedia
                      assetId={COMMUNITY_AVATARS[index % COMMUNITY_AVATARS.length]}
                      width={64}
                      height={64}
                      alt={`${member.display_name || "Room member"} avatar`}
                    />
                    <strong>{member.display_name || "Room member"}</strong>
                    <small>{member.sessionCount} shared {member.sessionCount === 1 ? "session" : "sessions"}</small>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className="sd-study-empty">Join with an invite to see private room activity.</div>
          )}

          <section className="sd-study-groups-list" aria-labelledby="opted-groups-title">
            <div className="sd-study-section-head"><h2 id="opted-groups-title">Your study circles</h2></div>
            {groups.map((group, index) => (
              <Link
                key={group.id}
                className="sd-study-group-link"
                href={`/study-groups?group=${group.id}`}
                aria-label={index === 0 ? "Open group activity" : `Open ${group.name}`}
              >
                <span>
                  <strong>{group.name}</strong>
                  <small>{group.subject || "General study"} Â· Invite only</small>
                </span>
                <span>Open <ArrowRight size={13} aria-hidden="true" /></span>
              </Link>
            ))}
          </section>
        </main>
        <StudentBottomNav />
      </>
    );
  }

  const session = workspace?.sessions[0] ?? null;

  return (
    <>
      <header className="sd-study-header">
        <div className="sd-study-header-row">
          <div>
            <DianaWordmark />
            <h1>Study<br /><span>room</span></h1>
          </div>
          <div className="sd-study-timer" aria-label="Focus block length">
            <Timer size={18} aria-hidden="true" />
            <strong>{session ? `${session.work_minutes}:00` : "Ready"}</strong>
          </div>
        </div>
        <p>{workspace?.group.name ?? "Join with an invite"}</p>
      </header>

      <main className="sd-study-scroll">
        <div className="sd-study-hero">
          <SourceMedia
            assetId="study-room-background"
            width={760}
            height={428}
            alt="Atmospheric library study room"
            priority
          />
          <div className="sd-study-hero-copy">
            <span className="sd-study-live-dot" aria-hidden="true" />
            {workspace ? `${workspace.members.length} roster ${workspace.members.length === 1 ? "member" : "members"}` : "Invite-only room"}
          </div>
        </div>

        <section className="sd-study-roster" aria-labelledby="room-roster-title">
          <div className="sd-study-section-head">
            <h2 id="room-roster-title">Roster</h2>
            <button className="sd-study-invite" type="button" onClick={copyInvite} disabled={!workspace}>Invite</button>
          </div>
          {workspace?.members.length ? (
            <div className="sd-study-members">
              {workspace.members.map((member, index) => (
                <div className="sd-study-member" key={member.owner_id}>
                  <span className="sd-study-avatar">
                    <SourceMedia
                      assetId={index === 0 ? "study-room-jordan-avatar" : COMMUNITY_AVATARS[(index - 1) % COMMUNITY_AVATARS.length]}
                      width={64}
                      height={64}
                      alt={`${member.display_name || "Room member"} avatar`}
                    />
                    <span className="sd-study-avatar-badge"><Zap size={11} aria-hidden="true" /></span>
                  </span>
                  <strong>{member.display_name || "Room member"}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="sd-study-tool-note">The roster appears only after authenticated membership is confirmed.</p>
          )}
        </section>

        <section className="sd-study-primary" aria-label="Study room access">
          {!workspace ? (
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(normalizeJoinCode(event.target.value))}
              placeholder="Invite code"
              aria-label="Invite code"
            />
          ) : null}
          <button
            type="button"
            className="sd-study-join"
            onClick={openCurrentRoom}
            disabled={pending || (!workspace && joinCode.length < 4)}
          >
            <Users size={16} aria-hidden="true" /> {pending ? "Opening room" : "Join study room"}
          </button>
          {workspace ? (
            <div className="sd-study-room-meta">
              <span>{workspace.group.subject || "General study"}</span>
              <code>{workspace.group.join_code}</code>
            </div>
          ) : null}
        </section>

        <div className="sd-study-message" aria-label="Room messaging status">
          <span>Group messages stay closed until a moderated room chat is supported.</span>
          <Send size={17} aria-hidden="true" />
        </div>

        {message ? <p className="sd-study-status" role="status">{message}</p> : null}

        <section className="sd-study-tools" aria-label="Operational study room tools">
          <details>
            <summary>Rooms and membership</summary>
            <div className="sd-study-tool-body">
              {groups.map((group) => (
                <Link href={`/study-groups?group=${group.id}`} key={group.id}>{group.name} Â· {group.subject || "General"}</Link>
              ))}
              <label>Display name<input value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} /></label>
              <label>Another invite code<input value={joinCode} onChange={(event) => setJoinCode(normalizeJoinCode(event.target.value))} /></label>
              <button
                type="button"
                disabled={pending || joinCode.length < 4}
                onClick={() => run(
                  async () => {
                    const result = await joinStudyGroup({ joinCode, displayName });
                    if (result.ok) router.push(`/study-groups?group=${result.id}`);
                    return result;
                  },
                  "Study room joined.",
                )}
              >Use invite code</button>
              <p className="sd-study-tool-note">Room owners manage membership. Closing this screen does not change who can see the room.</p>
            </div>
          </details>

          <details>
            <summary>Create a private room</summary>
            <div className="sd-study-tool-body">
              <label>Room name<input value={groupName} maxLength={120} onChange={(event) => setGroupName(event.target.value)} /></label>
              <label>Subject<input value={subject} maxLength={80} onChange={(event) => setSubject(event.target.value)} /></label>
              <button
                type="button"
                disabled={pending || !groupName.trim()}
                onClick={() => run(
                  async () => {
                    const result = await createStudyGroup({ name: groupName, subject, displayName });
                    if (result.ok) router.push(`/study-groups?group=${result.id}`);
                    return result;
                  },
                  "Private study room created.",
                )}
              >Create room</button>
            </div>
          </details>

          {workspace ? (
            <>
              <details>
                <summary>Shared focus session</summary>
                <div className="sd-study-tool-body">
                  <label>Session title<input value={sessionTitle} maxLength={140} onChange={(event) => setSessionTitle(event.target.value)} /></label>
                  <label>Work minutes<input type="number" min={5} max={60} value={workMinutes} onChange={(event) => setWorkMinutes(Number(event.target.value))} /></label>
                  <label>Break minutes<input type="number" min={1} max={30} value={breakMinutes} onChange={(event) => setBreakMinutes(Number(event.target.value))} /></label>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(
                      () => createStudySession({ groupId: workspace.group.id, title: sessionTitle, workMinutes, breakMinutes }),
                      "Shared focus session started.",
                    )}
                  ><Clock3 size={14} aria-hidden="true" /> Start shared session</button>
                  {workspace.sessions.map((item) => <p className="sd-study-tool-note" key={item.id}>{item.title} Â· {item.work_minutes}/{item.break_minutes} min Â· {item.status}</p>)}
                </div>
              </details>

              <details>
                <summary>Shared review deck</summary>
                <div className="sd-study-tool-body">
                  <label>Deck title<input value={deckTitle} maxLength={140} onChange={(event) => setDeckTitle(event.target.value)} /></label>
                  <label>Front<input value={cardFront} maxLength={2000} onChange={(event) => setCardFront(event.target.value)} /></label>
                  <label>Back<textarea value={cardBack} maxLength={4000} onChange={(event) => setCardBack(event.target.value)} /></label>
                  <button
                    type="button"
                    disabled={pending || !cardFront.trim() || !cardBack.trim()}
                    onClick={() => run(
                      async () => {
                        const result = await createSharedDeck({
                          groupId: workspace.group.id,
                          title: deckTitle,
                          source: "student",
                          cards: [{ front: cardFront, back: cardBack }],
                        });
                        if (result.ok) {
                          setCardFront("");
                          setCardBack("");
                        }
                        return result;
                      },
                      "Shared review card added.",
                    )}
                  >Share review card</button>
                  {workspace.decks.map((deck) => <p className="sd-study-tool-note" key={deck.id}>{deck.title} Â· {deck.cardCount} cards</p>)}
                </div>
              </details>

              <details>
                <summary>Collaborative notes</summary>
                <div className="sd-study-tool-body">
                  {workspace.note ? (
                    <>
                      <label>{workspace.note.title}<textarea value={noteBody} maxLength={40_000} onChange={(event) => { setNoteBody(event.target.value); setNoteDirty(true); }} /></label>
                      <button
                        type="button"
                        disabled={pending || !noteDirty}
                        onClick={() => run(
                          async () => {
                            const result = await saveCollaborativeNote({ noteId: workspace.note!.id, bodyText: noteBody, version: noteVersion });
                            if (result.ok) {
                              setNoteVersion(result.version);
                              setNoteDirty(false);
                            }
                            return result;
                          },
                          "Group notes saved.",
                        )}
                      >Save group notes</button>
                    </>
                  ) : (
                    <p className="sd-study-tool-note">The room owner has not opened a shared note.</p>
                  )}
                </div>
              </details>
            </>
          ) : null}
        </section>
      </main>
      <StudentBottomNav />
    </>
  );
}
