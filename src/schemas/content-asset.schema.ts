import { z } from "zod";

export const ContentAssetSchema = z.object({
  type: z.enum(["title", "outline", "blog_draft", "cta", "seo_notes", "hook_set", "caption_set"]),
  value: z.string().min(1),
});

export type ContentAsset = z.infer<typeof ContentAssetSchema>;
