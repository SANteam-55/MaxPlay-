import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const SocialBar: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.isPremium) return;

    const scriptSrc = 'https://pl31325137.profitableratecpmnetwork.com/81/ac/66/81ac6627507d01959c375d965a70e2d2.js';
    
    // Remove existing script instance if present so it can re-initiate cleanly on Me tab visit
    const existing = document.querySelector(`script[src="${scriptSrc}"]`);
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.type = 'text/javascript';
    document.body.appendChild(script);

    return () => {
      // Keep running or let clean up
    };
  }, [user?.isPremium]);

  return null;
};


