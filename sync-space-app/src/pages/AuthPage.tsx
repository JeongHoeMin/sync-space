import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [autoLogin, setAutoLogin] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forceLogoutMessage, setForceLogoutMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 강제 로그아웃으로 리다이렉트된 경우 메시지 표시
  useEffect(() => {
    const state = location.state as { forceLogout?: boolean; reason?: string } | null;
    if (state?.forceLogout && state?.reason) {
      setForceLogoutMessage(state.reason);
      // state 클리어 (새로고침 시 재표시 방지)
      window.history.replaceState({}, '');
    }
  }, []);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    const isAutoLogin = localStorage.getItem('autoLogin') === 'true';
    const token = localStorage.getItem('token');

    if (savedEmail) setEmail(savedEmail);
    if (isAutoLogin) setAutoLogin(true);

    if (token && isAutoLogin) {
      navigate('/dashboard');
      return;
    }

    if (savedEmail) {
      passwordRef.current?.focus();
    } else {
      emailRef.current?.focus();
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '인증 실패');
      }

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('savedEmail', email);
      if (isLogin && autoLogin) {
        localStorage.setItem('autoLogin', 'true');
      } else {
        localStorage.removeItem('autoLogin');
      }
      navigate('/dashboard');
    } catch (err: any) {
      // [버그 수정] 네이티브 alert() 사용 시 Electron에서 포커스가 돌아오지 않아
      // input 클릭 불가 현상 발생 → 인앱 에러 메시지로 교체
      setErrorMessage(err.message);
      setTimeout(() => {
        if (email) {
          passwordRef.current?.focus();
        } else {
          emailRef.current?.focus();
        }
      }, 50);
    }
  };

  const checkCapsLock = (e: React.KeyboardEvent) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 text-white select-none pointer-events-auto relative"
    >
      {/* 윈도우 드래그 영역 상단 바 */}
      <div className="absolute top-0 left-0 w-full h-10 z-50" style={{ WebkitAppRegion: 'drag' } as any} />

      <div
        className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <h1 className="text-3xl font-bold mb-6 text-center tracking-tight">SyncSpace</h1>

        {/* 강제 로그아웃 경고 배너 */}
        {forceLogoutMessage && (
          <div className="mb-4 px-4 py-3 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-3 text-sm text-amber-400">
            <span className="text-amber-500 text-base">⚠️</span>
            {forceLogoutMessage}
          </div>
        )}

        {/* 인앱 에러 메시지 (alert 대체) */}
        {errorMessage && (
          <div className="mb-4 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-3 text-sm text-red-400">
            <span className="w-2 h-2 bg-red-500 rounded-full shrink-0 animate-pulse" />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }}
              required
              className="w-full bg-zinc-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
              onKeyDown={checkCapsLock}
              onKeyUp={checkCapsLock}
              required
              minLength={6}
              className="w-full bg-zinc-800 border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              placeholder="••••••••"
            />
            {isCapsLockOn && (
              <p className="text-xs text-orange-500 mt-1 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                Caps Lock이 켜져 있습니다.
              </p>
            )}
          </div>

          {isLogin && (
            <div className="flex items-center gap-2 mb-2">
              <input
                id="autoLogin"
                type="checkbox"
                checked={autoLogin}
                onChange={(e) => setAutoLogin(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
              />
              <label htmlFor="autoLogin" className="text-sm text-zinc-400 cursor-pointer select-none">
                자동 로그인
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-lg transition-colors mt-2"
          >
            {isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          <button
            onClick={() => { setIsLogin(!isLogin); setErrorMessage(null); }}
            className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {isLogin ? '회원가입' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}
