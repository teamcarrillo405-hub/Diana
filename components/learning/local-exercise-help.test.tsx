// @vitest-environment jsdom
import React,{useState} from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {LocalExerciseHelp} from "./local-exercise-help";
const versionId="a".repeat(64),recordId="ad37c468-67f5-4b5f-9e28-b5e947a4075c";
const saved=(version=versionId)=>({state:{id:recordId,revision:3,exerciseVersionId:version,observations:[{id:"response",text:"3x = 15",modality:"handwriting"}]}});
function Harness(){const[response,setResponse]=useState("");return <><label>Your response<input value={response} onChange={event=>setResponse(event.target.value)}/></label><LocalExerciseHelp assignmentId={recordId} exerciseId="problem-1" versionId={versionId} response={response} disabled={false} restoreResponse={setResponse} onHelp={()=>{}}/></>;}
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it("restores saved work and resumes the same record revision after reload",async()=>{
  const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(Response.json(saved())).mockResolvedValueOnce(Response.json({state:{revision:4},feedback:{title:"Next step",guidance:"Keep both sides balanced.",steps:[],nextQuestion:"What next?",limitations:[]}}));
  render(<Harness/>);
  await waitFor(()=>expect((screen.getByLabelText("Your response") as HTMLInputElement).value).toBe("3x = 15"));
  expect((screen.getByLabelText("Response format") as HTMLSelectElement).value).toBe("handwriting");
  fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(screen.getByRole("button",{name:"Give me a hint"}));
  await screen.findByText("Keep both sides balanced.");
  const body=JSON.parse(String(fetch.mock.calls[1][1]?.body));
  expect(body).toMatchObject({recordId,expectedRevision:3,response:"3x = 15",modality:"handwriting",confirmed:true});
});
it("preserves new typing while saved work is still loading",async()=>{
  let finish!:(value:Response)=>void;
  vi.spyOn(globalThis,"fetch").mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  render(<Harness/>);fireEvent.change(screen.getByLabelText("Your response"),{target:{value:"my next step"}});finish(Response.json(saved()));
  fireEvent.click(screen.getByRole("checkbox"));
  await waitFor(()=>expect((screen.getByRole("button",{name:"Give me a hint"}) as HTMLButtonElement).disabled).toBe(false));
  expect((screen.getByLabelText("Your response") as HTMLInputElement).value).toBe("my next step");
  expect((screen.getByLabelText("Response format") as HTMLSelectElement).value).toBe("typed");
});
it("does not restore work from another source version",async()=>{
  vi.spyOn(globalThis,"fetch").mockResolvedValue(Response.json(saved("b".repeat(64))));
  render(<Harness/>);fireEvent.click(screen.getByRole("checkbox"));
  await waitFor(()=>expect((screen.getByRole("button",{name:"Give me a hint"}) as HTMLButtonElement).disabled).toBe(false));
  expect((screen.getByLabelText("Your response") as HTMLInputElement).value).toBe("");
});
