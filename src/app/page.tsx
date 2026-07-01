'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Calendar from './components/Calendar';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import GroupExpenseSection from './components/GroupExpenseSection';
import AvatarPicker from './components/AvatarPicker';
import NotificationCenter from './components/NotificationCenter';
import { Expense, Profile, Group } from '@/types/expense';
import { formatDate } from '@/utils/date';
import AuthForm from './components/AuthForm';

export default function Home() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      setExpenses([]);
      setProfile(null);
      setUserGroups([]);
    }
  }, [status]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
      fetchGroups().then(groupIds => fetchExpenses(groupIds));
    }
  }, [session?.user?.id]);

  const fetchProfile = async () => {
    const res = await fetch('/api/profiles');
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
    }
  };

  const fetchGroups = async (): Promise<string[]> => {
    const res = await fetch('/api/groups');
    if (!res.ok) return [];
    const groups: Group[] = await res.json();
    setUserGroups(groups);
    return groups.map(g => g.id);
  };

  const fetchExpenses = async (groupIds?: string[]) => {
    const personalRes = await fetch('/api/expenses');
    let data: Expense[] = [];
    if (personalRes.ok) {
      data = await personalRes.json();
    }
    if (groupIds && groupIds.length > 0) {
      const ids = groupIds.join(',');
      const [groupRes, oweRes] = await Promise.all([
        fetch(`/api/expenses?groupIds=${ids}`),
        fetch(`/api/expenses?action=user-owes&groupIds=${ids}`),
      ]);
      if (groupRes.ok) {
        const groupData: Expense[] = await groupRes.json();
        const existingIds = new Set(data.map(e => e.id));
        for (const e of groupData) {
          if (!existingIds.has(e.id)) data.push(e);
        }
      }
      if (oweRes.ok) {
        const oweData: Expense[] = await oweRes.json();
        const existingIds = new Set(data.map(e => e.id));
        for (const e of oweData) {
          if (!existingIds.has(e.id)) data.push(e);
        }
      }
    }
    setExpenses(data);
  };

  const updateExpense = (expense: Expense) => {
    setExpenses(prev => {
      const exists = prev.some(e => e.id === expense.id);
      if (exists) {
        return prev.map(e => e.id === expense.id ? expense : e);
      }
      return [expense, ...prev];
    });
  };

  const handleExpensesRefresh = () => {
    // Refresh expenses from server (used by NotificationCenter after accepting split)
    fetchGroups().then(groupIds => fetchExpenses(groupIds));
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const { deletedOweIds = [] } = await res.json();
      setExpenses(prev => prev.filter(e => e.id !== id && !deletedOweIds.includes(e.id)));
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const handleAvatarUpdate = (url: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
  };

  const handleNicknameUpdate = (nickname: string) => {
    setProfile(prev => prev ? { ...prev, nickname } : null);
  };

  if (status === 'loading') {
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

  if (!session) {
    return <AuthForm />;
  }

  const user = session.user;

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
            <NotificationCenter onExpensesUpdate={handleExpensesRefresh} />
            <AvatarPicker
              userId={user.id}
              currentAvatar={profile?.avatar_url}
              currentNickname={profile?.nickname}
              currentEmail={user.email || ''}
              onAvatarUpdate={handleAvatarUpdate}
              onNicknameUpdate={handleNicknameUpdate}
            />
            <span className="sidenote hidden md:inline">{profile?.nickname || user.email}</span>
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

          {/* Left Column - Calendar + Group Expenses */}
          <div className="lg:col-span-5 fade-in stagger-1" style={{ animationFillMode: 'both' }}>
            {/* Calendar */}
            <div className="paper-texture washi-border rounded-lg p-6" style={{ background: 'var(--color-warm-white)' }}>
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                expenses={expenses}
              />
            </div>

            {/* Group Expense Section */}
            <GroupExpenseSection
              selectedDate={selectedDate}
              userGroups={userGroups}
              expenses={expenses}
              onUpdate={updateExpense}
              onDelete={handleDeleteExpense}
            />
          </div>

          {/* Right Column - Personal Expenses */}
          <div className="lg:col-span-7 fade-in stagger-2" style={{ animationFillMode: 'both' }}>
            <div className="paper-texture washi-border rounded-lg p-6" style={{ background: 'var(--color-warm-white)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-6 rounded-full" style={{ background: 'var(--color-vermilion)' }}></div>
                <h2 className="header-title text-xl" style={{ color: 'var(--color-ink)' }}>记一笔</h2>
              </div>

              <ExpenseForm selectedDate={selectedDate} onAddExpense={updateExpense} />

              <div className="mt-8 pt-6" style={{ borderTop: '1px dashed var(--color-paper)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 rounded-full" style={{ background: 'var(--color-gold)' }}></div>
                  <h3 className="header-title text-lg" style={{ color: 'var(--color-ink-light)' }}>今日记录</h3>
                </div>
                <div className="max-h-[250px] overflow-y-auto pr-2">
                  <ExpenseList
                    expenses={expenses.filter(e => e.source_type === 'personal')}
                    selectedDate={selectedDate}
                    onDelete={handleDeleteExpense}
                  />
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
                  const income = monthExpenses.filter(e => e.amount > 0 && e.source_type === 'personal').reduce((sum, e) => sum + e.amount, 0);
                  const totalExpense = monthExpenses
                    .filter(e => e.amount < 0 && e.source_type === 'personal')
                    .reduce((sum, e) => sum + e.amount, 0);
                  const balance = income + totalExpense;
                  const values = [
                    Math.abs(income).toFixed(2),
                    Math.abs(totalExpense).toFixed(2),
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
