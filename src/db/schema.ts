import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  nickname: text('nickname'),
  created_at: text('created_at').notNull(),
})

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  avatar_url: text('avatar_url'),
  nickname: text('nickname'),
  created_at: text('created_at').notNull(),
})

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  created_by: text('created_by').notNull().references(() => users.id),
  created_at: text('created_at').notNull(),
})

export const group_members = sqliteTable('group_members', {
  id: text('id').primaryKey(),
  group_id: text('group_id').notNull().references(() => groups.id),
  user_id: text('user_id').notNull().references(() => users.id),
  nickname: text('nickname'),
  created_at: text('created_at').notNull(),
})

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  amount: real('amount').notNull(),
  note: text('note'),
  user_id: text('user_id').references(() => users.id),
  group_id: text('group_id').references(() => groups.id),
  payer_id: text('payer_id').references(() => users.id),
  created_at: text('created_at').notNull(),
})

export const expense_splits = sqliteTable('expense_splits', {
  id: text('id').primaryKey(),
  expense_id: text('expense_id').notNull().references(() => expenses.id),
  user_id: text('user_id').notNull().references(() => users.id),
  amount: real('amount').notNull(),
  created_at: text('created_at').notNull(),
})
