import { eq, or } from 'drizzle-orm'
import type { SeedAdminTaskData } from '~~/types/admin-tasks'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const db = useDB()

  const adminUsername = 'admin'
  const adminEmail = 'admin@nnsvn.me'
  const existingAdmin = await db
    .select()
    .from(tables.users)
    .where(or(
      eq(tables.users.username, adminUsername),
      eq(tables.users.email, adminEmail),
    ))
    .get()

  if (existingAdmin) {
    const admin = existingAdmin.isAdmin && existingAdmin.emailVerified
      ? existingAdmin
      : await db
          .update(tables.users)
          .set({
            isAdmin: true,
            emailVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(tables.users.id, existingAdmin.id))
          .returning()
          .get()

    if (!admin) {
      throw apiError({ status: 500, statusText: 'Internal Server Error', code: 'ERROR', message: 'Failed to update admin account' })
    }

    const response: SeedAdminTaskData = {
      result: existingAdmin.isAdmin ? 'Admin account already exists' : 'Existing account promoted to admin',
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        isAdmin: admin.isAdmin,
      },
    }

    return success(response)
  }

  const defaultAdminPassword = useRuntimeConfig().defaultAdminPassword
  if (!defaultAdminPassword) {
    throw apiError({ status: 500, statusText: 'Internal Server Error', code: 'ERROR', message: 'Default admin password is not configured' })
  }

  const adminPassword = defaultAdminPassword.toString()
  const hashedPassword = await hashPassword(adminPassword)
  const now = new Date()

  const [newAdmin] = await db
    .insert(tables.users)
    .values({
      username: adminUsername,
      name: 'Administrator',
      email: adminEmail,
      password: hashedPassword,
      emailVerified: true,
      isAdmin: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    })
    .returning()

  if (!newAdmin) {
    throw apiError({ status: 500, statusText: 'Internal Server Error', code: 'ERROR', message: 'Failed to create admin account' })
  }

  const response: SeedAdminTaskData = {
    result: 'Admin account created successfully',
    admin: {
      id: newAdmin.id,
      username: newAdmin.username,
      name: newAdmin.name,
      isAdmin: newAdmin.isAdmin,
    },
  }

  return success(response)
})
