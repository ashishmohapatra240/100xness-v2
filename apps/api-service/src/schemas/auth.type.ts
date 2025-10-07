import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const RegisterSchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z.string().min(8),
});
