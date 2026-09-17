import React, { ReactNode } from 'react';
import { GRADIENTS, COLORS } from '../../utils/colors';

interface GradientButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  className = '',
  fullWidth = false,
  type = 'button',
}) => {
  let height = 'h-[44px]';
  let px = 'px-6';
  let fontSize = 'text-sm font-semibold';

  if (size === 'lg') {
    height = 'h-[52px]';
    px = 'px-8';
    fontSize = 'text-base font-semibold';
  } else if (size === 'sm') {
    height = 'h-[36px]';
    px = 'px-4';
    fontSize = 'text-xs font-semibold';
  }

  let bgStyle: React.CSSProperties = {
    background: GRADIENTS.primary,
  };

  if (variant === 'secondary') {
    bgStyle = { background: GRADIENTS.secondary };
  } else if (variant === 'outline') {
    bgStyle = {
      background: 'transparent',
      border: `1px solid ${COLORS.accentMid}`,
    };
  }

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      style={bgStyle}
      className={`relative inline-flex items-center justify-center rounded-full text-white cursor-pointer transition-all duration-200 active:scale-95 ${height} ${px} ${fontSize} ${
        disabled ? 'opacity-50 cursor-not-allowed active:scale-100' : 'hover:brightness-110'
      } ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {icon && <span className="mr-2 text-current flex items-center">{icon}</span>}
      <span>{title}</span>
    </button>
  );
};
