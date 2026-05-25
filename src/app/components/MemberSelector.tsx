'use client';

import { useState, useEffect, useCallback } from 'react';
import { GroupMember } from '@/types/expense';

interface MemberSelectorProps {
  groupId: string;
  selectedMemberIds: string[];
  onMemberToggle: (memberId: string) => void;
  onSelectAll: () => void;
}

export default function MemberSelector({ groupId, selectedMemberIds, onMemberToggle, onSelectAll }: MemberSelectorProps) {
  const [members, setMembers] = useState<(GroupMember & { user_email?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async (gid: string) => {
    setLoading(true);
    const res = await fetch(`/api/groups/${gid}/members`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (groupId) {
      fetchMembers(groupId);
    }
  }, [groupId, fetchMembers]);

  if (loading || members.length === 0) {
    return null;
  }

  const allSelected = members.every(m => selectedMemberIds.includes(m.user_id));

  return (
    <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--color-cream)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="sidenote">分摊成员（{selectedMemberIds.length}/{members.length}）</span>
        <button
          onClick={onSelectAll}
          className="text-xs px-2 py-1 rounded"
          style={{ background: 'var(--color-paper)', color: 'var(--color-ink-light)' }}
        >
          {allSelected ? '取消全选' : '全选'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {members.map(member => {
          const isSelected = selectedMemberIds.includes(member.user_id);
          const displayEmail = member.user_email || '';
          return (
            <button
              key={member.id}
              onClick={() => onMemberToggle(member.user_id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                isSelected ? '' : 'opacity-50'
              }`}
              style={{
                background: isSelected ? 'var(--color-vermilion)' : 'var(--color-warm-white)',
                color: isSelected ? 'white' : 'var(--color-ink)',
                border: `2px solid ${isSelected ? 'var(--color-vermilion)' : 'var(--color-paper)'}`
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--color-paper)' }}
              >
                {displayEmail?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-sm">{member.nickname || displayEmail.split('@')[0] || '成员'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
