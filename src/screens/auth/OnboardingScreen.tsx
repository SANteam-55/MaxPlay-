import React, { useState } from 'react';
import { GradientButton } from '../../components/common/GradientButton';
import { Film, Download, Globe } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: <Film className="h-16 w-16 text-[#A78BFA]" />,
    title: 'Discover Amazing Content',
    description: 'Browse thousands of movies, TV shows, and anime in multiple languages.',
  },
  {
    icon: <Download className="h-16 w-16 text-[#06B6D4]" />,
    title: 'Download & Watch Offline',
    description: 'Save your favorites and watch anytime, anywhere without internet.',
  },
  {
    icon: <Globe className="h-16 w-16 text-[#10B981]" />,
    title: 'Multiple Languages & Subtitles',
    description: 'Watch in your language with customizable multi-dubbing and subtitles.',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const handleNext = () => {
    if (activeSlide < SLIDES.length - 1) {
      setActiveSlide((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="flex h-full w-full flex-col justify-between bg-[#0A0A0A] p-6 text-center select-none">
      {/* Top row */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onComplete}
          className="text-sm font-medium text-[#6B7280] hover:text-white transition cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* Slide Content */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="flex h-48 w-48 items-center justify-center rounded-3xl bg-gradient-to-br from-[#7C3AED]/20 to-[#06B6D4]/20 border border-[#1C1C1E] shadow-2xl">
          {SLIDES[activeSlide].icon}
        </div>

        <h2 className="mt-8 text-2xl font-bold text-white px-4">
          {SLIDES[activeSlide].title}
        </h2>
        <p className="mt-3 text-sm text-[#A1A1AA] max-w-xs leading-relaxed">
          {SLIDES[activeSlide].description}
        </p>
      </div>

      {/* Bottom pagination & button */}
      <div className="flex flex-col items-center pb-6">
        {/* Dots */}
        <div className="mb-6 flex gap-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeSlide
                  ? 'w-6 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]'
                  : 'w-2 bg-[#1C1C1E]'
              }`}
            />
          ))}
        </div>

        <GradientButton
          title={activeSlide === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          onPress={handleNext}
          size="lg"
          fullWidth
        />
      </div>
    </div>
  );
};
