import React from 'react';
import { GRADIENTS } from '../../utils/colors';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  label: string;
  description?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onValueChange,
  label,
  description,
}) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex flex-col text-left pr-4">
        <span className="text-sm font-medium text-white">{label}</span>
        {description && (
          <span className="mt-0.5 text-xs text-[#6B7280]">{description}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onValueChange(!value)}
        style={{
          background: value ? GRADIENTS.primary : '#1C1C1E',
        }}
        className="relative h-[28px] w-[50px] flex-shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200"
      >
        <div
          className={`h-[20px] w-[20px] rounded-full bg-white shadow-md transition-transform duration-200 ${
            value ? 'translate-x-[22px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
