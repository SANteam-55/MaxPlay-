import React from 'react';
import { Search, X, Mic } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = 'Search movies, TV shows, anime...',
  autoFocus = false,
}) => {
  return (
    <div className="relative flex h-[48px] w-full items-center rounded-full bg-[#1C1C1E] px-4 shadow-sm">
      <Search className="h-5 w-5 text-[#6B7280] flex-shrink-0" />
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSubmit?.();
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="ml-3 flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] outline-none"
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            onChangeText('');
            onClear?.();
          }}
          className="p-1 text-[#6B7280] hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};
