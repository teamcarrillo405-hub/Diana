"use client";

import { AudioLines, Check, FileImage, Mic, Plus, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type Dispatch } from "react";
import type { PreviewAction, UnitDraft } from "./fixtures";
import styles from "./preview-conversation.module.css";

export function PreviewConversation({ draft, cue, rubric, reviewed, reviewOpen, onCloseReview, onKeepWorking, dispatch }: {
  draft: UnitDraft; cue: string; rubric: readonly string[]; reviewed: boolean; reviewOpen: boolean;
  onCloseReview: () => void; onKeepWorking: () => void; dispatch: Dispatch<PreviewAction>;
}) {
  const [tool, setTool] = useState<"voice" | "dictation" | "attachment" | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  useEffect(() => { if (reviewOpen) reviewHeading.current?.focus({ preventScroll: true }); }, [reviewOpen]);
  useEffect(() => { if (feed.current) feed.current.scrollTop = feed.current.scrollHeight; }, [draft.messages.length]);
  const canSend = Boolean(draft.question.trim() || draft.attachment);
  function send() { if (canSend) { dispatch({ type: "send" }); composer.current?.focus(); } }
  function closeTool() { setTool(null); composer.current?.focus(); }

  return <section className={styles.conversation} aria-label="Ask Diana">
    <header className={styles.header}><h2>Ask Diana</h2><span>Preview / not connected</span></header>
    <div className={styles.feed} role="region" aria-label="Diana conversation" tabIndex={0} ref={feed}>
      <article className={styles.dianaMessage}><span>Diana / sample prompt</span><p>{cue}</p></article>
      {draft.messages.map((message, index) => <article className={styles.studentMessage} key={index}><span>You / preview only, not sent</span><p>{message}</p></article>)}
    </div>
    {reviewOpen && <section className={styles.review} aria-label="Work review preview">
      <header><h3 ref={reviewHeading} tabIndex={-1}>Review preview</h3><button type="button" title="Close review" aria-label="Close review" onClick={() => { onCloseReview(); onKeepWorking(); }}><X aria-hidden="true" /></button></header>
      <p>No AI review runs here. Compare your work with this sample rubric.</p>
      <ul>{rubric.map(item => <li key={item}>{item}</li>)}</ul>
      <label><input type="checkbox" checked={reviewed} disabled={!draft.text.trim() && !draft.ink} onChange={event => dispatch({ type: "review", checked: event.target.checked })} />I reviewed this draft against the prompt and rubric.</label>
      <div className={styles.reviewActions}><button type="button" onClick={onKeepWorking}>Keep working</button><button type="button" className={styles.primary} disabled={!reviewed || draft.complete} onClick={() => dispatch({ type: "complete" })}><Check aria-hidden="true" />{draft.complete ? "Complete locally" : "Mark complete locally"}</button></div>
      {draft.complete && <p role="status">Complete in this preview. Nothing has been submitted.</p>}
    </section>}
    {draft.attachment && <div className={styles.attachment}><FileImage aria-hidden="true" /><span>Sample image / no file uploaded</span><button type="button" aria-label="Remove sample attachment" title="Remove sample attachment" onClick={() => dispatch({ type: "attachment", attached: false })}><X aria-hidden="true" /></button></div>}
    <form className={styles.composer} onSubmit={event => { event.preventDefault(); send(); }}>
      <textarea ref={composer} aria-label="Message Diana" placeholder="Message Diana" value={draft.question} rows={2} maxLength={10000} onChange={event => dispatch({ type: "question", text: event.target.value })} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} />
      <div className={styles.controls}>
        <button type="button" title="Add image or PDF" aria-label="Add image or PDF" aria-expanded={tool === "attachment"} onClick={() => setTool(tool === "attachment" ? null : "attachment")}><Plus aria-hidden="true" /></button>
        <button type="button" title="Voice to text" aria-label="Voice to text" aria-expanded={tool === "dictation"} onClick={() => setTool(tool === "dictation" ? null : "dictation")}><Mic aria-hidden="true" /><span>Voice to text</span></button>
        <button type="button" title="Live voice" aria-label="Live voice" aria-expanded={tool === "voice"} onClick={() => setTool(tool === "voice" ? null : "voice")}><AudioLines aria-hidden="true" /><span>Live voice</span></button>
        <button type="submit" className={styles.send} title="Send message" aria-label="Send message" disabled={!canSend}><Send aria-hidden="true" /></button>
      </div>
    </form>
    {tool && <div className={styles.toolPreview} role="region" aria-label={`${tool === "voice" ? "Live voice" : tool === "dictation" ? "Voice to text" : "Attachment"} preview`}>
      <div><strong>{tool === "voice" ? "Live voice preview" : tool === "dictation" ? "Voice to text preview" : "Attachment preview"}</strong><p>{tool === "voice" ? "No live connection or microphone is active in this design preview." : tool === "dictation" ? "No microphone is active. A sample transcript can be added to your message." : "Use a sample attachment. No file leaves your device."}</p>
      {tool === "dictation" && <button type="button" onClick={() => { dispatch({ type: "question", text: [draft.question, "Can you help me with the first step?"].filter(Boolean).join(" ") }); closeTool(); }}>Use sample transcript</button>}
      {tool === "attachment" && <button type="button" onClick={() => { dispatch({ type: "attachment", attached: true }); closeTool(); }}>Use sample image</button>}</div>
      <button type="button" title="Close preview control" aria-label="Close preview control" onClick={closeTool}><X aria-hidden="true" /></button>
    </div>}
  </section>;
}
