/** Exact primary Edge Responses request serialization. No environment or network access. */
export type StudentModelPart =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: string; data: string }
  | { type: "file"; mediaType: string; data: string; filename: string };

const OPENAI_REASONING_EFFORT: Record<"fast" | "quality" | "complex", "low" | "medium" | "high"> = {
  fast: "low",
  quality: "medium",
  complex: "high",
};

function toOpenAiResponseParts(parts: StudentModelPart[]) {
  return parts.map((part) => part.type === "text"
    ? { type: "input_text", text: part.text }
    : part.type === "file"
    ? {
      type: "input_file",
      file_data: `data:${part.mediaType};base64,${part.data}`,
      filename: part.filename,
    }
    : {
      type: "input_image",
      image_url: `data:${part.mediaType};base64,${part.data}`,
      detail: "high",
    });
}

export function buildStudentResponseRequest({ model: openAiModel, system, user, maxTokens, quality, json, parts }: { model: string; system: string; user: string; maxTokens: number; quality: "fast" | "quality" | "complex"; json: boolean; parts?: StudentModelPart[] }) {
  return {
        model: openAiModel,
        instructions: system,
        input: [
          {
            role: "user",
            content: [
              ...(parts ? toOpenAiResponseParts(parts) : [{ type: "input_text", text: user }]),
              ...(json ? [{ type: "input_text", text: "Return a valid JSON object matching the requested structure." }] : []),
            ],
          },
        ],
        max_output_tokens: maxTokens,
        reasoning: { effort: OPENAI_REASONING_EFFORT[quality] },
        ...(json ? { text: { format: { type: "json_object" } } } : {}),
        store: false,
      };
}
