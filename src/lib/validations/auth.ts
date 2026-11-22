import { z } from "zod";
import { USER_ROLES } from "@/types";

/** Bangladeshi mobile number: 01XXXXXXXXX, optionally prefixed with +88. */
export const bdPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)");

export const passwordSchema = z
  .string()
  .min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে")
  .max(72, "পাসওয়ার্ড অনেক বড়");

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "ইমেইল বা মোবাইল নম্বর দিন"),
  password: z.string().min(1, "পাসওয়ার্ড দিন"),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে"),
    email: z.email("সঠিক ইমেইল দিন"),
    phone: bdPhoneSchema,
    role: z.enum(USER_ROLES),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "পাসওয়ার্ড মিলছে না",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email("সঠিক ইমেইল দিন"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
