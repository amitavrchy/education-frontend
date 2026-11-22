import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "নাম দিন"),
  email: z.email("সঠিক ইমেইল দিন"),
  message: z.string().trim().min(10, "বার্তা কমপক্ষে ১০ অক্ষরের হতে হবে"),
});

export type ContactInput = z.infer<typeof contactSchema>;
