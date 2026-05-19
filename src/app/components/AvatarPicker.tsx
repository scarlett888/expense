'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

interface AvatarPickerProps {
  userId: string;
  currentAvatar?: string | null;
  currentEmail: string;
  onAvatarUpdate: (url: string) => void;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=a1',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=b2',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=c3',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=d4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=e5',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=f6',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=g7',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=h8',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=i9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=j10',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=k11',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=l12',
];

const COLOR_OPTIONS = [
  '#C53D43',
  '#C4A35A',
  '#8B9A7D',
  '#5A4F3A',
  '#6B7FD7',
  '#D4768A',
  '#7AB8A5',
  '#9B8FA0',
];

export default function AvatarPicker({ userId, currentAvatar, currentEmail, onAvatarUpdate }: AvatarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedPreset, setSelectedPreset] = useState(currentAvatar || PRESET_AVATARS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left - 120,
      });
    }
  }, [isOpen]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      alert('上传失败：' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    await saveAvatar(data.publicUrl);
    setUploading(false);
  };

  const saveAvatar = async (url: string) => {
    await supabase.from('profiles').upsert({ user_id: userId, avatar_url: url });
    onAvatarUpdate(url);
  };

  const selectPreset = async (url: string) => {
    setSelectedPreset(url);
    await saveAvatar(url);
  };

  const getInitials = (email: string) => email?.[0]?.toUpperCase() || '?';

  return (
    <>
      {/* Current Avatar */}
      <div ref={avatarRef} className="relative inline-block">
        <button onClick={() => setIsOpen(!isOpen)} className="relative group block">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold overflow-hidden border-2 border-white shadow-md"
            style={{ background: 'var(--color-vermilion)' }}
          >
            {currentAvatar ? (
              <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials(currentEmail)
            )}
          </div>
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </button>
      </div>

      {/* Modal - fixed positioned at avatar's bottom-left */}
      {isOpen && (
        <div
          className="fixed z-[100] paper-texture washi-border rounded-xl p-5 w-72 shadow-xl"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            background: 'var(--color-warm-white)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="header-title text-lg">更换头像</h2>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-gray-100 text-lg">×</button>
          </div>

          {/* Upload */}
          <div className="mb-4">
            <p className="sidenote mb-2 text-xs">上传图片</p>
            <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-secondary w-full py-2 text-sm">
              {uploading ? '上传中...' : '选择图片'}
            </button>
          </div>

          {/* Presets */}
          <div className="mb-4">
            <p className="sidenote mb-2 text-xs">预设头像</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  onClick={() => selectPreset(url)}
                  className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                    selectedPreset === url ? 'border-[var(--color-vermilion)]' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>

          {/* Color initials */}
          <div>
            <p className="sidenote mb-2 text-xs">字母头像</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color, i) => (
                <button
                  key={i}
                  onClick={() => selectPreset(`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='${encodeURIComponent(color)}' width='100' height='100' rx='50'/><text x='50' y='65' font-size='50' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'>${getInitials(currentEmail)}</text></svg>`)}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: color }}
                >
                  {getInitials(currentEmail)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}