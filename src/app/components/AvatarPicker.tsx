'use client';

import { useState, useRef } from 'react';

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
  const [selectedPreset, setSelectedPreset] = useState(currentAvatar || PRESET_AVATARS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const { url } = await res.json();
      await saveAvatar(url);
    } else {
      alert('上传失败');
    }
    setUploading(false);
  };

  const saveAvatar = async (url: string) => {
    const res = await fetch('/api/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: url }),
    });
    if (res.ok) {
      onAvatarUpdate(url);
    }
  };

  const selectPreset = async (url: string) => {
    setSelectedPreset(url);
    await saveAvatar(url);
  };

  const getInitials = (email: string) => email?.match(/[a-zA-Z]/)?.[0]?.toUpperCase() || '?';

  const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  return (
    <>
      {/* Current Avatar - small and in header */}
      <div className="relative">
        <button onClick={() => setIsOpen(!isOpen)} className="block">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold overflow-hidden border-2 border-white/50"
            style={{ background: 'var(--color-vermilion)' }}
          >
            {currentAvatar ? (
              <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials(currentEmail)
            )}
          </div>
        </button>

        {/* Modal */}
        {isOpen && (
          <div
            className="absolute right-0 top-full mt-2 z-[9999] washi-border rounded-2xl p-5 w-72 shadow-2xl"
            style={{ background: 'var(--color-warm-white)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="header-title text-lg">更换头像</h2>
              <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-base">×</button>
            </div>

            {/* Upload */}
            <div className="mb-4">
              <p className="sidenote mb-2 text-xs">上传图片</p>
              <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary w-full py-2 text-sm">
                {uploading ? '上传中...' : '选择图片上传'}
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
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
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
                {LETTERS.map((letter, i) => (
                  <button
                    key={i}
                    onClick={() => selectPreset(`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='${encodeURIComponent(COLOR_OPTIONS[i % COLOR_OPTIONS.length])}' width='100' height='100' rx='50'/><text x='50' y='65' font-size='50' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'>${letter}</text></svg>`)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base hover:scale-105 transition-transform"
                    style={{ background: COLOR_OPTIONS[i % COLOR_OPTIONS.length] }}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
