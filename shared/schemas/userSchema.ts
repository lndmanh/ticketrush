import { z } from 'zod'
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod'
import { users } from '~~/server/db/schema.sqlite'

/**
 * Enhanced password complexity validation
 * Requires: min 8 chars, lowercase, uppercase, number, and special character
 */
export const passwordComplexitySchema = z.string()
  .min(8, 'validation.password_min')
  .regex(/[a-z]/, 'validation.password_lowercase')
  .regex(/[A-Z]/, 'validation.password_uppercase')
  .regex(/[0-9]/, 'validation.password_number')
  .regex(/[^a-zA-Z0-9]/, 'validation.password_special')

/**
 * Username validation schema
 */
export const usernameSchema = z.string()
  .min(3, 'validation.username_min')
  .max(50, 'validation.username_max')
  .regex(/^[a-z0-9_-]+$/, 'validation.username_format')

/**
 * Email validation schema
 */
export const emailSchema = z.email({ error: 'validation.email_required' })

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
  'name': z.string().min(1, 'validation.name_required'),
  'password': passwordComplexitySchema,
  'confirm-password': z.string().min(1, 'validation.password_confirm_required'),
  'cf-turnstile-response': z.string().min(1, 'validation.token_required'),
  'redirect-to': z.string().optional(),
}).refine(data => data['confirm-password'] === data.password, {
  error: 'validation.passwords_mismatch',
  path: ['confirm-password'],
})

/**
 * Base user creation schema derived from database.
 */
export const createUserSchema = createInsertSchema(users, {
  username: usernameSchema,
  email: emailSchema,
  name: z.string().min(1, 'validation.name_required'),
  password: z.string().min(1, 'validation.password_hash_required'),
  emailVerified: z.boolean().default(false),
  lastLoginAt: z.date().optional(),
  isAdmin: z.boolean().default(false),
})

/**
 * Schema for updating a user (all fields optional except id).
 */
export const userUpdateSchema = createUpdateSchema(users, {
  id: z.coerce.number().int().positive('validation.user_id_required'),
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  name: z.string().min(1, 'validation.name_required').optional(),
  password: z.string().min(1, 'validation.password_required').optional(),
  emailVerified: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isLocked: z.boolean().optional(),
})

/**
 * Schema for the dedicated lock/unlock endpoint.
 */
export const adminUserLockSchema = z.object({
  isLocked: z.boolean(),
})
export type AdminUserLockInput = z.infer<typeof adminUserLockSchema>

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
  currentPassword: z.string().min(1, 'validation.current_password_required'),
  newPassword: passwordComplexitySchema,
  confirmPassword: z.string().min(1, 'validation.new_password_confirm_required'),
}).refine(data => data.newPassword === data.confirmPassword, {
  error: 'validation.passwords_mismatch',
  path: ['confirmPassword'],
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'validation.name_required'),
  email: emailSchema,
})

export const loginSchema = z.object({
  'username': z.string().min(1, 'validation.username_required'),
  'password': z.string().min(1, 'validation.password_required'),
  'cf-turnstile-response': z.string(),
  'redirect-to': z.string().optional(),
})

export type RegisterUserInput = z.infer<typeof registerUserSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type AdminUserCreateFormInput = z.infer<typeof adminUserCreateFormSchema>
export type AdminUserEditFormInput = z.infer<typeof adminUserEditFormSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type UserSelect = z.infer<typeof userSelectSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
