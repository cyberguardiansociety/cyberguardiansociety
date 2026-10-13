import { z } from 'zod'

export const loginValidator = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(320)
    .refine(
      (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /^[a-z0-9._-]{3,64}$/.test(value),
      { message: 'Enter a valid email address or username.' },
    ),
  password: z
    .string()
    .min(1)
    .max(1024),
}).strict()

export type LoginInput = z.infer<typeof loginValidator>
