"use client";

import { Check, Plus, ShieldCheck, Upload } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { acknowledgeAssignmentSafetyProtocol } from "@/app/(app)/assignments/[id]/workspace/safety-actions";
import { CadModelViewer, CadPrimitiveViewer } from "@/components/cad-model-viewer";
import { ToolFrame, useBlockAutosave } from "@/components/assignment-native-tools";
import { SpecialistDataChart } from "@/components/specialist-data-chart";
import type { AssignmentArtifactBlockInput } from "@/lib/assignment-artifact";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import type { AssignmentPracticalGateView } from "@/lib/course-mode/practical-gate";
import {
  MAX_CAD_MODEL_BYTES,
  createCadPrimitive,
  validateCadModelFile,
  validateDimensionedSketch,
  type CadPrimitiveMesh,
  type DimensionedSketch,
  type ValidatedCadModel,
} from "@/lib/native-tools/cad";
import {
  MAX_DELIMITED_BYTES,
  MAX_DATA_ROWS,
  datasetToLabRows,
  normalizeDataChartConfig,
  parseDelimitedDataset,
  restoreImportedDataset,
  type DataChartConfig,
} from "@/lib/native-tools/data-runtime";
import {
  completedProcedureCount,
  validateDataLabRows,
  validateDesignNotebook,
  validatePerformanceEntry,
  type DataLabRow,
  type DesignAlternative,
  type EngineeringTest,
  type PerformanceLogEntry,
} from "@/lib/native-tools/technical";
import { activeRuntimeState } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState } from "@/lib/specialist-artifacts/contracts";
import {
  mergeSpecialistEditorContent,
  restoreSpecialistCadEditorMetadata,
  specialistEditorRuntimeState,
} from "@/lib/specialist-artifacts/editor-state";

type Props = {
  assignmentId: string;
  profile: AssignmentWorkProfile;
  initialBlocks: readonly AssignmentArtifactBlockInput[];
  practicalGate: AssignmentPracticalGateView;
};

type ToolProps = {
  assignmentId: string;
  artifactType: string;
  initial?: AssignmentArtifactBlockInput;
};

const text = (value: unknown) => typeof value === "string" ? value : "";
const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const id = () => crypto.randomUUID();

export function AssignmentTechnicalTools({ assignmentId, profile, initialBlocks, practicalGate }: Props) {
  const capabilities = new Set(profile.capabilities);
  const initial = (key: string) => initialBlocks.find((block) => block.key === key);
  const visible = (["design_notebook", "cad_workspace", "data_lab", "procedure_checklist", "performance_log"] as const)
    .some((capability) => capabilities.has(capability));
  if (!visible) return null;
  return (
    <section className="grid gap-5" aria-label="Technical and performance tools">
      {capabilities.has("procedure_checklist") ? (
        <ApprovedProcedureTool
          assignmentId={assignmentId}
          artifactType={profile.artifactType}
          initial={initial("approved-procedure")}
          practicalGate={practicalGate}
        />
      ) : null}
      {capabilities.has("design_notebook") ? <DesignNotebookTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("design-notebook")} /> : null}
      {capabilities.has("cad_workspace") ? <CadTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("cad-workspace")} /> : null}
      {capabilities.has("data_lab") ? <DataLabTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("data-lab")} /> : null}
      {capabilities.has("performance_log") ? <PerformanceLogTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("performance-log")} subjectDomain={profile.subjectDomain} /> : null}
    </section>
  );
}

