import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { LogoPlaceholder } from '../../components/common/LogoPlaceholder';
import { GradientButton } from '../../components/common/GradientButton';
import { useAuth } from '../../hooks/useAuth';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onSuccess: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigateToLogin,
  onSuccess,
}) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName) {
      setError('Please enter your full name');
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
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(fullName, email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-y-auto bg-[#0A0A0A] p-6 text-left">
      <div className="pt-4">
        <div className="flex justify-center">
          <LogoPlaceholder size="md" />
        </div>

        <h1 className="mt-4 text-center text-2xl font-bold text-white">
          Create Account
        </h1>
        <p className="mt-1 text-center text-sm text-[#A1A1AA]">
          Sign up to stream unlimited movies & TV shows
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-center text-xs text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3.5">
          {/* Full Name */}
          <div className="relative flex h-[52px] items-center rounded-xl bg-[#1C1C1E] px-4">
            <User className="h-5 w-5 text-[#6B7280]" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="ml-3 flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] outline-none"
            />
          </div>

          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm Password */}
          <div className="relative flex h-[52px] items-center rounded-xl bg-[#1C1C1E] px-4">
            <Lock className="h-5 w-5 text-[#6B7280]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="ml-3 flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] outline-none"
            />
          </div>

          <div className="mt-2">
            <GradientButton
              title={loading ? 'Creating Account...' : 'Create Account'}
              size="lg"
              fullWidth
              disabled={loading}
            />
          </div>
        </form>
      </div>

      <div className="py-4 text-center">
        <p className="text-xs text-[#A1A1AA]">
          Already have an account?{' '}
          <button
            onClick={onNavigateToLogin}
            className="font-semibold text-[#8B5CF6] hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};
