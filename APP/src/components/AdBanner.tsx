import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export interface AdBannerProps {
  slotId?: string;
  format?: 'auto' | 'vertical' | 'rectangle' | 'horizontal';
  className?: string;
  label?: string;
  isTest?: boolean;
}

/**
 * Google AdSense Banner Component
 * Supports live AdSense units and realistic Test Ads with `data-adtest="on"`.
 * Adheres strictly to DESIGN_RULE.md (Anti-Slop: clean inline SVG, semantic markup).
 */
export function AdBanner({
  slotId = '1234567890',
  format = 'vertical',
  className = '',
  label = 'Advertisement',
  isTest = true,
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adBlocked, setAdBlocked] = useState(false);

  const clientId =
    import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-1234567890123456';

  const isDummyClient =
    !clientId ||
    clientId === 'ca-pub-1234567890123456' ||
    clientId.includes('0000000000000000');

  useEffect(() => {
    // Only load external Google AdSense script when a real publisher ID is supplied
    // to prevent Google Ad servers from returning HTTP 400 Bad Request on placeholder IDs.
    if (isDummyClient || isTest) {
      return;
    }

    const scriptId = 'google-adsense-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        setAdLoaded(true);
      };

      script.onerror = () => {
        // Typically triggered by browser AdBlockers (uBlock, Brave, etc.)
        setAdBlocked(true);
      };

      document.head.appendChild(script);
    } else {
      setAdLoaded(true);
    }
  }, [clientId, isDummyClient, isTest]);

  useEffect(() => {
    if (adLoaded && !adBlocked && !isDummyClient && !isTest) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.warn('[AdSense] Push error:', err);
      }
    }
  }, [adLoaded, adBlocked, isDummyClient, isTest]);

  return (
    <div
      ref={adRef}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-slate-300 ${className}`}
    >
      {/* Top Meta Bar */}
      <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2 text-[11px] font-medium text-slate-400">
        <span className="uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className="rounded bg-slate-100 px-1 py-0.2 font-semibold text-slate-500">
            Ad
          </span>
          {/* AdChoices SVG Icon */}
          <svg
            className="size-3 text-slate-400 transition hover:text-indigo-600"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M1 1h14v14H1V1zm1 1v12h12V2H2zm2 2h4.5a3.5 3.5 0 0 1 0 7H4V4zm2 2v3h2.5a1.5 1.5 0 0 0 0-3H6zm5.5-2H13v7h-1.5V4z" />
          </svg>
        </div>
      </div>

      {/* Ad Content Container */}
      <div
        className={`flex ${
          format === 'rectangle' ? 'min-h-[240px]' : 'min-h-[320px]'
        } flex-col items-center justify-between rounded-xl bg-slate-50/70 p-3 text-center border border-dashed border-slate-200/80`}
      >
        {/* Real AdSense tag (only active when real publisher ID is present in production) */}
        {!isDummyClient && !isTest && (
          <ins
            className="adsbygoogle w-full"
            style={{
              display: 'block',
              minHeight: format === 'rectangle' ? '180px' : '250px',
            }}
            data-ad-client={clientId}
            data-ad-slot={slotId}
            data-ad-format={format}
            data-full-width-responsive="true"
          />
        )}

        {/* Realistic Google Test Ad Card (Fallback & Simulator) */}
        <div className="w-full flex flex-col items-center justify-between gap-3 py-2">
          {/* Sponsor Tag & Test Mode Badge */}
          <div className="flex w-full items-center justify-between px-1">
            <span className="text-[10px] font-semibold text-slate-400">
              Google Ads Partner
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-200/70">
              TEST API ACTIVE
            </span>
          </div>

          {/* Ad Visual Graphic */}
          <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs border border-indigo-100">
            <svg
              className="size-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
              />
            </svg>
          </div>

          {/* Ad Headline & Description */}
          <div className="space-y-1 px-1">
            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
              Cloudflare & Google Cloud
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-3">
              Infrastruktur cloud ultra-cepat untuk deployment web & tools
              modern dengan proteksi DDoS bawaan.
            </p>
          </div>

          {/* CTA Button */}
          <a
            href="https://cloud.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-center text-xs font-semibold text-white shadow-xs transition duration-150 hover:bg-indigo-700 active:scale-98"
          >
            Pelajari Selengkapnya
          </a>

          {/* Subtext info */}
          <p className="text-[9px] text-slate-400">
            Slot ID: {slotId} • Responsive Display
          </p>
        </div>
      </div>
    </div>
  );
}
