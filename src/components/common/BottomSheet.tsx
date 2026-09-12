import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative z-10 w-full max-w-lg rounded-t-2xl bg-[#121212] p-5 shadow-2xl border-t border-[#1C1C1E] max-h-[85vh] overflow-y-auto"
          >
            {/* Handle bar */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#3F3F46]" />

            {title && (
              <h2 className="mb-4 text-center text-lg font-semibold text-white">
                {title}
              </h2>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
