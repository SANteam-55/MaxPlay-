import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldAlert, KeyRound } from 'lucide-react';
import { LogoPlaceholder } from '../../components/common/LogoPlaceholder';
import { GradientButton } from '../../components/common/GradientButton';
import { useAuth } from '../../hooks/useAuth';
import { checkLoginRateLimit } from '../../utils/rateLimiter';

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
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockSeconds, setLockSeconds] = useState(0);

  // Check rate limit status whenever email changes
  useEffect(() => {
    if (!email) {
      setLockSeconds(0);
      return;
    }
    const status = checkLoginRateLimit(email);
    if (status.isLocked) {
      setLockSeconds(status.remainingSeconds);
    } else {
      setLockSeconds(0);
    }
  }, [email]);

  // Real-time countdown timer when locked
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockSeconds((prev) => {
        if (prev <= 1) {
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockSeconds > 0) {
      setError(`Account temporarily locked. Please wait ${lockSeconds}s or reset password.`);
      return;
    }

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
      const msg = err?.message || 'Sign in failed';
      setError(msg);
      // Re-evaluate if email got locked after this failed attempt
      const rateStatus = checkLoginRateLimit(email);
      if (rateStatus.isLocked) {
        setLockSeconds(rateStatus.remainingSeconds);
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockSeconds > 0;

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

        {/* Security Rate Limit Lockout Banner */}
        {isLocked ? (
          <div className="mt-4 rounded-xl bg-amber-500/10 p-3.5 border border-amber-500/25 text-left">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-amber-300">
                  Rate Limit Protected: Account Locked
                </h4>
                <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
                  Too many incorrect password attempts detected. To prevent brute-force attacks, logins for this account are paused for{' '}
                  <span className="font-bold text-amber-300">{lockSeconds}s</span>.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onNavigateToForgotPassword}
                    className="flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-white underline cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Reset Password Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-center text-xs text-red-400 border border-red-500/20">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Email input */}
          <div className="relative flex h-[52px] items-center rounded-xl bg-[#1C1C1E] px-4">
            <Mail className="h-5 w-5 text-[#6B7280]" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error && !isLocked) setError('');
              }}
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
              onChange={(e) => {
                setPassword(e.target.value);
                if (error && !isLocked) setError('');
              }}
              placeholder="Password"
              className="ml-3 flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-[#6B7280] hover:text-white cursor-pointer"
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
              title={
                loading
                  ? 'Signing in...'
                  : isLocked
                  ? `Locked (${lockSeconds}s)`
                  : 'Sign In'
              }
              size="lg"
              fullWidth
              disabled={loading || isLocked}
            />
          </div>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-[1px] flex-1 bg-[#1C1C1E]" />
          <span className="text-xs text-[#6B7280]">or</span>
          <div className="h-[1px] flex-1 bg-[#1C1C1E]" />
        </div>

        {/* Guest sign-in option */}
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
