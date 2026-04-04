import * as z from "zod";

export const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  image: z
    .instanceof(FileList)
    .refine((files) => files.length === 0 || files.length === 1, {
      message: "Please upload a single file.",
    })
    .optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
