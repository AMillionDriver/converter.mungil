import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (errorCode?: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: string) => void;
  className?: string;
}

export function TurnstileWidget({
  siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
  onVerify,
  onExpire,
  onError,
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'verified' | 'error' | 'offline'>('loading');

  useEffect(() => {
    let isMounted = true;
    const SCRIPT_ID = 'cf-turnstile-script';

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Clean up previous widget instance if any
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore
        }
        widgetIdRef.current = null;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          size: 'normal',
          callback: (receivedToken: string) => {
            if (!isMounted) return;
            setToken(receivedToken);
            setStatus('verified');
            onVerify?.(receivedToken);
          },
          'error-callback': (err?: string) => {
            if (!isMounted) return;
            setStatus('error');
            onError?.(err);
          },
          'expired-callback': () => {
            if (!isMounted) return;
            setToken(null);
            setStatus('loading');
            onExpire?.();
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.warn('[Turnstile] Render error:', err);
        if (isMounted) setStatus('offline');
      }
    };

    // If script is already loaded and window.turnstile is available
    if (window.turnstile) {
      renderWidget();
      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore
          }
        }
      };
    }

    // Load Turnstile script dynamically
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
      script.async = true;
      script.defer = true;

      window.onloadTurnstileCallback = () => {
        if (isMounted) renderWidget();
      };

      script.onerror = () => {
        // Typically triggered by network drop or tracker blocker
        if (isMounted) setStatus('offline');
      };

      document.head.appendChild(script);
    } else {
      const prevCallback = window.onloadTurnstileCallback;
      window.onloadTurnstileCallback = () => {
        prevCallback?.();
        if (isMounted) renderWidget();
      };
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore
        }
      }
    };
  }, [siteKey, onVerify, onExpire, onError]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Cloudflare Turnstile Render Target */}
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />

      {/* Verified / Offline Status Badge */}
      {status === 'verified' && (
        <div className="mt-1.5 flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200/80 animate-in fade-in duration-200">
          <svg
            className="size-3 text-emerald-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span>Proteksi Bot Cloudflare Terverifikasi</span>
        </div>
      )}

      {status === 'offline' && (
        <div className="mt-1.5 flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
          <svg
            className="size-3 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
            />
          </svg>
          <span>Mode Konversi Lokal Aktif (Sandbox Browser)</span>
        </div>
      )}
    </div>
  );
}
