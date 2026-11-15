// @vitest-environment jsdom
import React from "react";
import { afterEach, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const navigation = vi.hoisted(() => ({ push: vi.fn(),replace:vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
import { MaterialPractice } from "./material-practice";
const classId = "00000000-0000-4000-8000-000000000001", assignmentId = "00000000-0000-4000-8000-000000000002", id = "00000000-0000-4000-8000-000000000003", hash = "a".repeat(64);
const passage = { id: "passage-a", title: "Reading · 12", text: "The temperature rose during the trial.", documentId: "source", anchor: { versionId: hash, blockId: "b".repeat(64), contentHash: "c".repeat(64), location: { page: 2, pageLabel: "12", startOffset: 10, endOffset: 48 }, exactText: "The temperature rose during the trial." } };
const activity = { id: "practice", title: "Read with evidence", prompt: "Explain the passage.", limits: "Quotations only", criteria: [], sources: [passage] };
const notebook = (text = "saved draft", modality = "typed", revision = 1) => ({ schemaVersion: "problem-state-v1", id, revision, supportCount: 0, exerciseVersionId: hash, scope: { classId, assignmentId, exerciseId: "practice" }, observations: [{ id: "response", field: "response", role: "student_step", modality, provenance: "student_entered", text, contentHash: hash, confirmedHash: hash }] });
const data = (session: ReturnType<typeof notebook> | null = null) => ({ title: "Reading",documentId:"source", subject: "english", passages: [passage], pages: [{ page: 1, label: "11" }, { page: 2, label: "12" }], limited: false, searchLimited: false, excluded: 0, recent: [], session, activity: session ? activity : null });
const feedback = { title: "Work saved", guidance: "Saved", steps: [], nextQuestion: "", limitations: [], status: "saved", outcome: "unverified", checkMode: "source_correspondence_only", assistance: "unchanged", providerCalled: false, eligibleForKnowledge: false, quotes: [] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); navigation.push.mockClear();navigation.replace.mockClear(); });
it("submits passage identities without sending source text or answer keys", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(data())).mockResolvedValueOnce(Response.json({ state: notebook(), activity }));
    render(<MaterialPractice classId={classId} assignmentId={assignmentId} versionId={hash}/>);
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await screen.findByDisplayValue("saved draft");
    const sent = JSON.parse(String(request.mock.calls[1][1]?.body));
    expect(sent.binding.passages).toEqual([{ versionId: hash, blockId: passage.anchor.blockId }]);
    expect(sent.binding.passages[0]).not.toHaveProperty("text");
    expect(navigation.replace).toHaveBeenCalledWith(expect.stringContaining("sessionId="),{scroll:false});
    expect(screen.getByRole("link", { name: "Open source page" }).getAttribute("href")).toContain("version=" + hash + "&page=2");
});
it("keeps the draft after a save error and retries the same request before leaving", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(data(notebook())))
        .mockResolvedValueOnce(Response.json({ error: "Storage is unavailable" }, { status: 503 }))
        .mockResolvedValueOnce(Response.json({ state: notebook("my revision", "typed", 2), feedback }));
    render(<MaterialPractice classId={classId} assignmentId={assignmentId} versionId={hash} initialSessionId={id}/>);
    await screen.findByDisplayValue("saved draft");
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "my revision" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to materials" }));
    await screen.findByText("Storage is unavailable");
    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("my revision")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to materials" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining("?source=source&version="+hash+"&page=2"));
    expect(request.mock.calls[1][1]?.body).toBe(request.mock.calls[2][1]?.body);
});
it("asks for transcription confirmation on resume and after an edit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(data(notebook("spoken draft", "voice"))));
    render(<MaterialPractice classId={classId} assignmentId={assignmentId} versionId={hash} initialSessionId={id}/>);
    await screen.findByDisplayValue("spoken draft");
    expect((screen.getByRole("button", { name: "Review my response" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    expect((screen.getByRole("button", { name: "Review my response" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "edited words" } });
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("button", { name: "Save draft" }) as HTMLButtonElement).disabled).toBe(false);
});
