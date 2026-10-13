import { z } from "zod";

export const cardConditionSchema = z.enum(["MINT", "NEAR_MINT", "EXCELLENT", "GOOD", "PLAYED", "POOR"]);

export const createCardSchema = z.object({
  name: z.string().min(1, "name is required"),
  setName: z.string().min(1, "setName is required"),
  cardNumber: z.string().optional(),
  rarity: z.string().optional(),
  condition: cardConditionSchema.optional(),
  quantity: z.coerce.number().int().positive().optional(),
  notes: z.string().optional(),
  identifyCandidates: z.string().optional(),
});

export const updateCardSchema = createCardSchema.partial();