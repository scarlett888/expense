import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'path'
import * as schema from '@/db/schema'

function createSqliteDb() {
  const dbPath = join(process.cwd(), 'data', 'expense-book.db')
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

export const db = createSqliteDb()
export { schema }

export async function getDb() {
  if (process.env.DB_TYPE === 'mysql') {
    const { drizzle: drizzleMysql } = await import('drizzle-orm/mysql2')
    const mysql = await import('mysql2/promise')
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'expense_book',
    })
    return drizzleMysql(pool, { schema, mode: 'default' })
  }
  return db
}