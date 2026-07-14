import { z } from "zod";

export const statsYearQuerySchema = z.object({
  year: z.union([
    z.literal("all"),
    z.coerce.number().int().min(2000, "不正な年です").max(2100, "不正な年です"),
  ]),
});

export type StatsYearQuery = z.infer<typeof statsYearQuerySchema>;