function ApprovedProcedureTool({ assignmentId, artifactType, initial, practicalGate }: ToolProps & { practicalGate: AssignmentPracticalGateView }) {
  const persistedContent = initial?.content;
  const router = useRouter();
  const [completed, setCompleted] = useState<number[]>(() => Array.isArray(initial?.content.completedIndexes) ? initial!.content.completedIndexes.filter((item): item is number => typeof item === "number") : []);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const protocol = practicalGate.protocol;
  const steps = useMemo(() => protocol?.procedureSteps ?? [], [protocol]);
  const practicalAvailable = Boolean(
    protocol &&
    practicalGate.acknowledged &&
    practicalGate.teacherUnlocked &&
    practicalGate.ageEligible &&
    (!protocol.supervisionRequired || practicalGate.supervisionActive),
  );
  const reasons = [
    !protocol ? "No published teacher or manufacturer protocol is connected." : "",
    protocol && !practicalGate.acknowledged ? "Review and acknowledge the current protocol." : "",
    protocol && !practicalGate.ageEligible ? "The approved protocol has an age requirement." : "",
    protocol && !practicalGate.teacherUnlocked ? "A verified teacher must unlock the practical activity." : "",
    protocol?.supervisionRequired && !practicalGate.supervisionActive ? "Active in-person supervision is required." : "",
  ].filter(Boolean);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "approved-procedure",
    type: "procedure_checklist",
    capability: "procedure_checklist",
    label: "Approved procedure",
    position: 300,
    content: mergeSpecialistEditorContent(persistedContent, {
      protocolId: protocol?.id ?? null,
      protocolVersion: protocol?.version ?? null,
      completedIndexes: completed,
      practicalAvailable,
    }),
    plainText: protocol
      ? `${protocol.title} v${protocol.version}\n${completedProcedureCount(steps, completed)} of ${steps.length} approved steps recorded`
      : "",
  }), [completed, persistedContent, practicalAvailable, protocol, steps]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const acknowledge = () => {
    if (!protocol) return;
    startTransition(async () => {
      const result = await acknowledgeAssignmentSafetyProtocol({ assignmentId, protocolId: protocol.id });
      setMessage(result.ok ? "Protocol acknowledged." : result.error);
      if (result.ok) router.refresh();
    });
  };
  return (
    <ToolFrame title="Approved procedure" description="Diana displays the published steps exactly as approved and cannot rewrite hazardous instructions." status={status}>
      {!protocol ? (
        <div className="border border-amber-500 bg-amber-50 p-3 text-sm font-bold text-amber-950">
          Practical work is locked. Theory, planning, design, and data preparation remain available.
        </div>
      ) : (
        <>
          <div className="grid gap-3 border border-slate-300 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><strong>{protocol.title}</strong><p className="mb-0 mt-1 text-sm text-slate-600">Version {protocol.version}</p></div>
              <a href={protocol.sourceUri} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-800 underline">Approved source</a>
            </div>
            {protocol.requiredPpe.length > 0 ? <p className="m-0 text-sm"><strong>Protective equipment:</strong> {protocol.requiredPpe.join(", ")}</p> : null}
            {protocol.emergencySteps.length > 0 ? <div><strong className="text-sm">Emergency controls</strong><ul className="mb-0 mt-1 pl-5 text-sm">{protocol.emergencySteps.map((step) => <li key={step}>{step}</li>)}</ul></div> : null}
          </div>
          {!practicalGate.acknowledged ? <button type="button" disabled={pending} onClick={acknowledge} className="mt-3 inline-flex min-h-10 items-center gap-2 bg-slate-950 px-3 font-bold text-white"><ShieldCheck size={17} /> I reviewed this protocol</button> : null}
          <ol className="mt-4 grid gap-2 p-0">
            {steps.map((step, index) => {
              const checked = completed.includes(index);
              return <li key={`${index}-${step}`} className="list-none"><label className="flex items-start gap-3 border border-slate-300 bg-white p-3 text-sm"><input type="checkbox" checked={checked} disabled={!practicalAvailable} onChange={(event) => setCompleted((current) => event.target.checked ? [...current, index] : current.filter((item) => item !== index))} className="mt-1" /><span><strong>Step {index + 1}</strong><br />{step}</span></label></li>;
            })}
          </ol>
        </>
      )}
      {reasons.length > 0 ? <ul className="mb-0 mt-3 grid gap-1 pl-5 text-sm font-bold text-amber-900">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p className="mb-0 mt-3 inline-flex items-center gap-2 font-bold text-emerald-800"><Check size={17} /> Practical activity controls are active.</p>}
      <p className="mb-0 mt-2 text-sm font-bold" aria-live="polite">{message}</p>
    </ToolFrame>
  );
}

