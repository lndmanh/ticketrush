import { eq } from 'drizzle-orm'
import type { SeedAdminTaskData } from '~~/types/admin-tasks'
import { apiError, success } from '~~/server/utils/apiResponse'

export default defineEventHandler(async () => {
  const db = useDB()

  const adminUsername = 'admin'
  const existingAdmin = await db
    .select()
    .from(tables.users)
    .where(eq(tables.users.username, adminUsername))
    .get()

  if (existingAdmin) {
    if (existingAdmin.isAdmin && !existingAdmin.emailVerified) {
      const response: SeedAdminTaskData = {
        result: 'Admin account already exists',
        admin: {
          id: existingAdmin.id,
          username: existingAdmin.username,
          name: existingAdmin.name,
          isAdmin: existingAdmin.isAdmin,
        },
      }
      return success(response)
    }
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
      email: 'admin@nnsvn.me',
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
