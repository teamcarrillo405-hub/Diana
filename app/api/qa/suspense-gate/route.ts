import {
  releaseScreenDesignSuspenseGate,
  resetScreenDesignSuspenseGate,
} from "@/lib/qa/screendesign-suspense-gate";

const GATE_ID = "smart-loading";

const unavailable = () => Response.json({ available: false }, { status: 404 });

export async function POST() {
  if (process.env.QA_CREATE_USER !== "true") return unavailable();
  releaseScreenDesignSuspenseGate(GATE_ID);
  return Response.json({ released: true });
}

export async function DELETE() {
  if (process.env.QA_CREATE_USER !== "true") return unavailable();
  resetScreenDesignSuspenseGate(GATE_ID);
  return Response.json({ reset: true });
}