function DesignNotebookTool({ assignmentId, artifactType, initial }: ToolProps) {
  const content = useMemo(() => initial?.content ?? {}, [initial?.content]);
  const [problem, setProblem] = useState(() => text(content.problem));
  const [stakeholders, setStakeholders] = useState(() => text(content.stakeholders));
  const [criteria, setCriteria] = useState<string[]>(() => list(content.criteria).length ? list(content.criteria) : [""]);
  const [constraints, setConstraints] = useState<string[]>(() => list(content.constraints).length ? list(content.constraints) : [""]);
  const [alternatives, setAlternatives] = useState<DesignAlternative[]>(() => Array.isArray(content.alternatives) ? content.alternatives as DesignAlternative[] : [{ id: id(), name: "", evidence: "" }, { id: id(), name: "", evidence: "" }]);
  const [selectedAlternative, setSelectedAlternative] = useState(() => text(content.selectedAlternative));
  const [selectionReason, setSelectionReason] = useState(() => text(content.selectionReason));
  const [tests, setTests] = useState<EngineeringTest[]>(() => Array.isArray(content.tests) ? content.tests as EngineeringTest[] : [{ id: id(), method: "", result: "", revision: "" }]);
  const notebook = useMemo(
    () => ({ problem, stakeholders, criteria, constraints, alternatives, selectedAlternative, selectionReason, tests }),
    [alternatives, constraints, criteria, problem, selectedAlternative, selectionReason, stakeholders, tests],
  );
  const issues = validateDesignNotebook(notebook);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "design-notebook", type: "design_notebook", capability: "design_notebook", label: "Design notebook", position: 310,
    content: mergeSpecialistEditorContent(content, notebook),
    plainText: [
      `Problem: ${problem}`,
      `Stakeholders: ${stakeholders}`,
      `Criteria: ${criteria.filter(Boolean).join("; ")}`,
      `Constraints: ${constraints.filter(Boolean).join("; ")}`,
      ...alternatives.map((item) => `Alternative: ${item.name} | Evidence: ${item.evidence}`),
      `Selected: ${selectedAlternative}`,
      selectionReason,
      ...tests.map((item) => `Test: ${item.method} | Result: ${item.result} | Revision: ${item.revision}`),
    ].filter((item) => item.replace(/^[^:]+:\s*$/u, "").trim()).join("\n"),
  }), [alternatives, constraints, content, criteria, notebook, problem, selectedAlternative, selectionReason, stakeholders, tests]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const updateList = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => setter((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  return (
    <ToolFrame title="Engineering design notebook" description="Move from problem and constraints to alternatives, evidence, tests, and revisions." status={status}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Problem<textarea rows={3} value={problem} onChange={(event) => setProblem(event.target.value)} className="mt-1 w-full border border-slate-400 bg-white p-2 font-normal" /></label>
        <label className="text-sm font-bold">Stakeholders<textarea rows={3} value={stakeholders} onChange={(event) => setStakeholders(event.target.value)} className="mt-1 w-full border border-slate-400 bg-white p-2 font-normal" /></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <StringListEditor label="Success criteria" values={criteria} onChange={(index, value) => updateList(setCriteria, index, value)} onAdd={() => setCriteria((current) => [...current, ""])} />
        <StringListEditor label="Constraints" values={constraints} onChange={(index, value) => updateList(setConstraints, index, value)} onAdd={() => setConstraints((current) => [...current, ""])} />
      </div>
      <h3 className="mb-2 mt-5 text-base font-black">Alternatives</h3>
      <div className="grid gap-2">{alternatives.map((item, index) => <div key={item.id} className="grid gap-2 sm:grid-cols-2"><input aria-label={`Alternative ${index + 1}`} value={item.name} onChange={(event) => setAlternatives((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, name: event.target.value } : candidate))} placeholder="Alternative" className="min-h-10 border border-slate-400 bg-white px-2" /><input aria-label={`Alternative ${index + 1} evidence`} value={item.evidence} onChange={(event) => setAlternatives((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, evidence: event.target.value } : candidate))} placeholder="Evidence and tradeoffs" className="min-h-10 border border-slate-400 bg-white px-2" /></div>)}</div>
      <button type="button" onClick={() => setAlternatives((current) => [...current, { id: id(), name: "", evidence: "" }])} className="mt-2 inline-flex min-h-10 items-center gap-2 border border-slate-400 bg-white px-3 font-bold"><Plus size={16} /> Add alternative</button>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Selected alternative<input value={selectedAlternative} onChange={(event) => setSelectedAlternative(event.target.value)} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2 font-normal" /></label><label className="text-sm font-bold">Why the evidence supports it<input value={selectionReason} onChange={(event) => setSelectionReason(event.target.value)} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2 font-normal" /></label></div>
      <h3 className="mb-2 mt-5 text-base font-black">Tests and revisions</h3>
      <div className="grid gap-2">{tests.map((item, index) => <div key={item.id} className="grid gap-2 sm:grid-cols-3"><input aria-label={`Test ${index + 1} method`} value={item.method} onChange={(event) => setTests((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, method: event.target.value } : candidate))} placeholder="Test method" className="min-h-10 border border-slate-400 bg-white px-2" /><input aria-label={`Test ${index + 1} result`} value={item.result} onChange={(event) => setTests((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, result: event.target.value } : candidate))} placeholder="Result" className="min-h-10 border border-slate-400 bg-white px-2" /><input aria-label={`Test ${index + 1} revision`} value={item.revision} onChange={(event) => setTests((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, revision: event.target.value } : candidate))} placeholder="Revision" className="min-h-10 border border-slate-400 bg-white px-2" /></div>)}</div>
      <button type="button" onClick={() => setTests((current) => [...current, { id: id(), method: "", result: "", revision: "" }])} className="mt-2 inline-flex min-h-10 items-center gap-2 border border-slate-400 bg-white px-3 font-bold"><Plus size={16} /> Add test</button>
      {issues.length > 0 ? <p className="mb-0 mt-3 text-sm font-bold text-amber-900">{issues.join(" ")}</p> : null}
    </ToolFrame>
  );
}

