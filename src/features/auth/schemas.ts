import { z } from 'zod';

// Limits copy the gateway's RegisterDto. The password minimum is 12, which is
// what user-service enforces (the gateway still says 8, GAP-6).
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;
const NAME_MAX = 100;

const email = z.email('Enter a valid email address').max(254);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(NAME_MAX),
  lastName: z.string().trim().min(1, 'Enter your last name').max(NAME_MAX),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters`),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
