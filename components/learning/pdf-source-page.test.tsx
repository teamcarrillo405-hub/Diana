// @vitest-environment jsdom
import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,render,waitFor} from "@testing-library/react";
const pdf=vi.hoisted(()=>({getPage:vi.fn(),destroy:vi.fn(),getDocument:vi.fn()}));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs",()=>({GlobalWorkerOptions:{},getDocument:pdf.getDocument}));
import {PdfSourcePage} from "./pdf-source-page";
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.clearAllMocks();});
it("reuses a chapter for page turns and reloads only when the source changes",async()=>{
  const fetch=vi.spyOn(globalThis,"fetch").mockImplementation(async()=>new Response("%PDF-test"));
  pdf.getPage.mockResolvedValue({getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve(),cancel:vi.fn()})});
  pdf.getDocument.mockImplementation(()=>({promise:Promise.resolve({numPages:100,getPage:pdf.getPage}),destroy:pdf.destroy}));
  const ready=vi.fn(),count=vi.fn();
  const view=render(<PdfSourcePage url="/chapter-1.pdf" pageNumber={1} onReady={ready} onPageCount={count}/>);
  await waitFor(()=>expect(ready).toHaveBeenCalledTimes(1));
  expect(count).toHaveBeenCalledWith(100);
  view.rerender(<PdfSourcePage url="/chapter-1.pdf" pageNumber={2} onReady={ready} onPageCount={count}/>);
  await waitFor(()=>expect(ready).toHaveBeenCalledTimes(2));
  expect(pdf.getPage).toHaveBeenLastCalledWith(2);expect(fetch).toHaveBeenCalledTimes(1);
  view.rerender(<PdfSourcePage url="/chapter-2.pdf" pageNumber={1} onReady={ready} onPageCount={count}/>);
  await waitFor(()=>expect(ready).toHaveBeenCalledTimes(3));
  expect(fetch).toHaveBeenCalledTimes(2);expect(pdf.destroy).toHaveBeenCalledTimes(1);
});
