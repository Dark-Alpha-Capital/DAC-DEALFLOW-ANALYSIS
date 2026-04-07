import { z } from "zod";

/** Comma-formatted numeric strings; empty → valid. */
export const optionalFormattedNumberString = z
  .string()
  .optional()
  .refine(
    (v) => {
      if (v === undefined || v === "") return true;
      const s = String(v).replace(/,/g, "").trim();
      if (s === "") return true;
      return Number.isFinite(Number(s));
    },
    { message: "Invalid number" },
  );

export const QuickAddDealFormSchema = z.object({
  dealTeaser: z.string().min(1, "Deal title is required"),
  themeId: z.string().optional(),
  sourceWebsite: z.string().optional(),
  brokerage: z.string().optional(),
  revenue: optionalFormattedNumberString,
  ebitda: optionalFormattedNumberString,
  ebitdaMargin: optionalFormattedNumberString,
  askingPrice: optionalFormattedNumberString,
  description: z.string().optional(),
  brokerFirstName: z.string().optional(),
  brokerLastName: z.string().optional(),
  brokerEmail: z
    .union([z.literal(""), z.string().email("Invalid email")])
    .optional(),
  brokerPhone: z.string().optional(),
  brokerLinkedIn: z.string().optional(),
});

export type QuickAddDealFormValues = z.infer<typeof QuickAddDealFormSchema>;
