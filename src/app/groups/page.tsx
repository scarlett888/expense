'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Group, GroupMember } from '@/types/expense';

export default function GroupsPage() {
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<(GroupMember & { user: { id: string; email: string } })[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setUser(user);
    setLoading(false);
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('created_by', user.id);

    if (!error && data) {
      setGroups(data);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: newGroupName, created_by: user.id })
      .select()
      .single();

    if (!error && data) {
      // Add creator as first member
      await supabase
        .from('group_members')
        .insert({ group_id: data.id, user_id: user.id, nickname: '我' });

      setGroups([data, ...groups]);
      setNewGroupName('');
      setShowCreateModal(false);
    }
    setCreating(false);
  };

  const openGroupDetail = async (group: Group) => {
    setSelectedGroup(group);
    const { data } = await supabase
      .from('group_members')
      .select('*, user:users!user_id (id, email)')
      .eq('group_id', group.id);
    setGroupMembers(data || []);
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !selectedGroup) return;

    // Find user by email
    const { data: foundUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', inviteEmail)
      .single();

    if (!foundUser) {
      alert('未找到该用户，请确认邮箱正确');
      return;
    }

    // Add to group
    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: selectedGroup.id,
        user_id: foundUser.id,
        nickname: inviteEmail.split('@')[0]
      });

    if (!error) {
      // Refresh members
      const { data } = await supabase
        .from('group_members')
        .select('*, user:users!user_id (id, email)')
        .eq('group_id', selectedGroup.id);
      setGroupMembers(data || []);
      setInviteEmail('');
    } else {
      alert('添加失败：' + error.message);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('确定要移除该成员吗？')) return;

    await supabase.from('group_members').delete().eq('id', memberId);
    setGroupMembers(groupMembers.filter(m => m.id !== memberId));
  };

  const deleteGroup = async () => {
    if (!selectedGroup || !confirm('确定要删除该小组吗？')) return;

    await supabase.from('groups').delete().eq('id', selectedGroup.id);
    setGroups(groups.filter(g => g.id !== selectedGroup.id));
    setSelectedGroup(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
        <p className="sidenote">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      {/* Header */}
      <header className="fade-in" style={{
        background: 'var(--color-warm-white)',
        borderBottom: '1px solid var(--color-paper)',
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="header-title text-2xl" style={{ color: 'var(--color-ink)' }}>我的小组</h1>
            <p className="sidenote mt-1">和朋友一起记账</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          + 新建小组
        </button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-8">
        {groups.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--color-warm-white)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <h2 className="header-title text-xl mb-2">还没有小组</h2>
            <p className="sidenote mb-6">创建一个小组，邀请朋友一起记账</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              创建第一个小组
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => openGroupDetail(group)}
                className="paper-texture washi-border rounded-lg p-5 cursor-pointer hover:scale-[1.02] transition-transform"
                style={{ background: 'var(--color-warm-white)' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--color-vermilion)' }}>
                    <span className="text-white text-lg font-bold">{group.name[0]}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{group.name}</h3>
                    <p className="sidenote">创建于 {new Date(group.created_at).toLocaleDateString()}</p>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-light)" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="paper-texture washi-border rounded-xl p-6 w-full max-w-md" style={{ background: 'var(--color-warm-white)' }}>
            <h2 className="header-title text-xl mb-4">新建小组</h2>
            <input
              type="text"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="小组名称，如：旅行记账"
              className="w-full py-3 mb-4"
              style={{ border: '2px solid var(--color-paper)' }}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">
                取消
              </button>
              <button onClick={createGroup} disabled={creating || !newGroupName.trim()} className="btn-primary flex-1">
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Detail Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="paper-texture washi-border rounded-xl p-6 w-full max-w-md" style={{ background: 'var(--color-warm-white)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="header-title text-xl">{selectedGroup.name}</h2>
              <button onClick={() => setSelectedGroup(null)} className="p-2 rounded-lg hover:bg-gray-100">×</button>
            </div>

            {/* Members list */}
            <div className="mb-4">
              <p className="sidenote mb-2">成员 ({groupMembers.length})</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {groupMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-cream)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--color-sage)' }}>
                        {member.user?.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.nickname || member.user?.email?.split('@')[0]}</p>
                        <p className="sidenote text-xs">{member.user?.email}</p>
                      </div>
                    </div>
                    {member.user_id !== user.id && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="text-xs px-2 py-1 rounded hover:bg-red-50"
                        style={{ color: 'var(--color-vermilion)' }}
                      >
                        移除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invite */}
            <div className="mb-4">
              <p className="sidenote mb-2">邀请新成员</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="输入邮箱地址"
                  className="flex-1 py-2 text-sm"
                  style={{ border: '2px solid var(--color-paper)' }}
                />
                <button onClick={inviteMember} className="btn-secondary text-sm">
                  邀请
                </button>
              </div>
            </div>

            <button onClick={deleteGroup} className="w-full py-2 text-sm rounded-lg" style={{ color: 'var(--color-vermilion)', background: 'rgba(197, 61, 67, 0.1)' }}>
              删除小组
            </button>
          </div>
        </div>
      )}
    </div>
  );
}