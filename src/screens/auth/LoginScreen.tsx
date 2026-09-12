import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { LogoPlaceholder } from '../../components/common/LogoPlaceholder';
import { GradientButton } from '../../components/common/GradientButton';
import { useAuth } from '../../hooks/useAuth';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onSuccess,
}) => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-y-auto bg-[#0A0A0A] p-6 text-left">
      <div className="pt-6">
        <div className="flex justify-center">
          <LogoPlaceholder size="md" />
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold text-white">
          Welcome Back
        </h1>
        <p className="mt-1 text-center text-sm text-[#A1A1AA]">
          Sign in to continue watching on MaxPlay
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-center text-xs text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Email input */}
          <div className="relative flex h-[52px] items-center rounded-xl bg-[#1C1C1E] px-4">
            <Mail className="h-5 w-5 text-[#6B7280]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="ml-3 flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] outline-none"
            />
          </div>

          {/* Password input */}
          <div className="relative flex h-[52px] items-center rounded-xl bg-[#1C1C1E] px-4">
            <Lock className="h-5 w-5 text-[#6B7280]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="ml-3 flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-[#6B7280] hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-xs font-medium text-[#8B5CF6] hover:underline cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          <div className="mt-2">
            <GradientButton
              title={loading ? 'Signing in...' : 'Sign In'}
              size="lg"
              fullWidth
              disabled={loading}
            />
          </div>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-[1px] flex-1 bg-[#1C1C1E]" />
          <span className="text-xs text-[#6B7280]">or continue with</span>
          <div className="h-[1px] flex-1 bg-[#1C1C1E]" />
        </div>

        {/* Guest & Google sign-in options */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={async () => {
              setLoading(true);
              const randomNum = Math.floor(1000 + Math.random() * 9000);
              const guestEmail = `guest_${randomNum}@maxplay.app`;
              await login(guestEmail, 'guestpass123');
              onSuccess();
            }}
            type="button"
            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] text-sm font-semibold text-white transition hover:bg-[#2C2C2E] border border-white/10 cursor-pointer"
          >
            <span>✨ Continue as Guest</span>
          </button>

          <button
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                await loginWithGoogle();
                onSuccess();
              } catch (err: any) {
                setError(err.message || 'Google sign in failed');
              } finally {
                setLoading(false);
              }
            }}
            type="button"
            className="flex h-[48px] w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-gray-100 cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign In with Google</span>
          </button>
        </div>
      </div>

      <div className="py-4 text-center">
        <p className="text-xs text-[#A1A1AA]">
          Don't have an account?{' '}
          <button
            onClick={onNavigateToRegister}
            className="font-semibold text-[#8B5CF6] hover:underline cursor-pointer"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};
