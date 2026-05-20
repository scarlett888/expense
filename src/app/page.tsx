'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import Calendar from './components/Calendar';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import AvatarPicker from './components/AvatarPicker';
import { Expense, Profile, Group } from '@/types/expense';
import AuthForm from './components/AuthForm';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<Expense[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchExpenses();
      } else {
        setExpenses([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProfile(profileData);

      // Fetch user's groups
      const { data: memberGroups } = await supabase
        .from('group_members')
        .select('group_id, group:groups!group_id(id, name)')
        .eq('user_id', user.id);

      if (memberGroups) {
        const groups = memberGroups.map((mg: any) => mg.group).filter(Boolean);
        setUserGroups(groups);

        // Fetch expenses from all user's groups
        const groupIds = groups.map((g: Group) => g.id);
        if (groupIds.length > 0) {
          const { data: groupExpData } = await supabase
            .from('expenses')
            .select('*')
            .in('group_id', groupIds)
            .order('created_at', { ascending: false });
          if (groupExpData) {
            setGroupExpenses(groupExpData);
          }
        }
      }
    }

    setLoading(false);
  };

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExpenses(data);
    }
  };

  const handleAddExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setExpenses([]);
  };

  const handleAvatarUpdate = (url: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
        <div className="text-center">
          <div className="loading-dots flex gap-2 justify-center mb-4">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-vermilion)', animation: 'bounce 1.4s ease-in-out infinite' }}></span>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-vermilion)', animation: 'bounce 1.4s ease-in-out infinite 0.2s' }}></span>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-vermilion)', animation: 'bounce 1.4s ease-in-out infinite 0.4s' }}></span>
          </div>
          <p className="sidenote">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      <style jsx global>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>

      {/* Header */}
      <header className="fade-in relative z-50" style={{
        background: 'var(--color-warm-white)',
        borderBottom: '1px solid var(--color-paper)',
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 className="header-title text-2xl" style={{ color: 'var(--color-ink)' }}>记账本</h1>
          <p className="sidenote mt-1">每笔消费，都是生活的印记</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <AvatarPicker
              userId={user.id}
              currentAvatar={profile?.avatar_url}
              currentEmail={user.email}
              onAvatarUpdate={handleAvatarUpdate}
            />
            <span className="sidenote hidden md:inline">{user.email}</span>
          </div>
          <button onClick={() => router.push('/groups')} className="btn-secondary">
            我的小组
          </button>
          <button onClick={handleSignOut} className="btn-secondary">
            退出
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-5 fade-in stagger-1" style={{ animationFillMode: 'both' }}>
            <div className="paper-texture washi-border rounded-lg p-6" style={{ background: 'var(--color-warm-white)' }}>
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                expenses={expenses}
              />

              {/* Group Expense Summary */}
              {groupExpenses.length > 0 && (
                <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--color-cream)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-5 rounded-full" style={{ background: 'var(--color-sage)' }}></div>
                    <h3 className="header-title text-base" style={{ color: 'var(--color-ink-light)' }}>小组消费</h3>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {userGroups.map(group => {
                      const groupTotal = groupExpenses
                        .filter(e => e.group_id === group.id)
                        .reduce((sum, e) => sum + e.amount, 0);
                      return (
                        <div key={group.id} className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--color-warm-white)' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ background: 'var(--color-vermilion)' }}>
                              {group.name[0]}
                            </div>
                            <span className="sidenote">{group.name}</span>
                          </div>
                          <span className="font-medium" style={{ color: 'var(--color-vermilion)' }}>
                            ¥{groupTotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form & List Section */}
          <div className="lg:col-span-7 fade-in stagger-2" style={{ animationFillMode: 'both' }}>
            <div className="paper-texture washi-border rounded-lg p-6" style={{ background: 'var(--color-warm-white)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 rounded-full" style={{ background: 'var(--color-vermilion)' }}></div>
                <h2 className="header-title text-xl" style={{ color: 'var(--color-ink)' }}>记一笔</h2>
              </div>

              <ExpenseForm selectedDate={selectedDate} onAddExpense={handleAddExpense} user={user} />

              <div className="mt-8 pt-6" style={{ borderTop: '1px dashed var(--color-paper)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 rounded-full" style={{ background: 'var(--color-gold)' }}></div>
                  <h3 className="header-title text-lg" style={{ color: 'var(--color-ink-light)' }}>今日记录</h3>
                </div>
                <div className="max-h-[250px] overflow-y-auto pr-2">
                  <ExpenseList expenses={expenses} selectedDate={selectedDate} onDelete={handleDeleteExpense} />
                </div>
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="paper-texture washi-border rounded-lg p-6 mt-6 fade-in stagger-3" style={{ background: 'var(--color-warm-white)', animationFillMode: 'both' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 rounded-full" style={{ background: 'var(--color-sage)' }}></div>
                <h3 className="header-title text-lg" style={{ color: 'var(--color-ink-light)' }}>本月概览</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {(() => {
                  const currentMonth = new Date().toISOString().slice(0, 7);
                  const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
                  const income = monthExpenses.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
                  const expense = monthExpenses.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0);
                  const balance = income + expense;
                  const values = [
                    Math.abs(income).toFixed(2),
                    Math.abs(expense).toFixed(2),
                    balance.toFixed(2)
                  ];
                  const colors = ['var(--color-sage)', 'var(--color-vermilion)', 'var(--color-gold)'];

                  return ['收入', '支出', '结余'].map((label, i) => (
                    <div key={label} className="text-center p-4 rounded-lg" style={{ background: 'var(--color-cream)' }}>
                      <p className="sidenote mb-1">{label}</p>
                      <p className="text-xl font-semibold" style={{ color: colors[i] }}>
                        ¥{values[i]}
                      </p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 fade-in stagger-4" style={{ animationFillMode: 'both' }}>
        <p className="sidenote">© 2026 记账本 · 用心记录每一笔</p>
      </footer>
    </div>
  );
}