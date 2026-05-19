export interface Expense {
  id: string;
  date: string;
  amount: number;
  note: string;
  user_id: string | null;
  created_at: string;
  group_id?: string | null;
  payer_id?: string | null;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  nickname: string | null;
  created_at: string;
  // Joined fields
  user_email?: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  avatar_url: string | null;
  nickname: string | null;
  created_at: string;
}