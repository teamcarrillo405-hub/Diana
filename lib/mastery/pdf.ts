export type MasteryPdfConcept = {
  name: string;
  masteryLevel: number;
  selfConfidence: number | null;
};

export type MasteryPdfAssignment = {
  title: string;
  status: string;
};

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildMasteryReportPdf({
  className,
  concepts,
  assignments,
}: {
  className: string;
  concepts: MasteryPdfConcept[];
  assignments: MasteryPdfAssignment[];
}): Uint8Array {
  const lines = [
    `Diana mastery report: ${className}`,
    "",
    "Concept confidence",
    ...concepts.map((concept) => {
      const self = concept.selfConfidence === null ? "not set" : concept.selfConfidence.toFixed(0);
      return `- ${concept.name}: mastery ${concept.masteryLevel.toFixed(0)}/4, confidence ${self}/4`;
    }),
    "",
    "Assignment completion",
    ...assignments.map((assignment) => `- ${assignment.title}: ${assignment.status}`),
  ].slice(0, 36);

  const textOps = lines.map((line, index) => {
    const y = 760 - index * 18;
    return `BT /F1 11 Tf 54 ${y} Td (${escapePdfText(line)}) Tj ET`;
  }).join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    `5 0 obj << /Length ${textOps.length} >> stream\n${textOps}\nendstream endobj\n`,
  ];

  let offset = "%PDF-1.4\n".length;
  const xref = ["0000000000 65535 f \n"];
  for (const obj of objects) {
    xref.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
    offset += obj.length;
  }
  const body = objects.join("");
  const xrefStart = "%PDF-1.4\n".length + body.length;
  const pdf = [
    "%PDF-1.4\n",
    body,
    `xref\n0 ${objects.length + 1}\n`,
    ...xref,
    `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  ].join("");

  return new TextEncoder().encode(pdf);
}
