import { describe, expect, it } from "vitest";
import { createPreviewState, elapsedFocus, FIXTURES, lobbyWorkspaceFixture, previewReducer, resolveFixture, resolveScenario, toggleFocus, unitStatus, workKey, type PreviewState } from "./fixtures";

const current = (state: PreviewState) => { const work = state.work[workKey(state.fixture, state.scenario)]; return work.units[work.selected]; };

describe("isolated active-work fixtures", () => {
  it("opens the matching Lobby assignment and keeps report sections independent", () => {
    expect(["history", "math", "biology", "english", "unknown"].map(lobbyWorkspaceFixture)).toEqual(["history", "algebra", "biology", "english", null]);
    expect(resolveFixture("history")).toBe("history");
    expect(resolveFixture("biology")).toBe("biology");
    let state = createPreviewState("history", "empty");
    state = previewReducer(state, { type: "edit", text: "My research plan" });
    state = previewReducer(state, { type: "select", id: "sample-history-intro" });
    expect(current(state).text).toBe("");
    state = previewReducer(state, { type: "edit", text: "My introduction" });
    state = previewReducer(state, { type: "select", id: "sample-history-plan" });
    expect(current(state).text).toBe("My research plan");
    expect(state.work["history:empty"].units["sample-history-intro"].text).toBe("My introduction");
  });
  it("has the approved math prompts and an authored English source", () => {
    expect(FIXTURES.algebra.units.map(unit => unit.prompt)).toEqual(["3x + 5 = 20", "2(x - 4) = 14", "5x - 7 = 3x + 9"]);
    expect(FIXTURES.english.units).toHaveLength(1);
    expect(FIXTURES.english.source).toContain("first rehearsal");
  });

  it("resolves unknown and repeated query values deterministically", () => {
    expect(resolveFixture("unknown")).toBe("algebra");
    expect(resolveFixture(["english", "algebra"])).toBe("english");
    expect(resolveScenario("unknown")).toBe("draft");
    expect(resolveScenario(["empty", "draft"])).toBe("empty");
  });

  it("preserves independent drafts and undo histories across units, assignments, and states", () => {
    let state = createPreviewState();
    const initial = current(state).text;
    state = previewReducer(state, { type: "edit", text: "First unit reasoning" });
    state = previewReducer(state, { type: "select", id: "sample-algebra-2" });
    state = previewReducer(state, { type: "edit", text: "Second unit reasoning" });
    state = previewReducer(state, { type: "fixture", fixture: "english" });
    state = previewReducer(state, { type: "edit", text: "A revised claim" });
    state = previewReducer(state, { type: "scenario", scenario: "empty" });
    expect(current(state).text).toBe("");
    state = previewReducer(state, { type: "edit", text: "An empty-state draft" });
    state = previewReducer(state, { type: "scenario", scenario: "draft" });
    expect(current(state).text).toBe("A revised claim");
    state = previewReducer(state, { type: "fixture", fixture: "algebra" });
    expect(current(state).text).toBe("Second unit reasoning");
    state = previewReducer(state, { type: "select", id: "sample-algebra-1" });
    expect(current(state).text).toBe("First unit reasoning");
    state = previewReducer(state, { type: "undo" });
    expect(current(state).text).toBe(initial);
    expect(state.work["algebra:draft"].units["sample-algebra-2"].text).toBe("Second unit reasoning");
  });

  it("requires human review of nonempty current text before explicit completion", () => {
    let state = createPreviewState("algebra", "empty");
    state = previewReducer(state, { type: "review", checked: true });
    state = previewReducer(state, { type: "complete" });
    expect(unitStatus(current(state))).toBe("Not started");
    state = previewReducer(state, { type: "edit", text: "My ungraded work" });
    state = previewReducer(state, { type: "complete" });
    expect(current(state).complete).toBe(false);
    state = previewReducer(state, { type: "review", checked: true });
    expect(unitStatus(current(state))).toBe("Self-reviewed");
    expect(current(state).complete).toBe(false);
    state = previewReducer(state, { type: "complete" });
    expect(unitStatus(current(state))).toBe("Complete locally");
    expect(state).not.toHaveProperty("submitted");
  });

  it("invalidates review and completion on edit and undo, including edit after done", () => {
    let state = createPreviewState();
    state = previewReducer(state, { type: "edit", text: "Student text" });
    state = previewReducer(state, { type: "review", checked: true });
    state = previewReducer(state, { type: "complete" });
    state = previewReducer(state, { type: "edit", text: "Revised student text" });
    expect(current(state)).toMatchObject({ reviewedText: null, complete: false });
    state = previewReducer(state, { type: "review", checked: true });
    state = previewReducer(state, { type: "complete" });
    state = previewReducer(state, { type: "undo" });
    expect(current(state)).toMatchObject({ text: "Student text", reviewedText: null, complete: false });
  });

  it("keeps unavailable connection work editable and self-reviewable", () => {
    let state = createPreviewState("english", "connection-unavailable");
    state = previewReducer(state, { type: "edit", text: "My own evidence paragraph." });
    state = previewReducer(state, { type: "review", checked: true });
    state = previewReducer(state, { type: "complete" });
    expect(current(state).complete).toBe(true);
  });

  it("caps undo memory and initializes independent reset state", () => {
    let state = createPreviewState();
    for (let index = 0; index < 110; index++) state = previewReducer(state, { type: "edit", text: String(index) });
    expect(current(state).history).toHaveLength(100);
    expect(current(createPreviewState()).text).toBe(FIXTURES.algebra.units[0].draft);
    expect(previewReducer(state, { type: "select", id: "live-id" })).toBe(state);
  });

  it("counts start/stop/resume time separately from work status", () => {
    const work = createPreviewState();
    let clock = toggleFocus({ elapsedMs: 0, startedAt: null }, 1000);
    expect(elapsedFocus(clock, 61000)).toBe(60000);
    clock = toggleFocus(clock, 61000);
    expect(elapsedFocus(clock, 100000)).toBe(60000);
    clock = toggleFocus(clock, 100000);
    clock = toggleFocus(clock, 102000);
    expect(clock).toEqual({ elapsedMs: 62000, startedAt: null });
    expect(unitStatus(current(work))).toBe("Draft");
    expect(current(work).reviewedText).toBeNull();
  });
  it("retains questions, conversations and ink independently for each problem", () => {
    let state = createPreviewState("algebra", "empty");
    state = previewReducer(state, { type: "ink", ink: "sample ink" });
    state = previewReducer(state, { type: "question", text: "Help with my written step" });
    state = previewReducer(state, { type: "attachment", attached: true });
    state = previewReducer(state, { type: "send" });
    state = previewReducer(state, { type: "question", text: "Unsent question" });
    state = previewReducer(state, { type: "review", checked: true });
    state = previewReducer(state, { type: "complete" });
    expect(current(state).complete).toBe(true);
    state = previewReducer(state, { type: "select", id: "sample-algebra-2" });
    expect(current(state)).toMatchObject({ ink: "", messages: [], question: "", complete: false });
    state = previewReducer(state, { type: "select", id: "sample-algebra-1" });
    expect(current(state)).toMatchObject({ ink: "sample ink", question: "Unsent question", attachment: false, complete: true });
    expect(current(state).messages[0]).toContain("Help with my written step");
    state = previewReducer(state, { type: "ink", ink: "revised ink" });
    expect(current(state)).toMatchObject({ reviewedText: null, complete: false });
    expect(current(state).question).toBe("Unsent question");
  });
});
