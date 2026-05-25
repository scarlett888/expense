'use client';

import { useState, useEffect, useCallback } from 'react';
import { Group } from '@/types/expense';

interface GroupSelectorProps {
  userId: string;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
}

export default function GroupSelector({ userId, selectedGroupId, onSelectGroup }: GroupSelectorProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/groups');
    if (res.ok) {
      const data: Group[] = await res.json();
      setGroups(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchGroups();
    }
  }, [userId, fetchGroups]);

  if (loading) {
    return <div className="text-sm sidenote">加载小组...</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <label className="sidenote">选择小组</label>
      <select
        value={selectedGroupId || ''}
        onChange={e => onSelectGroup(e.target.value ? e.target.value : null)}
        className="flex-1 px-3 py-2 rounded-lg border"
        style={{ borderColor: 'var(--color-paper)', background: 'var(--color-warm-white)' }}
      >
        <option value="">个人记账</option>
        {groups.map(group => (
          <option key={group.id} value={group.id}>{group.name}</option>
        ))}
      </select>
    </div>
  );
}
