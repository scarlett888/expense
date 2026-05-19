import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Group operations
export async function createGroup(name: string, userId: string) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, created_by: userId })
    .select()
    .single();
  return { data, error };
}

export async function getUserGroups(userId: string) {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      group_members (
        id,
        user_id,
        nickname,
        user:users!user_id (email)
      )
    `)
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function addGroupMember(groupId: string, userId: string, nickname?: string) {
  const { data, error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, nickname })
    .select()
    .single();
  return { data, error };
}

export async function removeGroupMember(memberId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('id', memberId);
  return { error };
}

export async function getGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      user:users!user_id (id, email)
    `)
    .eq('group_id', groupId);
  return { data, error };
}

// Create expense with splits
export async function createGroupExpense(
  expense: {
    date: string;
    amount: number;
    note: string;
    user_id: string;
    group_id: string;
    payer_id: string;
  },
  memberIds: string[]
) {
  // Calculate split amount
  const splitAmount = Number((expense.amount / memberIds.length).toFixed(2));

  // Insert expense
  const { data: expenseData, error: expenseError } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();

  if (expenseError) return { data: null, error: expenseError };

  // Create splits for each member
  const splits = memberIds.map(userId => ({
    expense_id: expenseData.id,
    user_id: userId,
    amount: splitAmount,
  }));

  const { error: splitsError } = await supabase
    .from('expense_splits')
    .insert(splits);

  if (splitsError) return { data: null, error: splitsError };

  return { data: expenseData, error: null };
}

// Get user's expenses with splits
export async function getUserExpensesWithSplits(userId: string) {
  const { data, error } = await supabase
    .from('expense_splits')
    .select(`
      *,
      expense:expenses (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
}

// Find user by email for inviting
export async function findUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single();
  return { data, error };
}

// Profile operations
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

export async function updateProfile(userId: string, updates: { avatar_url?: string; nickname?: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...updates });
  return { data, error };
}