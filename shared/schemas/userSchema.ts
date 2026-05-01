import { z } from 'zod'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { users } from '~~/server/db/schema.sqlite'

/**
 * Enhanced password complexity validation
 * Requires: min 8 chars, lowercase, uppercase, number, and special character
 */
export const passwordComplexitySchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

/**
 * Username validation schema
 */
export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username too long')
  .regex(/^[a-z0-9_-]+$/, 'Username can only contain lowercase letters, numbers, hyphens, and underscores')

/**
 * Email validation schema
 */
export const emailSchema = z.email({ error: 'Valid email is required' })

/**
 * Schema for user registration (frontend form).
 * Includes Turnstile token validation.
 *
 * @example
 * ```ts
 * // In API routes:
 * import { registerUserSchema, passwordComplexitySchema } from '#shared/schemas/userSchema'
 *
 * const result = registerUserSchema.safeParse(formData)
 * if (!result.success) {
 *   console.error(result.error.issues)
 * }
 * ```
 */
export const registerUserSchema = z.object({
  'username': usernameSchema,
  'email': emailSchema,
  'name': z.string().min(1, 'Name is required'),
  'password': passwordComplexitySchema,
  'confirm-password': z.string().min(1, 'Please confirm your password'),
  'cf-turnstile-response': z.string().min(1, 'Validation token is required'),
  'redirect-to': z.string().optional(),
}).refine(data => data['confirm-password'] === data.password, {
  error: 'Passwords do not match',
  path: ['confirm-password'],
})

/**
 * Base user creation schema derived from database.
 */
export const createUserSchema = createInsertSchema(users, {
  username: usernameSchema,
  email: emailSchema,
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(1, 'Password hash is required'),
  lastLoginAt: z.date().optional(),
  isAdmin: z.boolean().default(false),
})

/**
 * Schema for updating a user (all fields optional except id).
 */
export const userUpdateSchema = createUpdateSchema(users, {
  id: z.coerce.number().int().positive('User ID is required'),
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  isAdmin: z.boolean().optional(),
})

export const adminUserCreateFormSchema = createUserSchema.pick({
  username: true,
  email: true,
  name: true,
  password: true,
  isAdmin: true,
})

export const adminUserEditFormSchema = userUpdateSchema.pick({
  id: true,
  username: true,
  email: true,
  name: true,
  password: true,
  isAdmin: true,
}).extend({
  password: z.string().optional().default(''),
})

/**
 * Select schema for type inference from database queries.
 */
export const userSelectSchema = createSelectSchema(users)

/**
 * Schema for changing password (shared between frontend form and API route).
 * Validates current password, new password complexity, and confirmation match.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordComplexitySchema,
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  error: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const loginSchema = z.object({
  'username': z.string().min(1, 'Username is required'),
  'password': z.string().min(1, 'Password is required'),
  'cf-turnstile-response': z.string(),
  'redirect-to': z.string().optional(),
})

export type RegisterUserInput = z.infer<typeof registerUserSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type AdminUserCreateFormInput = z.infer<typeof adminUserCreateFormSchema>
export type AdminUserEditFormInput = z.infer<typeof adminUserEditFormSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type UserSelect = z.infer<typeof userSelectSchema>
