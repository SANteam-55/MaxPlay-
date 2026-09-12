import React, { ReactNode } from 'react';
import { GradientButton } from './GradientButton';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionTitle,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4 text-[#6B7280]">{icon}</div>}
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-[#A1A1AA]">{message}</p>
      {actionTitle && onAction && (
        <div className="mt-6">
          <GradientButton title={actionTitle} onPress={onAction} size="md" />
        </div>
      )}
    </div>
  );
};
