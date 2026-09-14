import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface NativeBannerProps {
  className?: string;
}

export const NativeBanner: React.FC<NativeBannerProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (user?.isPremium || !iframeRef.current) return;

    // Use a small delay to ensure iframe is ready in the DOM before writing to it
    const timer = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; padding: 0; overflow: hidden; display: flex; justify-content: center; align-items: center; background: transparent; }
              </style>
            </head>
            <body>
              <div id="container-06b7881a58031e798d9d74f29f7f7f86"></div>
              <script type="text/javascript" data-cfasync="false" src="https://pl31325139.profitableratecpmnetwork.com/06b7881a58031e798d9d74f29f7f7f86/invoke.js"></script>
            </body>
          </html>
        `);
        doc.close();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [user?.isPremium]);

  if (user?.isPremium) return null;

  return (
    <div className={`w-full flex justify-center items-center overflow-hidden my-2 min-h-[60px] ${className}`}>
      <iframe
        ref={iframeRef}
        title="Advertisement"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{ width: '100%', height: '90px', border: 'none', overflow: 'hidden' }}
        scrolling="no"
      />
    </div>
  );
};


