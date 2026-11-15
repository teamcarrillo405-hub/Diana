import { z } from "zod";

/** Browser-safe navigation contract. No authored answers or worked examples. */
export const coursePathSchema = z.object({
  activityId: z.string(), position: z.number().int().positive(), total: z.number().int().positive(),
  nextId: z.string().nullable(), transferId: z.string().nullable(), returnId: z.string().nullable(),
  foundations: z.array(z.object({ skillId: z.string(), title: z.string(), activityId: z.string().nullable() }).strict()),
}).strict();
export type CoursePath = z.infer<typeof coursePathSchema>;
