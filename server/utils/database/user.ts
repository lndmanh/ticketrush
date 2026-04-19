import { eq, inArray } from 'drizzle-orm'
import type { User } from '#shared/db'
import { IDatabaseService } from '~~/types/db/database-service'
import type { CreateUserInput, UserUpdateInput } from '#shared/schemas/userSchema'

class UserService extends IDatabaseService<User> {
  private static instance: UserService

  private get db() {
    return useDB()
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  /**
   * Get a user by their ID (with caching)
   */
  async getById(id: number): Promise<User | undefined> {
    const user = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.id, id))
      .get()

    return user
  }

  /**
   * Get a user by their username
   */
  async getByUsername(username: string): Promise<User | undefined> {
    const user = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.username, username))
      .get()

    return user
  }

  /**
   * Get a user by their email
   */
  async getByEmail(email: string): Promise<User | undefined> {
    const user = await this.db
      .select()
      .from(tables.users)
      .where(eq(tables.users.email, email))
      .get()

    return user
  }

  /**
   * Get all users
   */
  async getList(): Promise<User[]> {
    const users = await this.db
      .select()
      .from(tables.users)
      .all()

    return users
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserInput) {
    const newUser = await this.db
      .insert(tables.users)
      .values(data)
      .returning()
      .get()

    return newUser
  }

  /**
   * Update a user by their ID
   */
  async update(data: UserUpdateInput) {
    const updatedUser = await this.db
      .update(tables.users)
      .set(data)
      .where(eq(tables.users.id, data.id))
      .returning()
      .get()

    return updatedUser
  }

  /**
   * Delete a user by their ID
   */
  async delete(id: number): Promise<void> {
    await this.db
      .delete(tables.users)
      .where(eq(tables.users.id, id))
  }

  /**
   * Delete multiple users by their IDs
   */
  async bulkDelete(ids: number[]): Promise<void> {
    if (ids.length === 0) return

    await this.db
      .delete(tables.users)
      .where(inArray(tables.users.id, ids))
      .execute()
  }
}

export default UserService.getInstance()
