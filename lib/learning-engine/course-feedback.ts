import { z } from "zod";
import {evidenceAnchorSchema} from "./contracts";
export const courseFeedbackSchema = z.object({
    title: z.string(), guidance: z.string(), steps: z.array(z.string()), nextQuestion: z.string(), limitations: z.array(z.string()),
    status: z.enum(["checked", "review", "unsupported", "needs_confirmation", "help", "saved"]),
    outcome: z.enum(["matches", "revise", "unverified"]), checkMode: z.string(),
    assistance: z.enum(["unchanged", "hinted", "example_assisted"]), providerCalled: z.literal(false), eligibleForKnowledge: z.literal(false),
    quotes: z.array(z.object({ quote: z.string(), status: z.enum(["exact", "ambiguous", "not_found"]), sourceId: z.string().nullable(), sourceHash: z.string().nullable(), startOffset: z.number().int().nullable(), endOffset: z.number().int().nullable(),anchor:evidenceAnchorSchema.nullable().optional() })),
});
export type CourseFeedback = z.infer<typeof courseFeedbackSchema>;