function StringListEditor({ label, values, onChange, onAdd }: { label: string; values: string[]; onChange(index: number, value: string): void; onAdd(): void }) {
  return <fieldset className="border border-slate-300 bg-white p-3"><legend className="px-1 text-sm font-black">{label}</legend><div className="grid gap-2">{values.map((value, index) => <input key={index} aria-label={`${label} ${index + 1}`} value={value} onChange={(event) => onChange(index, event.target.value)} className="min-h-10 border border-slate-400 px-2" />)}</div><button type="button" onClick={onAdd} className="mt-2 inline-flex min-h-9 items-center gap-1 border border-slate-400 px-2 text-sm font-bold"><Plus size={14} /> Add</button></fieldset>;
}

function CadTool({ assignmentId, artifactType, initial }: ToolProps) {
  const content = useMemo(() => initial?.content ?? {}, [initial?.content]);
  const persistedDimensions = record(content.dimensions);
  const [units, setUnits] = useState<DimensionedSketch["units"]>(() =>
    content.units === "cm" || content.units === "in" || content.units === "m"
      ? content.units
      : "mm"
  );
  const [width, setWidth] = useState(() => Number(content.width ?? persistedDimensions.width) || 100);
  const [height, setHeight] = useState(() => Number(content.height ?? persistedDimensions.height) || 60);
  const [depth, setDepth] = useState<number | null>(() => {
    const value = content.depth ?? persistedDimensions.depth;
    return typeof value === "number" ? value : null;
  });
  const [constraints, setConstraints] = useState<string[]>(() => list(content.constraints).length ? list(content.constraints) : [""]);
  const initialDesign = content.design && typeof content.design === "object" && !Array.isArray(content.design)
    ? content.design as Record<string, unknown>
    : {};
  const [primitive, setPrimitive] = useState<"box" | "cylinder">(() => initialDesign.primitive === "cylinder" ? "cylinder" : "box");
  const [model, setModel] = useState<ValidatedCadModel | null>(null);
  const [modelMetadata, setModelMetadata] = useState(() =>
    restoreSpecialistCadEditorMetadata(content)
  );
  const [modelMessage, setModelMessage] = useState("");
  const [runtimeState, setRuntimeState] = useState<SpecialistActiveRuntimeState>(() =>
    specialistEditorRuntimeState(
      content,
      activeRuntimeState("loading", ["Three.js", "JSCAD"]),
    )
  );
  const sketch = useMemo(
    () => ({ units, width, height, depth, constraints }),
    [constraints, depth, height, units, width],
  );
  const issues = validateDimensionedSketch(sketch);
  const primitiveResult = useMemo(() => createCadPrimitive(primitive === "box"
    ? { primitive, width, height, depth: depth ?? Math.max(1, Math.min(width, height) / 2) }
    : { primitive, radius: width / 2, height: depth ?? height, segments: 32 }
  ), [depth, height, primitive, width]);
  const primitiveMesh: CadPrimitiveMesh | null = primitiveResult.ok ? primitiveResult.value : null;
  const modelFileName = model?.fileName ?? modelMetadata.fileName;
  const modelFormat = model?.extension ?? modelMetadata.format;
  const modelStats = useMemo(() => model
    ? {
        byteLength: model.byteLength,
        triangleCount: model.triangleCount,
        vertexCount: model.vertexCount,
      }
    : modelMetadata.modelStats, [model, modelMetadata.modelStats]);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "cad-workspace", type: "cad", capability: "cad_workspace", label: "CAD package", position: 320,
    content: mergeSpecialistEditorContent(content, {
      ...sketch,
      dimensions: { width, height, depth },
      design: primitiveMesh ? {
        primitive: primitiveMesh.primitive,
        dimensions: primitiveMesh.dimensions,
        volume: primitiveMesh.volume,
        polygonCount: primitiveMesh.polygonCount,
        triangleCount: primitiveMesh.triangleCount,
      } : null,
      model: { fileName: modelFileName, format: modelFormat },
      modelFileName,
      modelFormat,
      modelStats,
      runtimeState,
    }),
    plainText: `Dimensioned ${primitive}: ${width} x ${height}${depth ? ` x ${depth}` : ""} ${units}\nConstraints: ${constraints.filter(Boolean).join("; ")}${modelFileName ? `\nValidated preview: ${modelFileName}` : ""}`,
  }), [constraints, content, depth, height, modelFileName, modelFormat, modelStats, primitive, primitiveMesh, runtimeState, sketch, units, width]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const importModel = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_CAD_MODEL_BYTES) {
      setModelMessage("Keep CAD previews under 8 MB.");
      return;
    }
    setModelMessage("Checking the model structure and geometry...");
    try {
      const result = await validateCadModelFile(file);
      if (!result.ok) {
        setModel(null);
        setModelMessage(result.error);
        return;
      }
      setModel(result.value);
      setModelMetadata({
        fileName: result.value.fileName,
        format: result.value.extension,
        modelStats: {
          byteLength: result.value.byteLength,
          triangleCount: result.value.triangleCount,
          vertexCount: result.value.vertexCount,
        },
      });
      setRuntimeState(activeRuntimeState("loading", ["Three.js", `${result.value.extension.toUpperCase()} loader`]));
      setModelMessage(`${result.value.fileName} validated for this browser session.`);
    } catch {
      setModel(null);
      setModelMessage("This model could not be read. The bounded dimensioned design remains available.");
    }
  };
  return (
    <ToolFrame title="CAD workspace" description="Create a controlled box or cylinder and inspect a validated STL, OBJ, glTF, or GLB model. Arbitrary JSCAD scripts, STEP editing, assemblies, simulation, and full CAD operations are not enabled." status={status}>
      <label className="mb-3 block text-sm font-bold">Bounded shape
        <select value={primitive} onChange={(event) => { setPrimitive(event.target.value === "cylinder" ? "cylinder" : "box"); setModel(null); }} className="mt-1 block min-h-10 border border-slate-400 bg-white px-3"><option value="box">Box</option><option value="cylinder">Cylinder</option></select>
      </label>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="text-sm font-bold">{primitive === "cylinder" ? "Diameter" : "Width"}<input type="number" min="0" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2" /></label>
        <label className="text-sm font-bold">Height<input type="number" min="0" value={height} onChange={(event) => setHeight(Number(event.target.value))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2" /></label>
        <label className="text-sm font-bold">Depth, optional<input type="number" min="0" value={depth ?? ""} onChange={(event) => setDepth(event.target.value ? Number(event.target.value) : null)} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2" /></label>
        <label className="text-sm font-bold">Units<select value={units} onChange={(event) => setUnits(event.target.value as DimensionedSketch["units"])} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2"><option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option><option value="m">m</option></select></label>
      </div>
      <svg viewBox="0 0 600 280" className="mt-3 w-full border border-slate-300 bg-white" role="img" aria-label={`Rectangle ${width} by ${height} ${units}`}>
        <rect x="150" y="55" width="300" height="160" fill="#dbeafe" stroke="#0f172a" strokeWidth="3" />
        <line x1="150" y1="238" x2="450" y2="238" stroke="#db2777" strokeWidth="2" /><line x1="150" y1="228" x2="150" y2="248" stroke="#db2777" /><line x1="450" y1="228" x2="450" y2="248" stroke="#db2777" />
        <text x="300" y="263" textAnchor="middle" fontSize="18" fill="#0f172a">{width} {units}</text>
        <line x1="120" y1="55" x2="120" y2="215" stroke="#db2777" strokeWidth="2" /><line x1="110" y1="55" x2="130" y2="55" stroke="#db2777" /><line x1="110" y1="215" x2="130" y2="215" stroke="#db2777" />
        <text x="78" y="142" textAnchor="middle" fontSize="18" fill="#0f172a" transform="rotate(-90 78 142)">{height} {units}</text>
      </svg>
      <StringListEditor label="Design constraints" values={constraints} onChange={(index, value) => setConstraints((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} onAdd={() => setConstraints((current) => [...current, ""])} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 bg-slate-950 px-3 font-bold text-white"><Upload size={16} /> Inspect model<input type="file" accept=".stl,.obj,.gltf,.glb" onChange={(event) => { const input = event.currentTarget; void importModel(input.files?.[0]).finally(() => { input.value = ""; }); }} className="sr-only" /></label>
        {model ? <button type="button" onClick={() => { setModel(null); setModelMessage("Showing the bounded design."); }} className="min-h-10 border border-slate-400 bg-white px-3 font-bold">Show bounded design</button> : null}
        <span className="text-sm font-bold text-slate-700" aria-live="polite">{modelMessage}</span>
      </div>
      {model ? <CadModelViewer model={model} onRuntimeStateChange={setRuntimeState} /> : primitiveMesh ? <CadPrimitiveViewer mesh={primitiveMesh} onRuntimeStateChange={setRuntimeState} /> : null}
      {!primitiveResult.ok ? <p className="mb-0 mt-3 text-sm font-bold text-amber-900">{primitiveResult.error}</p> : null}
      {issues.length > 0 ? <p className="mb-0 mt-3 text-sm font-bold text-amber-900">{issues.join(" ")}</p> : null}
    </ToolFrame>
  );
}

function DataLabTool({ assignmentId, artifactType, initial }: ToolProps) {
  const persistedContent = initial?.content;
  const [rows, setRows] = useState<DataLabRow[]>(() => Array.isArray(initial?.content.rows) ? initial!.content.rows as DataLabRow[] : [{ id: id(), label: "", value: "", unit: "", uncertainty: "", observation: "" }]);
  const [dataset, setDataset] = useState(() => restoreImportedDataset(initial?.content.dataset));
  const [chartConfig, setChartConfig] = useState<DataChartConfig>(() => dataset
    ? normalizeDataChartConfig(initial?.content.chartConfig, dataset)
    : { type: "scatter", xColumn: 0, yColumn: 1 });
  const [runtimeState, setRuntimeState] = useState<SpecialistActiveRuntimeState>(() =>
    specialistEditorRuntimeState(
      persistedContent,
      activeRuntimeState(dataset ? "loading" : "idle", ["Papa Parse", "Apache ECharts"]),
    )
  );
  const [importMessage, setImportMessage] = useState("");
  const issues = validateDataLabRows(rows);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "data-lab", type: "data_table", capability: "data_lab", label: "Data lab", position: 330,
    content: mergeSpecialistEditorContent(persistedContent, {
      rows,
      dataset,
      chartConfig,
      runtimeState,
    }),
    plainText: rows.map((row) => `${row.label}: ${row.value} ${row.unit}${row.uncertainty ? ` +/- ${row.uncertainty}` : ""} ${row.observation}`.trim()).join("\n"),
  }), [chartConfig, dataset, persistedContent, rows, runtimeState]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const update = (rowId: string, patch: Partial<DataLabRow>) => setRows((current) => current.map((row) => row.id === rowId ? { ...row, ...patch } : row));
  const importData = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_DELIMITED_BYTES) {
      setImportMessage("Keep data imports under 1 MB for this beta workspace.");
      return;
    }
    setImportMessage("Checking the data file...");
    try {
      const result = parseDelimitedDataset(await file.text(), file.name);
      if (!result.ok) {
        setImportMessage(result.error);
        return;
      }
      setDataset(result.value);
      setRows(datasetToLabRows(result.value));
      setChartConfig(normalizeDataChartConfig({ type: "scatter", xColumn: 0, yColumn: 1 }, result.value));
      setRuntimeState(activeRuntimeState("loading", ["Papa Parse", "Apache ECharts"]));
      setImportMessage(`${result.value.rows.length} rows imported locally.`);
    } catch {
      setImportMessage("This data file could not be read. Typed lab rows remain available.");
    }
  };
  return (
    <ToolFrame title="Lab data" description="Record bounded measurements or import CSV or TSV data for a controlled local chart. Workbook macros, external links, and instrument control are not enabled." status={status}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 bg-slate-950 px-3 font-bold text-white"><Upload size={16} /> Import CSV or TSV<input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" className="sr-only" onChange={(event) => { const input = event.currentTarget; void importData(input.files?.[0]).finally(() => { input.value = ""; }); }} /></label>
        <span className="text-sm font-bold text-slate-700" aria-live="polite">{importMessage}</span>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-sm"><thead><tr>{["Measurement", "Value", "Unit", "Uncertainty", "Observation"].map((label) => <th key={label} className="border border-slate-300 bg-slate-100 p-2 text-left">{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td className="border border-slate-300 bg-white p-1"><input aria-label={`Row ${index + 1} measurement`} value={row.label} onChange={(event) => update(row.id, { label: event.target.value })} className="min-h-9 w-full px-2" /></td><td className="border border-slate-300 bg-white p-1"><input aria-label={`Row ${index + 1} value`} value={row.value} onChange={(event) => update(row.id, { value: event.target.value })} className="min-h-9 w-full px-2" /></td><td className="border border-slate-300 bg-white p-1"><input aria-label={`Row ${index + 1} unit`} value={row.unit} onChange={(event) => update(row.id, { unit: event.target.value })} className="min-h-9 w-full px-2" /></td><td className="border border-slate-300 bg-white p-1"><input aria-label={`Row ${index + 1} uncertainty`} value={row.uncertainty} onChange={(event) => update(row.id, { uncertainty: event.target.value })} className="min-h-9 w-full px-2" /></td><td className="border border-slate-300 bg-white p-1"><input aria-label={`Row ${index + 1} observation`} value={row.observation} onChange={(event) => update(row.id, { observation: event.target.value })} className="min-h-9 w-full px-2" /></td></tr>)}</tbody></table></div>
      <button type="button" disabled={rows.length >= MAX_DATA_ROWS} onClick={() => setRows((current) => current.length < MAX_DATA_ROWS ? [...current, { id: id(), label: "", value: "", unit: "", uncertainty: "", observation: "" }] : current)} className="mt-3 inline-flex min-h-10 items-center gap-2 bg-slate-950 px-3 font-bold text-white disabled:opacity-50"><Plus size={16} /> Add row</button>
      {dataset ? <section className="mt-4 border-t border-slate-300 pt-4" aria-label="Lab data chart"><div className="grid gap-2 sm:grid-cols-3"><label className="text-sm font-bold">Chart type<select value={chartConfig.type} onChange={(event) => setChartConfig((current) => ({ ...current, type: event.target.value === "bar" || event.target.value === "line" ? event.target.value : "scatter" }))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2"><option value="scatter">Scatter</option><option value="line">Line</option><option value="bar">Bar</option></select></label><label className="text-sm font-bold">Category column<select value={chartConfig.xColumn} onChange={(event) => setChartConfig((current) => ({ ...current, xColumn: Number(event.target.value) }))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2">{dataset.columns.map((column, index) => <option key={`${column}-${index}`} value={index}>{column}</option>)}</select></label><label className="text-sm font-bold">Numeric column<select value={chartConfig.yColumn} onChange={(event) => setChartConfig((current) => ({ ...current, yColumn: Number(event.target.value) }))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2">{dataset.columns.map((column, index) => <option key={`${column}-${index}`} value={index}>{column}</option>)}</select></label></div><SpecialistDataChart dataset={dataset} config={chartConfig} onRuntimeStateChange={setRuntimeState} /></section> : null}
      {issues.length > 0 ? <p className="mb-0 mt-3 text-sm font-bold text-amber-900">{issues.join(" ")}</p> : null}
    </ToolFrame>
  );
}

function PerformanceLogTool({ assignmentId, artifactType, initial, subjectDomain }: ToolProps & { subjectDomain: AssignmentWorkProfile["subjectDomain"] }) {
  const persistedContent = initial?.content;
  const [entries, setEntries] = useState<PerformanceLogEntry[]>(() => Array.isArray(initial?.content.entries) ? initial!.content.entries as PerformanceLogEntry[] : []);
  const [draft, setDraft] = useState<PerformanceLogEntry>({ id: id(), occurredOn: new Date().toISOString().slice(0, 10), focus: "", durationMinutes: null, evidence: "", reflection: "", verifiedByTeacher: false });
  const subject = subjectDomain === "physical_education" ? "pe" : subjectDomain === "health" ? "health" : "performance";
  const issues = validatePerformanceEntry(draft, subject);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "performance-log", type: "performance_log", capability: "performance_log", label: "Performance log", position: 340,
    content: mergeSpecialistEditorContent(persistedContent, { entries }),
    plainText: entries.map((entry) => `${entry.occurredOn} | ${entry.focus}${entry.durationMinutes ? ` | ${entry.durationMinutes} minutes` : ""}\nEvidence: ${entry.evidence}\nReflection: ${entry.reflection}`).join("\n\n"),
  }), [entries, persistedContent]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const addEntry = () => {
    if (issues.length > 0) return;
    setEntries((current) => [...current, draft]);
    setDraft({ id: id(), occurredOn: new Date().toISOString().slice(0, 10), focus: "", durationMinutes: null, evidence: "", reflection: "", verifiedByTeacher: false });
  };
  return (
    <ToolFrame title={subject === "performance" ? "Practice and performance log" : subject === "pe" ? "PE skill log" : "Health learning log"} description="Track skills, knowledge, evidence, and reflection. Teacher verification remains separate from student notes." status={status}>
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_10rem]"><label className="text-sm font-bold">Date<input type="date" value={draft.occurredOn} onChange={(event) => setDraft((current) => ({ ...current, occurredOn: event.target.value }))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2" /></label><label className="text-sm font-bold">Skill, knowledge, or recovery focus<input value={draft.focus} onChange={(event) => setDraft((current) => ({ ...current, focus: event.target.value }))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2" /></label><label className="text-sm font-bold">Minutes, optional<input type="number" min="1" value={draft.durationMinutes ?? ""} onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: event.target.value ? Number(event.target.value) : null }))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2" /></label></div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-sm font-bold">Evidence<textarea rows={3} value={draft.evidence} onChange={(event) => setDraft((current) => ({ ...current, evidence: event.target.value }))} className="mt-1 w-full border border-slate-400 bg-white p-2 font-normal" /></label><label className="text-sm font-bold">Reflection<textarea rows={3} value={draft.reflection} onChange={(event) => setDraft((current) => ({ ...current, reflection: event.target.value }))} className="mt-1 w-full border border-slate-400 bg-white p-2 font-normal" /></label></div>
      <button type="button" onClick={addEntry} disabled={issues.length > 0} className="mt-3 inline-flex min-h-10 items-center gap-2 bg-slate-950 px-3 font-bold text-white disabled:opacity-50"><Plus size={16} /> Add log entry</button>
      {issues.length > 0 ? <p className="mb-0 mt-2 text-sm font-bold text-amber-900">{issues.join(" ")}</p> : null}
      <div className="mt-4 grid gap-2">{entries.map((entry) => <article key={entry.id} className="border border-slate-300 bg-white p-3"><div className="flex flex-wrap justify-between gap-2"><strong>{entry.focus}</strong><span className="text-sm text-slate-600">{entry.occurredOn}{entry.durationMinutes ? ` | ${entry.durationMinutes} min` : ""}</span></div>{entry.evidence ? <p className="mb-0 mt-2 text-sm"><strong>Evidence:</strong> {entry.evidence}</p> : null}{entry.reflection ? <p className="mb-0 mt-1 text-sm"><strong>Reflection:</strong> {entry.reflection}</p> : null}<p className="mb-0 mt-2 text-xs font-bold uppercase text-slate-500">{entry.verifiedByTeacher ? "Teacher verified" : "Student record"}</p></article>)}</div>
    </ToolFrame>
  );
}
