export abstract class IDatabaseService<T> {
  /**
   * Get a single item by ID
   * @param id The ID of the item to retrieve
   */
  abstract getById(id: number | string): Promise<T | undefined>
  /**
   * Get a list of items
   */
  abstract getList(): Promise<T[]>
  /**
   * Create a new item
   * @param data The data to create the item with
   */
  abstract create(data: Partial<T>): Promise<T>
  /**
   * Update an existing item
   * @param data The data to update the item with
   */
  abstract update(data: Partial<T>): Promise<T>
  /**
   * Delete an item
   * @param id The ID of the item to delete
   */
  abstract delete(id: number | string): Promise<void>
  /**
   * Delete multiple items
   * @param ids The IDs of the items to delete
   */
  abstract bulkDelete(ids: number[] | string[]): Promise<void>
}
