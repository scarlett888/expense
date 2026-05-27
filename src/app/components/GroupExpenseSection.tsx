'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/utils/date';
import { Expense, Group, GroupMember } from '@/types/expense';

interface GroupExpenseSectionProps {
  selectedDate: Date;
  userGroups: Group[];
  expenses: Expense[];
  onUpdate: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

interface MemberWithEmail extends GroupMember {
  user_email?: string;
  profile_nickname?: string | null;
}

export default function GroupExpenseSection({
  selectedDate,
  userGroups,
  expenses,
  onUpdate,
  onDelete,
}: GroupExpenseSectionProps) {
  const { data: session } = useSession();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberWithEmail[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOweList, setShowOweList] = useState(false);
  const userId = session?.user?.id;

  const fetchMembers = useCallback(async (groupId: string) => {
    const res = await fetch(`/api/groups/${groupId}/members`);
    if (res.ok) {
      const data: MemberWithEmail[] = await res.json();
      setMembers(data);
      setSelectedMemberIds(data.map(m => m.user_id));
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchMembers(selectedGroupId);
    } else {
      setMembers([]);
      setSelectedMemberIds([]);
    }
  }, [selectedGroupId, fetchMembers]);

  const handleMemberToggle = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map(m => m.user_id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (!userId) return;
    if (!selectedGroupId) return;
    if (selectedMemberIds.length === 0) {
      alert('请至少选择一位分摊成员');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: formatDate(selectedDate),
        amount: -Math.abs(parseFloat(amount)),
        note,
        group_id: selectedGroupId,
        memberIds: selectedMemberIds,
      }),
    });

    if (res.ok) {
      const { main, owes: newOwes } = await res.json();
      onUpdate(main);
      for (const owe of newOwes) {
        onUpdate(owe);
      }
      setAmount('');
      setNote('');
    } else {
      const data = await res.json();
      alert('添加失败：' + (data.error || '未知错误'));
    }

    setLoading(false);
  };

  const handleArchive = async () => {
    if (!selectedGroupId) return;
    const res = await fetch(
      `/api/expenses?action=archive-group&groupId=${selectedGroupId}&date=${dateStr}`,
      { method: 'POST' }
    );
    if (res.ok) {
      const { archived, deletedOweIds } = await res.json();
      // 将归档后的每条记录更新到主 expenses（转为 personal）
      for (const record of archived) {
        onUpdate(record);
      }
      // 从主 expenses 中移除所有被归档的应付
      for (const id of deletedOweIds) {
        onDelete(id);
      }
      setShowOweList(false);
    } else {
      const data = await res.json();
      alert(data.error || '归档失败');
    }
  };

  const dateStr = formatDate(selectedDate);

  const todayOwes = useMemo(() =>
    expenses.filter(
      e => e.group_id === selectedGroupId && e.date === dateStr && e.source_type === 'owe' && e.user_id === userId
    ),
    [expenses, selectedGroupId, dateStr, userId]
  );
  const totalOwe = todayOwes.reduce((sum, e) => sum + Math.abs(e.amount), 0);

  // 应付全部删除后自动关闭弹窗
  useEffect(() => {
    if (showOweList && todayOwes.length === 0) {
      setShowOweList(false);
    }
  }, [showOweList, todayOwes.length]);

  if (userGroups.length === 0) {
    return null;
  }

  return (
    <div className="paper-texture washi-border rounded-lg p-4 mt-4" style={{ background: 'var(--color-warm-white)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-5 rounded-full" style={{ background: 'var(--color-sage)' }}></div>
        <h3 className="header-title text-base" style={{ color: 'var(--color-ink)' }}>小组记账</h3>
      </div>

      {/* Group selector */}
      <select
        value={selectedGroupId || ''}
        onChange={e => setSelectedGroupId(e.target.value || null)}
        className="w-full px-3 py-2 rounded-lg border mb-3 text-sm"
        style={{ borderColor: 'var(--color-paper)', background: 'var(--color-cream)' }}
      >
        <option value="">选择小组...</option>
        {userGroups.map(g => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>

      {selectedGroupId && (
        <>
          {/* Members selector */}
          {members.length > 0 && (
            <div className="mb-3 p-3 rounded-lg" style={{ background: 'var(--color-cream)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="sidenote text-xs">分摊成员（{selectedMemberIds.filter(id => id !== userId).length}/{members.length}）</span>
                <button
                  onClick={handleSelectAll}
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--color-paper)', color: 'var(--color-ink-light)' }}
                >
                  {selectedMemberIds.length === members.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {members.map(member => {
                  const isMe = member.user_id === userId;
                  const isSelected = isMe || selectedMemberIds.includes(member.user_id);
                  const email = member.user_email || '';
                  const displayName = isMe
                    ? (member.profile_nickname || member.nickname || email.split('@')[0] || '我')
                    : (member.profile_nickname || member.nickname || email.split('@')[0] || '成员');
                  return (
                    <button
                      key={member.id}
                      onClick={() => !isMe && handleMemberToggle(member.user_id)}
                      className="text-xs px-2 py-1 rounded-full transition-all"
                      style={{
                        background: isSelected ? 'var(--color-sage)' : 'var(--color-warm-white)',
                        color: isSelected ? 'white' : 'var(--color-ink)',
                        border: `1px solid ${isSelected ? 'var(--color-sage)' : 'var(--color-paper)'}`,
                        cursor: isMe ? 'default' : 'pointer',
                      }}
                    >
                      {displayName}{isMe && ' · 我'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Amount + Note */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold" style={{ color: 'var(--color-vermilion)' }}>¥</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 py-2 px-3 text-sm font-medium rounded-lg"
                style={{ border: '2px solid var(--color-paper)', background: 'var(--color-warm-white)' }}
              />
            </div>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="备注..."
              className="w-full py-2 px-3 text-sm rounded-lg"
              style={{ border: '2px solid var(--color-paper)', background: 'var(--color-warm-white)' }}
            />
            <button
              type="submit"
              disabled={loading || !amount}
              className="btn-primary w-full py-2 text-sm"
            >
              {loading ? '添加中...' : '记小组支出'}
            </button>
          </form>

          {/* 应付待还总计 + 归档按钮 */}
          {todayOwes.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px dashed var(--color-paper)' }}>
              <button
                onClick={() => setShowOweList(true)}
                className="w-full flex items-center justify-between p-2 rounded transition-colors"
                style={{ background: 'rgba(139, 154, 125, 0.15)', cursor: 'pointer' }}
              >
                <span className="sidenote text-xs" style={{ color: 'var(--color-ink-light)' }}>
                  分摊明细（{todayOwes.length}笔）
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-sage)' }}>
                  -¥{totalOwe.toFixed(2)}
                </span>
              </button>
              <button
                onClick={handleArchive}
                disabled={totalOwe === 0}
                className="w-full mt-2 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: totalOwe === 0 ? 'var(--color-paper)' : 'var(--color-sage)', cursor: totalOwe === 0 ? 'not-allowed' : 'pointer' }}
              >
                归档全部应付
              </button>
            </div>
          )}
        </>
      )}

      {/* 应付待还明细弹窗 */}
      {showOweList && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
          onClick={() => setShowOweList(false)}
        >
          <div
            className="paper-texture washi-border rounded-xl p-6 w-full max-w-sm"
            style={{ background: 'var(--color-warm-white)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="header-title text-lg" style={{ color: 'var(--color-ink)' }}>分摊明细</h3>
              <button
                onClick={() => setShowOweList(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100"
              >×</button>
            </div>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {todayOwes.map(owe => (
                <div
                  key={owe.id}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ background: 'var(--color-cream)' }}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {owe.note?.replace(/^应付：/, '') || '无备注'}
                    </p>
                    <p className="sidenote text-xs">
                      {new Date(owe.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-vermilion)' }}>
                      -¥{Math.abs(owe.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() => onDelete(owe.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                      style={{ color: 'var(--color-vermilion)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleArchive}
              disabled={totalOwe === 0}
              className="w-full py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: totalOwe === 0 ? 'var(--color-paper)' : 'var(--color-sage)', cursor: totalOwe === 0 ? 'not-allowed' : 'pointer' }}
            >
              归档全部应付
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
