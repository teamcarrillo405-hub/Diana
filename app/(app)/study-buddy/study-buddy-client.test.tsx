// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/study-buddy" }));

import { StudyBuddyClient } from "./study-buddy-client";
import {PRECALCULUS_BOOK} from "@/lib/learning-engine/textbook-catalog";

const evidence = {
  verificationLevel: "source_checked",
  confidence: 0.9,
  validatedAnchors: [{
    sourceId: "source-1",
    pageLabel: "Page 2",
    startOffset: 4,
    endOffset: 13,
    exactText: "formula x",
  }],
  verifierResult: null,
  limitations: [],
  escalationReason: null,
};

const availableProviderState = {
  availability: "available",
  visible: false,
  title: null,
  message: null,
  reasonCode: null,
  retryable: false,
  retryAfterSeconds: null,
  verificationLevelCap: "tool_checked",
  confidenceCap: 1,
  escalationReason: null,
};

describe("StudyBuddyClient", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends only to the authenticated application route and keeps the conversation visible", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        ok: true,
        response: {
          title: "Guided step",
          main: "Name the value of a before choosing the formula step.",
          reason: "That keeps the setup in your own reasoning.",
          steps: ["Find a.", "Find b.", "Find c."],
          anchor: "Quadratic formula",
        },
        evidence,
        providerState: availableProviderState,
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );

    render(
      <StudyBuddyClient
        initialSource="Quadratic formula"
        initialQuestion="How do I begin?"
        tutorName="Coach Diana"
        assignmentId="11111111-1111-4111-8111-111111111111"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send tutor message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/diana/study-buddy");
      expect(screen.getByText("Name the value of a before choosing the formula step.")).toBeVisible();
      expect(screen.getByText("How do I begin?")).toBeVisible();
      expect(screen.getByText("Source checked: Page 2")).toBeVisible();
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("api.anthropic.com");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("service_role");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { assignmentId?: string;referenceBook?:unknown };
    expect(body.assignmentId).toBe("11111111-1111-4111-8111-111111111111");
    expect(body).not.toHaveProperty("referenceBook");
  });

  it("shows unavailable provider output as a labeled state without a coach success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        ok: false,
        error: "Provider output was not accepted.",
        evidence: {
          ...evidence,
          verificationLevel: "needs_more_information",
          confidence: 0.3,
          validatedAnchors: [],
          escalationReason: "The verification provider is unavailable.",
        },
        providerState: {
          ...availableProviderState,
          availability: "unavailable",
          visible: true,
          title: "Verification needs another try",
          message: "Diana needs the source or a working verification service before checking this response. Your work is still here.",
          reasonCode: "network",
          retryable: true,
          verificationLevelCap: "needs_more_information",
          confidenceCap: 0.3,
          escalationReason: "The verification provider is unavailable, so more information or a later retry is required.",
        },
      }), { status: 503, headers: { "content-type": "application/json" } }),
    );

    render(<StudyBuddyClient initialQuestion="Can you check this?" />);
    fireEvent.click(screen.getByRole("button", { name: "Send tutor message" }));

    expect(await screen.findByText("Verification needs another try")).toBeVisible();
    expect(screen.getByText(/working verification service/u)).toBeVisible();
    expect(screen.queryByText("Provider output was not accepted.")).not.toBeInTheDocument();
  });

  it("uses an explicitly selected textbook, links its evidence, and omits it after removal",async()=>{
    const classId="11111111-1111-4111-8111-111111111111";
    const fetchMock=vi.spyOn(globalThis,"fetch").mockImplementation(async()=>new Response(JSON.stringify({
      ok:true,response:{title:"Chapter guidance",main:"Compare how the output changes for equal changes in the input.",reason:"Use the source example.",steps:[],anchor:""},
      evidence,providerState:availableProviderState,
      references:{bookId:PRECALCULUS_BOOK.id,status:"matched",passages:[{id:"passage-1",chapter:2,location:{page:10,pageLabel:"Page 10"}}]},
    }),{status:200,headers:{"content-type":"application/json"}}));
    const {container}=render(<StudyBuddyClient layout="class" classId={classId} initialReferenceBook={{bookId:PRECALCULUS_BOOK.id,chapter:2}} initialQuestion="Ignore this essay sample"/>);
    expect(screen.getByLabelText("Tutor message")).toHaveValue("");
    expect(screen.getByLabelText("Source or class material")).toHaveValue("");
    expect(screen.getByText("Chapter 2: Linear Functions")).toBeVisible();
    expect(screen.getByRole("link",{name:"Open chapter"})).toHaveAttribute("href",`/classes/${classId}/reference/${PRECALCULUS_BOOK.id}?chapter=2`);
    expect(container.querySelector("[data-screen-design-viewport]")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Tutor message"),{target:{value:"How can I compare rates of change?"}});
    fireEvent.click(screen.getByRole("button",{name:"Send tutor message"}));
    await screen.findByText("Compare how the output changes for equal changes in the input.");
    const first=JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(first).toMatchObject({classId,source:"",referenceBook:{bookId:PRECALCULUS_BOOK.id,chapter:2}});
    expect(screen.getByRole("link",{name:"Chapter 2 · PDF page 10"})).toHaveAttribute("href",`/classes/${classId}/reference/${PRECALCULUS_BOOK.id}?chapter=2&page=10`);

    fireEvent.click(screen.getByRole("button",{name:"Remove textbook"}));
    expect(screen.queryByText("Chapter 2: Linear Functions")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tutor message"),{target:{value:"Help me organize my next step."}});
    fireEvent.click(screen.getByRole("button",{name:"Send tutor message"}));
    await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
    const second=JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(second).not.toHaveProperty("referenceBook");
    expect(second.conversation).toEqual([
      {role:"student",text:"How can I compare rates of change?"},
      {role:"assistant",text:"Compare how the output changes for equal changes in the input."},
    ]);
    await waitFor(()=>expect(screen.getAllByText("Compare how the output changes for equal changes in the input.")).toHaveLength(2));
    expect(screen.getAllByRole("link",{name:"Chapter 2 · PDF page 10"})).toHaveLength(1);
  });

  it.each([
    {references:{bookId:PRECALCULUS_BOOK.id,status:"no_evidence",passages:[]},notice:"No matching passage was found in the selected textbook context."},
    {references:{bookId:PRECALCULUS_BOOK.id,status:"matched",passages:[{id:"other-chapter",chapter:3,location:{page:1,pageLabel:"Page 1"}}]},notice:"Textbook passages are unavailable right now."},
  ])("keeps selected-book evidence limits visible: $notice",async({references,notice})=>{
    vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({ok:true,
      response:{title:"Guidance",main:"Choose a passage to review.",reason:"",steps:[],anchor:""},evidence,providerState:availableProviderState,references,
    }),{status:200,headers:{"content-type":"application/json"}}));
    render(<StudyBuddyClient layout="class" classId="11111111-1111-4111-8111-111111111111" initialReferenceBook={{bookId:PRECALCULUS_BOOK.id,chapter:2}}/>);
    fireEvent.change(screen.getByLabelText("Tutor message"),{target:{value:"Can we review this?"}});
    fireEvent.click(screen.getByRole("button",{name:"Send tutor message"}));
    expect(await screen.findByText(notice)).toBeVisible();
    expect(screen.queryByRole("link",{name:"Chapter 3 · PDF page 1"})).not.toBeInTheDocument();
  });
});
