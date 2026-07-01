import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core'

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
  owner_id: text('owner_id').notNull().references(() => users.id),
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
  source_type: text('source_type').default('personal'), // 'personal' | 'group' | 'owe'
  source_expense_id: text('source_expense_id').$type<string | null>(),
  created_at: text('created_at').notNull(),
})

export const expense_splits = sqliteTable('expense_splits', {
  id: text('id').primaryKey(),
  expense_id: text('expense_id').notNull().references(() => expenses.id),
  user_id: text('user_id').notNull().references(() => users.id),
  amount: real('amount').notNull(),
  status: text('status').default('pending'), // 'pending' | 'accepted' | 'rejected'
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at'),
})

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // 'split_bill' | 'settlement' | 'group_invite'
  title: text('title').notNull(),
  message: text('message').notNull(),
  related_expense_id: text('related_expense_id').references(() => expenses.id),
  related_invitation_id: text('related_invitation_id').$type<string | null>(),
  read: integer('read').default(0),
  created_at: text('created_at').notNull(),
})

export const group_invitations = sqliteTable('group_invitations', {
  id: text('id').primaryKey(),
  group_id: text('group_id').notNull().references(() => groups.id),
  inviter_id: text('inviter_id').notNull().references(() => users.id),
  invitee_id: text('invitee_id').notNull().references(() => users.id),
  status: text('status').default('pending'), // 'pending' | 'accepted' | 'rejected'
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at'),
})

export const lark_bindings = sqliteTable('lark_bindings', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id),
  lark_open_id: text('lark_open_id').notNull(),
  lark_union_id: text('lark_union_id'),
  lark_email: text('lark_email'),
  created_at: text('created_at').notNull(),
})
