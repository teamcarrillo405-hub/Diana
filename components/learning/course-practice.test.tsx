// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CoursePractice } from "./course-practice";
import { practiceSubjectForClass } from "@/lib/learning-engine/course-domains";
import { loadCourseCatalog } from "@/lib/learning-engine/course-catalog";
import { presentCourseActivity } from "@/lib/learning-engine/course-activities";
import { responseRubric } from "@/lib/learning-engine/response-rubric";
const classId = "00000000-0000-4000-8000-000000000001";
const recordId = "00000000-0000-4000-8000-000000000002";
const digest = "a".repeat(64);
const reading = { id: "reading-question", courseId: "english", subject: "english", title: "Compare passages", skillId: "english.comparison", prompt: "Compare the evidence.", level: "middle_school", versionId: digest, method: "reading_evidence", review: "pending", limits: "Source check only", criteria: [], sources: [], rubric: responseRubric({ subject: "english", method: { kind: "reading_evidence", minimumSources: 2, criteria: ["State the claim.", "Use source evidence."] } }) };
const math = { ...reading, id: "math-question", courseId: "math", subject: "math", title: "Calculate", method: "math_exact" };
const algebra = { ...math, id: "algebra-question", courseId: "math-linear-equations-high-school", title: "Solve a linear equation", level: "high_school" };
const notebook = (text = "saved response", modality = "typed", exerciseId = reading.id) => ({
    schemaVersion: "problem-state-v1", id: recordId, revision: 2, supportCount: 1, exerciseVersionId: digest,
    scope: { classId, assignmentId: null, exerciseId },
    observations: [{ id: "response", field: "response", role: "student_step", modality, provenance: "student_entered", text, contentHash: digest, confirmedHash: digest }],
});
const data = (session: ReturnType<typeof notebook> | null = null) => ({
    courses: [reading, math].map(item => ({ id: item.courseId, title: item.courseId, subject: item.subject, level: item.level })),
    activities: [reading, math], competencies: [], session, staleSession: false,
});
const feedback = { title: "Work saved", guidance: "Saved", steps: [], nextQuestion: "", limitations: [], status: "saved", outcome: "unverified", checkMode: "source_correspondence_only", assistance: "unchanged", providerCalled: false, eligibleForKnowledge: false, quotes: [] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it.each(["Next question", "Try a new context", "Review Ratios"])("saves the draft before %s and updates selection and focus", async name => {
    const path = { activityId: reading.id, position: 1, total: 2, nextId: math.id, transferId: math.id, returnId: null,
        foundations: [{ skillId: "math.ratio", title: "Ratios", activityId: math.id }, { skillId: "reading.decoding", title: "Decoding", activityId: null }] };
    let opened = false;
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url).includes("response-review")) return Response.json({ error: "Unavailable" }, { status: 503 });
        if (init?.method === "POST") {
            const body = JSON.parse(String(init.body));
            expect(body).toMatchObject({ action: "respond", mode: "save", response: "my revision" });
            expect(opened).toBe(false);
            return Response.json({ state: { ...notebook("my revision"), revision: 3 }, feedback });
        }
        if (String(url).includes("exerciseId=")) {
            opened = true;
            return Response.json({ ...data(notebook("6", "typed", math.id)), paths: [path] });
        }
        return Response.json({ ...data(notebook()), paths: [path] });
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved response");
    expect(screen.getByText("Decoding: guided question not available yet.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "my revision" } });
    fireEvent.click(screen.getByRole("button", { name }));
    await screen.findByDisplayValue("6");
    expect((screen.getByLabelText("Subject") as HTMLSelectElement).value).toBe("math");
    expect((screen.getByLabelText("Question") as HTMLSelectElement).value).toBe(math.id);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Calculate" }));
    expect(request.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
});
it("keeps the original response when saving before path navigation is unavailable", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url).includes("response-review")) return Response.json({ error: "Unavailable" }, { status: 503 });
        if (init?.method === "POST") return Response.json({ error: "Save unavailable" }, { status: 503 });
        return Response.json({ ...data(notebook()), paths: [{ activityId: reading.id, position: 1, total: 2, nextId: math.id, transferId: null, returnId: null, foundations: [] }] });
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved response");
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "keep this draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    await screen.findByText("Save unavailable");
    expect(screen.getByDisplayValue("keep this draft")).toBeTruthy();
    expect(request.mock.calls.some(([url]) => String(url).includes("exerciseId="))).toBe(false);
});
it("restores the versioned graph and saved response and submits the shared deterministic check", async () => {
    const { activities, framework } = await loadCourseCatalog();
    const activity = activities.find(item => item.id === "course-practice-v2:science-graphs-middle-school:observe")!;
    const course = framework.courses.find(item => item.id === activity.courseId)!;
    const session = { ...notebook("8", "typed", activity.id), exerciseVersionId: activity.versionId };
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url).includes("response-review")) return Response.json({ error: "Unavailable" }, { status: 503 });
        if (init?.method === "POST") return Response.json({ state: { ...session, revision: 3 }, feedback: { ...feedback, title: "Check the plotted data", status: "checked", outcome: "matches", checkMode: "bounded_exact_result" } });
        return Response.json({ courses: [course], activities: [presentCourseActivity(activity)], competencies: [], session, staleSession: false });
    });
    render(<CoursePractice classId={classId} initialSubject="science" initialCourseId={course.id}/>);
    await screen.findByDisplayValue("8");
    expect(screen.getByRole("table", { name: "Recorded observations" })).toBeTruthy();
    expect(request.mock.calls.some(([url]) => String(url).includes("response-review"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Check my work" }));
    await screen.findByRole("heading", { name: "Check the plotted data" });
    const call = request.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({ action: "respond", mode: "check", response: "8", confirmed: true, expectedRevision: 2, id: recordId });
    expect(screen.getByRole("table", { name: "Recorded observations" })).toBeTruthy();
    expect(request.mock.calls.some(([url]) => String(url).includes("response-review"))).toBe(false);
});
it("keeps review available for a saved scientific explanation with a rubric", async () => {
    const { activities, framework } = await loadCourseCatalog();
    const activity = activities.find(item => item.method.kind === "science_explanation" && item.level === "middle_school")!;
    const course = framework.courses.find(item => item.id === activity.courseId)!;
    const session = { ...notebook("My supported explanation.", "typed", activity.id), exerciseVersionId: activity.versionId };
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
        if (String(url).endsWith("response-review?role=owner")) return Response.json({ requests: [] });
        if (String(url).includes("response-review")) return Response.json({ invitations: [] });
        return Response.json({ courses: [course], activities: [presentCourseActivity(activity)], competencies: [], session, staleSession: false });
    });
    render(<CoursePractice classId={classId} initialSubject="science" initialCourseId={course.id}/>);
    await screen.findByDisplayValue("My supported explanation.");
    await waitFor(() => expect(request.mock.calls.some(([url]) => String(url).includes("response-review?role=owner"))).toBe(true));
});
it("focuses the question only after explicit open and keeps focus during ordinary saves", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url).includes("response-review")) return Response.json({ error: "Unavailable" }, { status: 503 });
        if (init?.method === "POST") return Response.json({ state: { ...notebook(), revision: 3 }, feedback });
        return Response.json(data(notebook()));
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved response");
    const heading = screen.getByRole("heading", { name: "Compare passages" });
    expect(document.activeElement).not.toBe(heading);
    const open = screen.getByRole("button", { name: "Open question" });
    open.focus();
    fireEvent.click(open);
    await waitFor(() => expect(document.activeElement).toBe(heading));
    const response = screen.getByLabelText("Your response");
    response.focus();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(request.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    await screen.findByRole("heading", { name: "Work saved" });
    expect(document.activeElement).toBe(response);
});
it("keeps a paused course draft visible while disabling instruction",async()=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValue(Response.json({...data(notebook()),activities:[{...reading,publication:"suspended"},math]}));
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved response");
    expect((screen.getByRole("button",{name:"Check my evidence"}) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button",{name:"Give me a hint"}) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button",{name:"Save draft"}) as HTMLButtonElement).disabled).toBe(false);
});
it("keeps the class subject selected until the student explicitly resumes another saved subject", async () => {
    expect(practiceSubjectForClass(null, "Algebra")).toBe("math");
    expect(practiceSubjectForClass("science", "Period 3")).toBe("science");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(data()));
    const first = render(<CoursePractice classId={classId} initialSubject="math"/>);
    await waitFor(() => expect((screen.getByLabelText("Subject") as HTMLSelectElement).value).toBe("math"));
    first.unmount();
    vi.mocked(fetch).mockImplementation(async () => Response.json(data(notebook())));
    render(<CoursePractice classId={classId} initialSubject="math"/>);
    await screen.findByRole("button",{name:"Resume saved English question"});
    expect((screen.getByLabelText("Subject") as HTMLSelectElement).value).toBe("math");
    expect((screen.getByLabelText("Question") as HTMLSelectElement).value).toBe(math.id);
    expect(screen.queryByDisplayValue("saved response")).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Resume saved English question"}));
    await screen.findByDisplayValue("saved response");
    expect((screen.getByLabelText("Subject") as HTMLSelectElement).value).toBe("english");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Compare passages" }));
});
it("opens Algebra at its high school linear course and labels an older Math level draft for explicit resume", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
        courses: [reading,math,algebra].map(item=>({id:item.courseId,title:item.courseId,subject:item.subject,level:item.level})),
        activities:[reading,math,algebra],competencies:[],session:notebook("old ratio draft","typed",math.id),staleSession:false,
    }));
    render(<CoursePractice classId={classId} initialSubject="math" initialLevel="high_school" initialCourseId={algebra.courseId}/>);
    await screen.findByRole("button",{name:"Resume saved Math question"});
    expect((screen.getByLabelText("Course level") as HTMLSelectElement).value).toBe("high_school");
    expect((screen.getByLabelText("Practice course") as HTMLSelectElement).value).toBe(algebra.courseId);
    expect((screen.getByLabelText("Question") as HTMLSelectElement).value).toBe(algebra.id);
    expect(screen.queryByDisplayValue("old ratio draft")).toBeNull();
});
it("saves a changed draft before opening another question and restores that question's record", async () => {
    let practiceCalls = 0;
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
        if (String(url).includes("response-review")) return Response.json({ error: "Unavailable" }, { status: 503 });
        practiceCalls += 1;
        return practiceCalls === 1 ? Response.json(data(notebook())) : practiceCalls === 2
            ? Response.json({ state: { ...notebook("my revision"), revision: 3 }, feedback })
            : Response.json(data(notebook("6", "typed", math.id)));
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved response");
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "my revision" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "math" } });
    fireEvent.click(screen.getByRole("button", { name: "Open question" }));
    await screen.findByDisplayValue("6");
    const courseCalls = request.mock.calls.filter(([url]) => !String(url).includes("response-review"));
    expect(JSON.parse(String(courseCalls[1][1]?.body))).toMatchObject({ action: "respond", mode: "save", id: recordId, expectedRevision: 2, response: "my revision" });
    expect(String(courseCalls[2][0])).toContain("exerciseId=math-question");
    expect(request.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
});
it("retains the draft and retry identity when saving fails instead of opening a new question", async () => {
    let practiceCalls = 0;
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
        if (String(url).includes("response-review")) return Response.json({ error: "Unavailable" }, { status: 503 });
        practiceCalls += 1;
        return practiceCalls === 1 ? Response.json(data(notebook())) : practiceCalls === 2
            ? Response.json({ error: "Temporarily unavailable" }, { status: 503 }) : practiceCalls === 3
            ? Response.json({ state: { ...notebook("my revision"), revision: 3 }, feedback })
            : Response.json(data(notebook("6", "typed", math.id)));
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved response");
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "my revision" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "math" } });
    fireEvent.click(screen.getByRole("button", { name: "Open question" }));
    await screen.findByText("Temporarily unavailable");
    expect(request.mock.calls.filter(([url]) => !String(url).includes("response-review"))).toHaveLength(2);
    expect(screen.getByDisplayValue("my revision")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open question" }));
    await screen.findByDisplayValue("6");
    const courseCalls = request.mock.calls.filter(([url]) => !String(url).includes("response-review"));
    expect(courseCalls[1][1]?.body).toBe(courseCalls[2][1]?.body);
});
it("preserves exact saved transcription confirmation and clears it when the text changes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(data(notebook("spoken attempt", "voice"))));
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("spoken attempt");
    expect((screen.getByRole("button", { name: "Check my evidence" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Save draft" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    fireEvent.change(screen.getByLabelText("Your transcription"), { target: { value: "edited transcription" } });
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
});
it.each([
    ["voice", "student_entered", true], ["voice", "student_entered", false],
    ["handwriting", "machine_interpretation", true], ["handwriting", "machine_interpretation", false],
] as const)("restores %s %s confirmation=%s without manufacturing a confirmation", async (modality, provenance, confirmed) => {
    const state = { ...notebook("saved transcription", modality), observations: [{ ...notebook("saved transcription", modality).observations[0], provenance,
        confirmedHash: confirmed ? digest : null }] };
    vi.spyOn(globalThis, "fetch").mockImplementation(async url => String(url).includes("course-practice")
        ? Response.json(data(state as ReturnType<typeof notebook>)) : Response.json({}, { status: 503 }));
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved transcription");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(confirmed);
    expect((screen.getByRole("button", { name: "Check my evidence" }) as HTMLButtonElement).disabled).toBe(!confirmed);
});
it("saves the current response before resuming another subject and keeps it on a save error", async () => {
    const mathRecord = { ...notebook("6", "typed", math.id), id: "00000000-0000-4000-8000-000000000099" };
    let rejectSave = true;
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url).includes("response-review") || String(url).includes("local-recognition")) return Response.json({}, { status: 503 });
        if (init?.method === "POST") return rejectSave ? Response.json({ error: "Save paused" }, { status: 503 })
            : Response.json({ state: { ...mathRecord, revision: 3, observations: [{ ...mathRecord.observations[0], text: "my spoken calculation", modality: "voice" }] }, feedback });
        if (String(url).includes("exerciseId=math-question")) return Response.json(data(mathRecord));
        return Response.json(data(notebook("saved reading answer")));
    });
    render(<CoursePractice classId={classId} initialSubject="math"/>);
    await screen.findByRole("button", { name: "Resume saved English question" });
    fireEvent.click(screen.getByRole("button", { name: "Open question" }));
    await screen.findByDisplayValue("6");
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "my spoken calculation" } });
    fireEvent.click(screen.getByText("Working from handwriting or speech?"));
    fireEvent.change(screen.getByLabelText("Response format"), { target: { value: "voice" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Resume saved English question" }));
    await screen.findByText("Save paused");
    expect(screen.getByDisplayValue("my spoken calculation")).toBeTruthy();
    expect((screen.getByLabelText("Subject") as HTMLSelectElement).value).toBe("math");
    expect(request.mock.calls.some(([url]) => String(url).includes("exerciseId=reading-question"))).toBe(false);
    rejectSave = false;
    fireEvent.click(screen.getByRole("button", { name: "Resume saved English question" }));
    await screen.findByDisplayValue("saved reading answer");
    const posts = request.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(2);
    expect(posts[0][1]?.body).toBe(posts[1][1]?.body);
    expect(JSON.parse(String(posts[1][1]?.body))).toMatchObject({ action: "respond", mode: "save", id: mathRecord.id,
        response: "my spoken calculation", modality: "voice", confirmed: true, expectedRevision: 2 });
    expect((screen.getByLabelText("Subject") as HTMLSelectElement).value).toBe("english");
    const courseCalls = request.mock.calls.filter(([url]) => String(url).includes("course-practice"));
    expect(courseCalls.at(-2)?.[1]?.method).toBe("POST");
    expect(String(courseCalls.at(-1)?.[0])).toContain("exerciseId=reading-question");
});
it.each([true, false])("persists a confirmation-only change to %s before switching questions", async confirmed => {
    const saved = notebook("same spoken answer", "voice");
    saved.observations[0] = { ...saved.observations[0], confirmedHash: confirmed ? null : digest } as typeof saved.observations[0];
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url).includes("response-review") || String(url).includes("local-recognition")) return Response.json({}, { status: 503 });
        if (init?.method === "POST") return Response.json({ state: { ...saved, revision: 3 }, feedback });
        return Response.json(data(String(url).includes("exerciseId=math-question") ? notebook("6", "typed", math.id) : saved));
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("same spoken answer");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "math" } });
    fireEvent.click(screen.getByRole("button", { name: "Open question" }));
    await screen.findByDisplayValue("6");
    const post = request.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post).toBeTruthy();
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ mode: "save", response: "same spoken answer", modality: "voice", confirmed });
});
it("passes a local transcript proof only for the exact text the student confirms",async()=>{
    const request=vi.spyOn(globalThis,"fetch").mockImplementation(async (url,init)=>{
        const target=String(url);
        if(target==="/api/learning/local-recognition"&&init?.method==="POST")return Response.json({draft:{version:"recognition-draft-v1",text:"recognized answer",confirmedHash:null,
            recognition:{kind:"speech",modelId:"fixture",revision:"1".repeat(40),confidence:null,networkUsed:false}},proof:"signed.proof"});
        if(target==="/api/learning/local-recognition")return Response.json({available:true,speech:true,handwritingLine:false});
        if(target==="/api/learning/course-practice"&&init?.method==="POST")return Response.json({state:{...notebook("recognized answer","voice"),revision:3},feedback});
        return Response.json(data(notebook("spoken attempt","voice")));
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("spoken attempt");
    fireEvent.click(screen.getByText("Working from handwriting or speech?"));
    const file=await screen.findByLabelText("Optional offline speech file");
    fireEvent.change(file,{target:{files:[new File(["RIFF"],"sample.wav",{type:"audio/wav"})]}});
    fireEvent.click(screen.getByRole("button",{name:"Read into response"}));
    await screen.findByDisplayValue("recognized answer");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button",{name:"Save draft"}));
    await waitFor(()=>expect(request.mock.calls.some(([url,init])=>String(url)==="/api/learning/course-practice"&&init?.method==="POST")).toBe(true));
    const call=request.mock.calls.find(([url,init])=>String(url)==="/api/learning/course-practice"&&init?.method==="POST")!;
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({classId,response:"recognized answer",confirmed:true,modality:"voice",recognitionProof:"signed.proof"});
});
it("keeps newer student text when an earlier recognition request resolves", async () => {
    let finishRecognition!: (response: Response) => void;
    const delayed = new Promise<Response>(resolve => { finishRecognition = resolve; });
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url) === "/api/learning/local-recognition") return init?.method === "POST" ? delayed
            : Response.json({ speech: true, handwritingLine: false });
        if (String(url).includes("response-review")) return Response.json({}, { status: 503 });
        if (init?.method === "POST") return Response.json({ state: { ...notebook("new student wording", "voice"), revision: 3 }, feedback });
        return Response.json(data(notebook("saved voice answer", "voice")));
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved voice answer");
    fireEvent.click(screen.getByText("Working from handwriting or speech?"));
    fireEvent.change(await screen.findByLabelText("Optional offline speech file"), { target: { files: [new File(["RIFF"], "sample.wav", { type: "audio/wav" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Read into response" }));
    await waitFor(() => expect(request.mock.calls.some(([url, init]) => String(url) === "/api/learning/local-recognition" && init?.method === "POST")).toBe(true));
    fireEvent.change(screen.getByLabelText("Your transcription"), { target: { value: "new student wording" } });
    await act(async () => { finishRecognition(Response.json({ draft: { version: "recognition-draft-v1", text: "old machine wording", confirmedHash: null,
        recognition: { kind: "speech", modelId: "fixture", revision: "1".repeat(40), confidence: null, networkUsed: false } }, proof: "old.proof" })); });
    expect(screen.getByDisplayValue("new student wording")).toBeTruthy();
    expect(screen.queryByDisplayValue("old machine wording")).toBeNull();
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(request.mock.calls.some(([url, init]) => String(url) === "/api/learning/course-practice" && init?.method === "POST")).toBe(true));
    const post = request.mock.calls.find(([url, init]) => String(url) === "/api/learning/course-practice" && init?.method === "POST")!;
    expect(JSON.parse(String(post[1]?.body))).toMatchObject({ response: "new student wording", modality: "voice", confirmed: true });
    expect(JSON.parse(String(post[1]?.body))).not.toHaveProperty("recognitionProof");
});
it("saves new recognition provenance when the unconfirmed text is unchanged before switching", async () => {
    const saved = { ...notebook("same transcription", "voice"), observations: [{ ...notebook("same transcription", "voice").observations[0], confirmedHash: null }] };
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url) === "/api/learning/local-recognition") return init?.method === "POST"
            ? Response.json({ draft: { version: "recognition-draft-v1", text: "same transcription", confirmedHash: null,
                recognition: { kind: "speech", modelId: "fixture", revision: "1".repeat(40), confidence: null, networkUsed: false } }, proof: "new.same-text.proof" })
            : Response.json({ speech: true, handwritingLine: false });
        if (String(url).includes("response-review")) return Response.json({}, { status: 503 });
        if (init?.method === "POST") return Response.json({ state: { ...saved, revision: 3 }, feedback });
        return Response.json(data((String(url).includes("exerciseId=math-question") ? notebook("6", "typed", math.id) : saved) as ReturnType<typeof notebook>));
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("same transcription");
    fireEvent.click(screen.getByText("Working from handwriting or speech?"));
    fireEvent.change(await screen.findByLabelText("Optional offline speech file"), { target: { files: [new File(["RIFF"], "sample.wav", { type: "audio/wav" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Read into response" }));
    await screen.findByText(/Check every word and symbol/);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "math" } });
    fireEvent.click(screen.getByRole("button", { name: "Open question" }));
    await screen.findByDisplayValue("6");
    const post = request.mock.calls.find(([url, init]) => String(url) === "/api/learning/course-practice" && init?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ mode: "save", response: "same transcription", modality: "voice", confirmed: false, recognitionProof: "new.same-text.proof" });
});

it("requests review only after an unchanged saved response, two educators, and explicit consent", async () => {
    const firstId = "00000000-0000-4000-8000-000000000011";
    const secondId = "00000000-0000-4000-8000-000000000012";
    const expiredId = "00000000-0000-4000-8000-000000000013";
    const reviewId = "00000000-0000-4000-8000-000000000014";
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url).endsWith("response-review?role=owner")) return Response.json({ requests: [] });
        if (String(url).includes("response-review?")) return Response.json({ invitations: [
            { id: firstId, displayLabel: "Reading educator A", subject: "english", acceptedAt: now, expiresAt: future },
            { id: secondId, displayLabel: "Reading educator B", subject: "english", acceptedAt: now, expiresAt: future },
            { id: expiredId, displayLabel: "Old educator", subject: "english", acceptedAt: now, expiresAt: past },
        ] });
        if (String(url) === "/api/learning/response-review" && init?.method === "POST") {
            const body = JSON.parse(String(init.body));
            return Response.json(body.action === "revoke" ? { revoked: true } : { requestId: reviewId });
        }
        return Response.json(data(notebook()));
    });
    render(<CoursePractice classId={classId}/>);
    const first = await screen.findByLabelText("First educator");
    expect(screen.getAllByText("Reading educator A")).toHaveLength(2);
    expect(screen.getAllByText("Reading educator B")).toHaveLength(2);
    expect(screen.queryByText("Old educator")).toBeNull();
    expect(screen.queryByText(firstId)).toBeNull();
    expect(screen.getByRole("region", { name: "Educator response review" }).outerHTML).not.toContain(firstId);
    fireEvent.change(first, { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Second educator"), { target: { value: "1" } });
    const send = screen.getByRole("button", { name: "Request educator review" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("I agree to share this saved response with these educators for review."));
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    await screen.findByText("Request sent to two educators.");
    const sent = request.mock.calls.filter(([url, init]) => String(url) === "/api/learning/response-review" && init?.method === "POST");
    expect(sent).toHaveLength(1);
    expect(JSON.parse(String(sent[0][1]?.body))).toEqual({ action: "request", recordId, revision: 2, invitationIds: [firstId, secondId], consent: true });
    fireEvent.click(screen.getByRole("button", { name: "Withdraw request" }));
    await screen.findByRole("button", { name: "Request educator review" });
    const posts = request.mock.calls.filter(([url, init]) => String(url) === "/api/learning/response-review" && init?.method === "POST");
    expect(JSON.parse(String(posts[1][1]?.body))).toEqual({ action: "revoke", requestId: reviewId });
});

it("hides review when disabled, the response changes, or too few educators remain current", async () => {
    const firstId = "00000000-0000-4000-8000-000000000011";
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
        if (String(url).endsWith("response-review?role=owner")) return Response.json({ requests: [] });
        if (String(url).includes("response-review?")) return Response.json({ invitations: [
            { id: firstId, displayLabel: "Only educator", subject: "english", acceptedAt: new Date().toISOString(), expiresAt: future },
        ] });
        return Response.json(data(notebook()));
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved response");
    await waitFor(() => expect(request.mock.calls.some(([url]) => String(url).includes("response-review?"))).toBe(true));
    expect(screen.queryByRole("button", { name: "Request educator review" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "new unsaved text" } });
    expect(screen.queryByRole("region", { name: "Educator response review" })).toBeNull();
});

it("does not expose review when the API is disabled or the saved response lacks confirmation", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async url => String(url).includes("response-review?")
        ? Response.json({ error: "Review is unavailable" }, { status: 503 }) : Response.json(data(notebook())));
    const mounted = render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved response");
    await waitFor(() => expect(request.mock.calls.some(([url]) => String(url).includes("response-review?"))).toBe(true));
    expect(screen.queryByRole("region", { name: "Educator response review" })).toBeNull();
    mounted.unmount();
    request.mockClear();
    const unconfirmed = { ...notebook(), observations: notebook().observations.map(item => ({ ...item, confirmedHash: null })) };
    request.mockResolvedValue(Response.json({ ...data(), session: unconfirmed }));
    render(<CoursePractice classId={classId}/>);
    await screen.findByDisplayValue("saved response");
    expect(request.mock.calls.some(([url]) => String(url).includes("response-review?"))).toBe(false);
});

it("keeps the draft intact when an educator or saved revision becomes unavailable at request time", async () => {
    const firstId = "00000000-0000-4000-8000-000000000011";
    const secondId = "00000000-0000-4000-8000-000000000012";
    const future = new Date(Date.now() + 86_400_000).toISOString();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url).endsWith("response-review?role=owner")) return Response.json({ requests: [] });
        if (String(url).includes("response-review?")) return Response.json({ invitations: [firstId, secondId].map((id, index) => ({
            id, displayLabel: `Educator ${index + 1}`, subject: "english", acceptedAt: new Date().toISOString(), expiresAt: future,
        })) });
        if (String(url) === "/api/learning/response-review" && init?.method === "POST") return Response.json({ error: "Review is unavailable or its permission has changed." }, { status: 404 });
        return Response.json(data(notebook()));
    });
    render(<CoursePractice classId={classId}/>);
    fireEvent.change(await screen.findByLabelText("First educator"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Second educator"), { target: { value: "1" } });
    fireEvent.click(screen.getByLabelText("I agree to share this saved response with these educators for review."));
    fireEvent.click(screen.getByRole("button", { name: "Request educator review" }));
    await screen.findByText(/The educators or saved response may have changed/);
    expect(screen.getByDisplayValue("saved response")).toBeTruthy();
});

it("restores an active request after reload even when its one-use invitations are gone", async () => {
    const reviewId = "00000000-0000-4000-8000-000000000014";
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        if (String(url).endsWith("response-review?role=owner")) return Response.json({ requests: [{
            id: reviewId, recordId, revision: 2, expiresAt: future, revokedAt: null,
        }] });
        if (String(url).includes("response-review?invitations")) return Response.json({ invitations: [] });
        if (String(url) === "/api/learning/response-review" && init?.method === "POST") return Response.json({ revoked: true });
        return Response.json(data(notebook()));
    });
    render(<CoursePractice classId={classId}/>);
    await screen.findByText("Request sent to two educators.");
    expect(request.mock.calls.some(([url]) => String(url).includes("?invitations"))).toBe(false);
    expect(screen.getByRole("region", { name: "Educator response review" }).outerHTML).not.toContain(reviewId);
    expect(screen.queryByRole("button", { name: "Request educator review" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw request" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Educator response review" })).toBeNull());
    const post = request.mock.calls.find(([url, init]) => String(url) === "/api/learning/response-review" && init?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ action: "revoke", requestId: reviewId });
});
