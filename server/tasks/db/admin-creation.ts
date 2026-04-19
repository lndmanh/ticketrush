import { eq } from 'drizzle-orm'

export default defineTask({
  meta: {
    name: 'db:admin-creation',
    description: 'Seed the database with initial admin account',
  },
  async run() {
    console.log('🌱 Starting database seeding...')
    console.log('')

    const db = useDB()

    // Check if admin account exists
    const adminUsername = 'admin'
    const existingAdmin = await db
      .select()
      .from(tables.users)
      .where(eq(tables.users.username, adminUsername))
      .get()

    if (existingAdmin) {
      console.log('✅ Admin account already exists')
      console.log('━'.repeat(50))
      console.log('Username:', existingAdmin.username)
      console.log('Name:', existingAdmin.name)
      console.log('Is Admin:', existingAdmin.isAdmin)
      console.log('━'.repeat(50))
      return { result: 'Admin account already exists' }
    }

    // Create admin account
    const adminPassword = useRuntimeConfig().defaultAdminPassword!.toString()
    const hashedPassword = await hashPassword(adminPassword)
    const now = new Date()

    const [newAdmin] = await db
      .insert(tables.users)
      .values({
        username: adminUsername,
        name: 'Administrator',
        email: 'admin@nnsvn.me',
        password: hashedPassword,
        isAdmin: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      })
      .returning()

    if (!newAdmin) throw new Error('Failed to create admin account')

    console.log('✅ Admin account created successfully')
    console.log('━'.repeat(50))
    console.log('Username:', adminUsername)
    console.log('Password:', adminPassword)
    console.log('━'.repeat(50))
    console.log('⚠️  IMPORTANT: Please change the admin password after first login!')
    console.log('━'.repeat(50))
    console.log('')
    console.log('✅ Database seeding completed')

    return {
      result: 'Admin account created successfully',
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        name: newAdmin.name,
        isAdmin: newAdmin.isAdmin,
      },
    }
  },
})
