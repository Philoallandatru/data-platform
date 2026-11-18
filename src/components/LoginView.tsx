import React, { useState } from 'react';
import { signIn } from '../lib/authClient';
import { ThemeMode } from '../types/ssd';
import { HardDrive, Lock, Mail, Moon, ShieldCheck, Sun, UserCheck } from 'lucide-react';

interface LoginViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  theme,
  onToggleTheme,
  onSuccess,
}) => {
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@pulselab.io' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'Admin@123456' : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn.email({ email, password });
    setLoading(false);
    if (res.error) {
      setError(res.error.message || 'Invalid email or password');
    } else {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] bg-cyber-grid text-[var(--text-primary)] flex items-center justify-center p-4 relative transition-colors duration-300">
      <button
        onClick={onToggleTheme}
        aria-label="Toggle theme"
        className="absolute top-5 right-5 p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
      </button>

      <div className="w-full max-w-md bento-card rounded-3xl p-7 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF6B2C] to-[#FF3B1D] flex items-center justify-center shadow-lg shadow-[#FF6B2C]/25">
            <HardDrive className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">
              PULSE LAB
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              SSD Telemetry & Firmware Analytics Platform
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Email
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus-within:border-[#FF6B2C]">
              <Mail className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-[var(--text-primary)] focus:outline-none"
                placeholder="admin@pulselab.io"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Password
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] focus-within:border-[#FF6B2C]">
              <Lock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-[var(--text-primary)] focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#FF4D2E]/15 border border-[#FF4D2E]/30 text-xs text-[#FF4D2E]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B2C] to-[#FF3B1D] text-white font-semibold text-sm shadow-lg shadow-[#FF6B2C]/25 hover:opacity-95 disabled:opacity-60 transition cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign In to Workspace'}
          </button>
        </form>

        {/* Quick Demo Account Fillers (Dev only) */}
        {import.meta.env.DEV && (
          <div className="pt-4 border-t border-[var(--border-card)] space-y-2">
            <div className="text-[11px] font-mono-num text-[var(--text-muted)] uppercase">
              Quick Demo Accounts (Dev Mode)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@pulselab.io');
                  setPassword('Admin@123456');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-card)] text-xs font-medium text-[var(--text-primary)] transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B2C]" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('fw@pulselab.io');
                  setPassword('Engineer@123');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] border border-[var(--border-card)] text-xs font-medium text-[var(--text-primary)] transition cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#00B4D8]" />
                FW Engineer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
