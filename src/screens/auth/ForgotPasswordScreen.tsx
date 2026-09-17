import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { LogoPlaceholder } from '../../components/common/LogoPlaceholder';
import { GradientButton } from '../../components/common/GradientButton';
import { useAuth } from '../../hooks/useAuth';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(cleanEmail);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-y-auto bg-[#0A0A0A] p-6 text-left">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white pt-2 cursor-pointer transition-colors"
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
          Enter your registered email address to receive a secure password reset link
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl bg-[#121212] p-6 text-center border border-[#1C1C1E]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#10B981]/10 text-[#10B981]">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-white">Reset Link Sent!</h3>
            <p className="mt-2 text-xs text-[#A1A1AA] leading-relaxed">
              We have sent password reset instructions from <span className="font-semibold text-white">noreply</span> to <span className="text-white font-medium">{email}</span>. Please check your Inbox, Promotions, or Spam folders if you don't see it.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 w-full">
              <GradientButton title="Back to Sign In" onPress={onBack} fullWidth />
              
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setError('');
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try another email or resend</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="relative flex h-[52px] items-center rounded-xl bg-[#1C1C1E] px-4">
              <Mail className="h-5 w-5 text-[#6B7280]" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your registered email"
                required
                className="ml-3 flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] outline-none"
              />
            </div>

            <div className="mt-2">
              <GradientButton
                type="submit"
                title={loading ? 'Sending link...' : 'Send Reset Link'}
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
