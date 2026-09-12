import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { LogoPlaceholder } from '../../components/common/LogoPlaceholder';
import { GradientButton } from '../../components/common/GradientButton';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 800);
  };

  return (
    <div className="flex h-full w-full flex-col justify-between bg-[#0A0A0A] p-6 text-left">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white pt-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Login</span>
        </button>

        <div className="mt-8 flex justify-center">
          <LogoPlaceholder size="md" />
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold text-white">
          Reset Password
        </h1>
        <p className="mt-1 text-center text-sm text-[#A1A1AA]">
          Enter your email address to receive a password reset link
        </p>

        {sent ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl bg-[#121212] p-6 text-center border border-[#1C1C1E]">
            <CheckCircle className="h-12 w-12 text-[#10B981]" />
            <h3 className="mt-3 text-base font-semibold text-white">Email Sent!</h3>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Check your email for reset link instructions to recover your MaxPlay account.
            </p>
            <div className="mt-6 w-full">
              <GradientButton title="Back to Sign In" onPress={onBack} fullWidth />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="relative flex h-[52px] items-center rounded-xl bg-[#1C1C1E] px-4">
              <Mail className="h-5 w-5 text-[#6B7280]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="ml-3 flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] outline-none"
              />
            </div>

            <div className="mt-2">
              <GradientButton
                title={loading ? 'Sending link...' : 'Reset Password'}
                size="lg"
                fullWidth
                disabled={loading}
              />
            </div>
          </form>
        )}
      </div>

      <div className="py-4 text-center">
        <p className="text-xs text-[#6B7280]">MaxPlay Secure Authentication System</p>
      </div>
    </div>
  );
};
