// @vitest-environment jsdom
import React from "react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
const crop=vi.hoisted(()=>({decode:vi.fn(),encode:vi.fn()}));
vi.mock('@/lib/learning-engine/handwriting-line-crop',async importOriginal=>({...await importOriginal<typeof import('@/lib/learning-engine/handwriting-line-crop')>(),decodeHandwritingCropImage:crop.decode,cropHandwritingLine:crop.encode}));
import {LocalRecognitionCapture} from "./local-recognition-capture";

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
function deferred<T>(){let resolve!:(value:T)=>void;let reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const available=()=>Response.json({speech:true,handwritingLine:true});
const draft=(kind:"speech"|"handwriting_line"="speech")=>Response.json({draft:{version:"recognition-draft-v1",text:"Original local transcription.",confirmedHash:null,
  recognition:{kind,modelId:"local-model",revision:"a".repeat(40),confidence:null,networkUsed:false}},proof:"synthetic-proof"});
async function startSpeech(){
  const input=await screen.findByLabelText("Optional offline speech file");
  fireEvent.change(input,{target:{files:[new File(["synthetic PCM fixture"],"original.wav",{type:"audio/wav"})]}});
  fireEvent.click(screen.getByRole("button",{name:"Read into response"}));
}

describe("local recognition capture lifecycle",()=>{
  it('sends only the selected PNG to the configured runtime after the separate reading action',async()=>{
    const selected=new File(['selected pixels'],'handwriting-line.png',{type:'image/png'}),onDraft=vi.fn();
    crop.decode.mockResolvedValue({width:720,height:120,close:vi.fn()});crop.encode.mockResolvedValue(selected);
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as never);
    vi.stubGlobal('URL',class extends URL {static createObjectURL=vi.fn(()=>'blob:local-crop');static revokeObjectURL=vi.fn();});
    const request=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,options)=>options?.method==='POST'?draft('handwriting_line'):available());
    render(<LocalRecognitionCapture contextKey="handwriting:1" kind="handwriting_line" disabled={false} onDraft={onDraft}/>);
    fireEvent.change(await screen.findByLabelText('Optional offline handwriting line'),{target:{files:[new File(['original full image'],'source.jpg',{type:'image/jpeg'})]}});
    await screen.findByRole('img',{name:/Handwriting preview/});
    await waitFor(()=>expect((screen.getByRole('button',{name:'Use selected line'}) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByRole('button',{name:'Read into response'}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Use selected line'}));await screen.findByAltText('Selected handwritten line to transcribe');
    expect(request.mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(0);expect(onDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Read into response'}));
    await waitFor(()=>expect(onDraft).toHaveBeenCalledWith('Original local transcription.','synthetic-proof'));
    const posts=request.mock.calls.filter(([,options])=>options?.method==='POST');expect(posts).toHaveLength(1);
    expect((posts[0][1]?.body as FormData).get('asset')).toBe(selected);
    expect(screen.getByText(/then confirm the transcription below/)).toBeTruthy();
  });
  it("delivers a same-context draft and leaves confirmation to the parent",async()=>{
    const onDraft=vi.fn();
    vi.spyOn(globalThis,"fetch").mockImplementation(async(_url,options)=>options?.method==="POST"?draft():available());
    render(<LocalRecognitionCapture contextKey="exercise-a:1" kind="speech" disabled={false} onDraft={onDraft}/>);
    await startSpeech();
    await waitFor(()=>expect(onDraft).toHaveBeenCalledWith("Original local transcription.","synthetic-proof"));
    expect(screen.getByRole("status").textContent).toContain("Check every word and symbol");
  });

  it.each(["context","kind"] as const)("ignores delayed POST after a %s change and clears the old file",async change=>{
    const pending=deferred<Response>(),onDraft=vi.fn();let postSignal:AbortSignal|null|undefined;
    const request=vi.spyOn(globalThis,"fetch").mockImplementation((_url,options)=>{
      if(options?.method==="POST"){postSignal=options.signal;return pending.promise;}
      return Promise.resolve(available());
    });
    const view=render(<LocalRecognitionCapture contextKey="exercise-a:1" kind="speech" disabled={false} onDraft={onDraft}/>);
    await startSpeech();
    view.rerender(<LocalRecognitionCapture contextKey={change==="context"?"exercise-b:2":"exercise-a:1"} kind={change==="kind"?"handwriting_line":"speech"} disabled={false} onDraft={onDraft}/>);
    const input=await screen.findByLabelText(change==="kind"?"Optional offline handwriting line":"Optional offline speech file");
    expect(postSignal?.aborted).toBe(true);
    expect((input as HTMLInputElement).files).toHaveLength(0);
    expect((screen.getByRole("button",{name:"Read into response"}) as HTMLButtonElement).disabled).toBe(true);
    await act(async()=>pending.resolve(draft()));
    expect(onDraft).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
    expect(request.mock.calls.filter(([,options])=>options?.method==="POST")).toHaveLength(1);
  });

  it.each(["context","kind"] as const)("ignores delayed availability after a %s change",async change=>{
    const pending=deferred<Response>();let firstSignal:AbortSignal|null|undefined;let gets=0;
    vi.spyOn(globalThis,"fetch").mockImplementation((_url,options)=>{gets++;if(gets===1){firstSignal=options?.signal;return pending.promise;}return Promise.resolve(Response.json({speech:false,handwritingLine:false}));});
    const view=render(<LocalRecognitionCapture contextKey="exercise-a:1" kind="speech" disabled={false} onDraft={vi.fn()}/>);
    view.rerender(<LocalRecognitionCapture contextKey={change==="context"?"exercise-b:2":"exercise-a:1"} kind={change==="kind"?"handwriting_line":"speech"} disabled={false} onDraft={vi.fn()}/>);
    await waitFor(()=>expect(gets).toBe(2));
    expect(firstSignal?.aborted).toBe(true);
    await act(async()=>pending.resolve(available()));
    expect(screen.queryByRole("button",{name:"Read into response"})).toBeNull();
  });

  it("ignores a decoded POST body that finishes after unmount",async()=>{
    const body=deferred<unknown>(),onDraft=vi.fn();let postSignal:AbortSignal|null|undefined;const decoding=vi.fn(()=>body.promise);
    vi.spyOn(globalThis,"fetch").mockImplementation((_url,options)=>{
      if(options?.method==="POST"){postSignal=options.signal;return Promise.resolve({ok:true,json:decoding} as unknown as Response);}
      return Promise.resolve(available());
    });
    const view=render(<LocalRecognitionCapture contextKey="exercise-a:1" kind="speech" disabled={false} onDraft={onDraft}/>);
    await startSpeech();await waitFor(()=>expect(decoding).toHaveBeenCalled());view.unmount();
    expect(postSignal?.aborted).toBe(true);
    const value=await draft().json();
    await act(async()=>body.resolve(value));
    expect(onDraft).not.toHaveBeenCalled();
  });

  it("does not let a stale rejection replace a new context success",async()=>{
    const pending=deferred<Response>(),onDraft=vi.fn();let posts=0;
    vi.spyOn(globalThis,"fetch").mockImplementation((_url,options)=>{
      if(options?.method==="POST"){posts++;return posts===1?pending.promise:Promise.resolve(draft());}
      return Promise.resolve(available());
    });
    const view=render(<LocalRecognitionCapture contextKey="exercise-a:1" kind="speech" disabled={false} onDraft={onDraft}/>);
    await startSpeech();view.rerender(<LocalRecognitionCapture contextKey="exercise-b:2" kind="speech" disabled={false} onDraft={onDraft}/>);
    await startSpeech();await waitFor(()=>expect(onDraft).toHaveBeenCalledTimes(1));
    await act(async()=>pending.reject(new Error("stale failure")));
    expect(screen.getByRole("status").textContent).toContain("Check every word and symbol");
    expect(screen.queryByText("stale failure")).toBeNull();
  });

  it("cancels recognition when parent saving disables capture and never revives it",async()=>{
    const pending=deferred<Response>(),onDraft=vi.fn();let posts=0;let canceledSignal:AbortSignal|null|undefined;
    vi.spyOn(globalThis,"fetch").mockImplementation((_url,options)=>{
      if(options?.method==="POST"){
        posts++;if(posts===1){canceledSignal=options.signal;return pending.promise;}
        return Promise.resolve(draft());
      }
      return Promise.resolve(available());
    });
    const view=render(<LocalRecognitionCapture contextKey="exercise-a:1" kind="speech" disabled={false} onDraft={onDraft}/>);
    await startSpeech();
    view.rerender(<LocalRecognitionCapture contextKey="exercise-a:1" kind="speech" disabled onDraft={onDraft}/>);
    expect(canceledSignal?.aborted).toBe(true);
    view.rerender(<LocalRecognitionCapture contextKey="exercise-a:1" kind="speech" disabled={false} onDraft={onDraft}/>);
    await act(async()=>pending.resolve(draft()));
    expect(onDraft).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Read into response"}));
    await waitFor(()=>expect(onDraft).toHaveBeenCalledTimes(1));
  });
});
