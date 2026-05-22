'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/utils/date';
import GroupSelector from './GroupSelector';
import MemberSelector from './MemberSelector';
import { Expense, GroupMember } from '@/types/expense';

interface ExpenseFormProps {
  selectedDate: Date;
  onAddExpense: (expense: Expense) => void;
}

export default function ExpenseForm({ selectedDate, onAddExpense }: ExpenseFormProps) {
  const { data: session } = useSession();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupMembers, setGroupMembers] = useState<(GroupMember & { user: { id: string; email: string } })[]>([]);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');

  const userId = session?.user?.id;

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupMembers(selectedGroupId);
    } else {
      setGroupMembers([]);
      setSelectedMemberIds([]);
    }
  }, [selectedGroupId]);

  const fetchGroupMembers = async (groupId: string) => {
    const res = await fetch(`/api/groups/${groupId}/members`);
    if (res.ok) {
      const data = await res.json();
      setGroupMembers(data);
      setSelectedMemberIds(data.map((m: { user_id: string }) => m.user_id));
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.length === groupMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(groupMembers.map(m => m.user_id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    if (!userId) {
      alert('请先登录');
      return;
    }

    if (selectedGroupId && selectedMemberIds.length === 0) {
      alert('请至少选择一位分摊成员');
      return;
    }

    setLoading(true);

    const expenseData = {
      date: formatDate(selectedDate),
      amount: transactionType === 'income' ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount)),
      note,
      group_id: selectedGroupId || null,
      memberIds: selectedGroupId ? selectedMemberIds : undefined,
    };

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseData),
    });

    if (res.ok) {
      const expense: Expense = await res.json();
      onAddExpense(expense);
      setAmount('');
      setNote('');
    } else {
      const data = await res.json();
      alert('添加失败：' + (data.error || '未知错误'));
    }

    setLoading(false);
  };

  const splitAmount = selectedGroupId && selectedMemberIds.length > 0 && amount
    ? (parseFloat(amount) / selectedMemberIds.length).toFixed(2)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Date Display */}
      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-cream)' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-vermilion)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div>
          <p className="sidenote">记账日期</p>
          <p className="font-medium">{formatDate(selectedDate)}</p>
        </div>
      </div>

      {/* Transaction Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTransactionType('expense')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
            transactionType === 'expense'
              ? 'text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={transactionType === 'expense' ? { background: 'var(--color-vermilion)' } : {}}
        >
          支出
        </button>
        <button
          type="button"
          onClick={() => setTransactionType('income')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
            transactionType === 'income'
              ? 'text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          style={transactionType === 'income' ? { background: 'var(--color-sage)' } : {}}
        >
          收入
        </button>
      </div>

      {/* Group Selector */}
      <GroupSelector
        userId={userId || ''}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
      />

      {/* Member Selector - only show when group selected */}
      {selectedGroupId && (
        <MemberSelector
          groupId={selectedGroupId}
          selectedMemberIds={selectedMemberIds}
          onMemberToggle={handleMemberToggle}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* Amount Input */}
      <div>
        <label className="block sidenote mb-2">金额 (元)</label>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold" style={{ color: 'var(--color-vermilion)' }}>¥</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 py-4 text-2xl font-semibold pr-16"
            style={{
              border: '2px solid var(--color-paper)',
              background: 'var(--color-warm-white)'
            }}
          />
        </div>
        {splitAmount && (
          <p className="sidenote mt-2">
            每人应付 <span style={{ color: 'var(--color-vermilion)' }}>¥{splitAmount}</span>
          </p>
        )}
      </div>

      {/* Note Input */}
      <div>
        <label className="block sidenote mb-2">备注说明</label>
        <div className="relative">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="午餐、交通、购物..."
            className="py-3"
            style={{ border: '2px solid var(--color-paper)' }}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-4 text-lg"
        style={{ borderRadius: '8px' }}
      >
        {loading ? '提交中...' : transactionType === 'income' ? '记收入' : '记支出'}
      </button>
    </form>
  );
}
