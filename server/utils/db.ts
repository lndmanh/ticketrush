import { db, schema } from 'hub:db'

export const tables = schema

export function useDB() {
  return db
}
