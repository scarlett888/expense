'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { formatDate } from '@/utils/date';
import { Expense } from '@/types/expense';

interface PendingSplit {
  expense_splits: {
    id: string;
    expense_id: string;
    user_id: string;
    amount: number;
    status: string;
    created_at: string;
  };
  expenses: {
    id: string;
    date: string;
    amount: number;
    note: string | null;
    payer_id: string;
  };
}

interface PendingInvitation {
  id: string;
  group_id: string;
  inviter_id: string;
  status: string;
  created_at: string;
  inviter_email?: string;
  inviter_nickname?: string | null;
  group_name: string;
}

interface NotificationCenterProps {
  onExpensesUpdate?: () => void;
}

export default function NotificationCenter({ onExpensesUpdate }: NotificationCenterProps) {
  const { data: session } = useSession();
  const [showPanel, setShowPanel] = useState(false);
  const [pendingSplits, setPendingSplits] = useState<PendingSplit[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'splits' | 'invitations'>('splits');

  const fetchPendingSplits = useCallback(async () => {
    if (!session?.user?.id) return;

    const res = await fetch('/api/notifications?action=pending-splits');
    if (res.ok) {
      const data = await res.json();
      setPendingSplits(data);
    }
  }, [session?.user?.id]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!session?.user?.id) return;

    const res = await fetch('/api/invitations/pending');
    if (res.ok) {
      const data = await res.json();
      setPendingInvitations(data);
    }
  }, [session?.user?.id]);

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return;

    const res = await fetch('/api/notifications?action=count');
    if (res.ok) {
      const data = await res.json();
      setUnreadCount(data.count);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchPendingSplits();
      fetchPendingInvitations();
      fetchUnreadCount();
    }
  }, [session?.user?.id, fetchPendingSplits, fetchPendingInvitations, fetchUnreadCount]);

  const handleSplitAction = async (splitId: string, action: 'accept' | 'reject') => {
    setLoading(true);
    try {
      const res = await fetch('/api/expense-splits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ split_id: splitId, action }),
      });

      if (res.ok) {
        const data = await res.json();
        setPendingSplits(prev => prev.filter(s => s.expense_splits.id !== splitId));
        fetchUnreadCount();

        // 如果是接受分摊，通知父组件刷新数据
        if (action === 'accept' && onExpensesUpdate) {
          onExpensesUpdate();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationAction = async (invitationId: string, action: 'accept' | 'reject') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        setPendingInvitations(prev => prev.filter(i => i.id !== invitationId));
        fetchUnreadCount();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user?.id) return null;

  const totalPending = pendingSplits.length + pendingInvitations.length;

  return (
    <>
      {/* 通知按钮 */}
      <button
        onClick={() => { setShowPanel(true); fetchPendingSplits(); fetchPendingInvitations(); }}
        className="relative p-2 rounded-lg transition-colors hover:bg-gray-100"
        style={{ color: 'var(--color-ink)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {totalPending > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'var(--color-vermilion)' }}
          >
            {totalPending > 9 ? '9+' : totalPending}
          </span>
        )}
      </button>

      {/* 通知面板 */}
      {showPanel && (
        <div
          className="fixed inset-0 flex items-start justify-end p-4"
          style={{ background: 'rgba(0,0,0,0.3)', zIndex: 9999 }}
          onClick={() => setShowPanel(false)}
        >
          <div
            className="paper-texture washi-border rounded-xl w-full max-w-sm mt-16"
            style={{ background: 'var(--color-warm-white)', maxHeight: '70vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--color-paper)' }}>
              <h3 className="header-title text-lg" style={{ color: 'var(--color-ink)' }}>
                通知中心
              </h3>
              <button
                onClick={() => setShowPanel(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex" style={{ borderBottom: '1px solid var(--color-paper)' }}>
              <button
                onClick={() => setActiveTab('splits')}
                className="flex-1 py-3 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === 'splits' ? 'var(--color-sage)' : 'var(--color-ink-light)',
                  borderBottom: activeTab === 'splits' ? '2px solid var(--color-sage)' : '2px solid transparent',
                }}
              >
                待确认账单
                {pendingSplits.length > 0 && (
                  <span className="ml-1 text-xs">({pendingSplits.length})</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className="flex-1 py-3 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === 'invitations' ? 'var(--color-sage)' : 'var(--color-ink-light)',
                  borderBottom: activeTab === 'invitations' ? '2px solid var(--color-sage)' : '2px solid transparent',
                }}
              >
                加入邀请
                {pendingInvitations.length > 0 && (
                  <span className="ml-1 text-xs">({pendingInvitations.length})</span>
                )}
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 120px)' }}>
              {activeTab === 'splits' && (
                pendingSplits.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg
                      className="mx-auto mb-3"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ color: 'var(--color-paper)' }}
                    >
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                      <path d="M9 12h6M9 16h6" />
                    </svg>
                    <p className="sidenote" style={{ color: 'var(--color-ink-light)' }}>暂无待确认账单</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {pendingSplits.map((item) => (
                      <div
                        key={item.expense_splits.id}
                        className="p-4 rounded-lg"
                        style={{ background: 'var(--color-cream)' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                              {item.expenses.note || '无备注'}
                            </p>
                            <p className="sidenote text-xs mt-1" style={{ color: 'var(--color-ink-light)' }}>
                              {item.expenses.date} · 应付 ¥{Math.abs(item.expense_splits.amount).toFixed(2)}
                            </p>
                          </div>
                          <div
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ background: 'var(--color-gold)', color: 'white' }}
                          >
                            待确认
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleSplitAction(item.expense_splits.id, 'accept')}
                            disabled={loading}
                            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity"
                            style={{ background: 'var(--color-sage)', opacity: loading ? 0.6 : 1 }}
                          >
                            接受
                          </button>
                          <button
                            onClick={() => handleSplitAction(item.expense_splits.id, 'reject')}
                            disabled={loading}
                            className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity"
                            style={{
                              background: 'var(--color-warm-white)',
                              border: '1px solid var(--color-paper)',
                              color: 'var(--color-ink-light)',
                              opacity: loading ? 0.6 : 1
                            }}
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'invitations' && (
                pendingInvitations.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg
                      className="mx-auto mb-3"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ color: 'var(--color-paper)' }}
                    >
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    <p className="sidenote" style={{ color: 'var(--color-ink-light)' }}>暂无加入邀请</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="p-4 rounded-lg"
                        style={{ background: 'var(--color-cream)' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                              {invitation.inviter_nickname || invitation.inviter_email?.split('@')[0] || '某人'} 邀请你加入
                            </p>
                            <p className="sidenote text-xs mt-1" style={{ color: 'var(--color-ink-light)' }}>
                              {invitation.group_name}
                            </p>
                          </div>
                          <div
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ background: 'var(--color-sage)', color: 'white' }}
                          >
                            待确认
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleInvitationAction(invitation.id, 'accept')}
                            disabled={loading}
                            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity"
                            style={{ background: 'var(--color-sage)', opacity: loading ? 0.6 : 1 }}
                          >
                            接受
                          </button>
                          <button
                            onClick={() => handleInvitationAction(invitation.id, 'reject')}
                            disabled={loading}
                            className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity"
                            style={{
                              background: 'var(--color-warm-white)',
                              border: '1px solid var(--color-paper)',
                              color: 'var(--color-ink-light)',
                              opacity: loading ? 0.6 : 1
                            }}
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
