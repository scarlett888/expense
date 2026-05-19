'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        setMessageType('error');
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
        setMessageType('error');
      } else {
        setMessage('注册成功！请查收验证邮件后登录。');
        setMessageType('success');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-cream)' }}>
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-10" style={{ background: 'var(--color-vermilion)' }} />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-10" style={{ background: 'var(--color-sage)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8 fade-in">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-vermilion)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <h1 className="header-title text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>记账本</h1>
          <p className="sidenote">记录每一笔，感知生活的脉动</p>
        </div>

        {/* Form Card */}
        <div className="paper-texture washi-border rounded-xl p-8 fade-in stagger-1" style={{ background: 'var(--color-warm-white)', animationFillMode: 'both' }}>
          <h2 className="header-title text-xl mb-6 text-center" style={{ color: 'var(--color-ink)' }}>
            {isLogin ? '欢迎回来' : '创建账户'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block sidenote mb-2">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="py-3"
                style={{ border: '2px solid var(--color-paper)' }}
              />
            </div>

            <div>
              <label className="block sidenote mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="py-3"
                style={{ border: '2px solid var(--color-paper)' }}
              />
            </div>

            {message && (
              <div
                className="p-3 rounded-lg text-sm text-center"
                style={{
                  background: messageType === 'error' ? 'rgba(197, 61, 67, 0.1)' : 'rgba(139, 154, 125, 0.1)',
                  color: messageType === 'error' ? 'var(--color-vermilion)' : 'var(--color-sage)'
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg"
              style={{ borderRadius: '8px' }}
            >
              {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="sidenote">{isLogin ? '还没有账户？' : '已有账户？'}</span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage('');
              }}
              className="ml-2 font-medium transition-colors hover:underline"
              style={{ color: 'var(--color-vermilion)' }}
            >
              {isLogin ? '注册' : '登录'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 sidenote fade-in stagger-2" style={{ animationFillMode: 'both' }}>
          开始记录你的财务旅程
        </p>
      </div>
    </div>
  );
}