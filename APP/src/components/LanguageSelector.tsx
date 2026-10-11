import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LanguageOption } from '../i18n/config';

interface LanguageSelectorProps {
  onLanguageChangeStart?: () => void;
  className?: string;
  isMobileInline?: boolean;
}

export function LanguageSelector({
  onLanguageChangeStart,
  className = '',
  isMobileInline = false,
}: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentCode = (i18n.language || 'id').split('-')[0];
  const currentLang =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === currentCode) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = async (lang: LanguageOption) => {
    if (lang.code === currentCode) {
      setIsOpen(false);
      return;
    }

    if (onLanguageChangeStart) {
      onLanguageChangeStart();
    }
    await i18n.changeLanguage(lang.code);
    try {
      localStorage.setItem('mungil_lang', lang.code);
    } catch {
      // Ignore localStorage exceptions in sandboxed environments
    }
    setIsOpen(false);
  };

  // If mobile inline list is requested
  if (isMobileInline) {
    return (
      <div className="grid grid-cols-2 gap-1.5 py-1">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = lang.code === currentCode;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang)}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                isSelected
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{lang.label}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {lang.flag}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Pilih bahasa tampilan"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1 transition cursor-pointer"
      >
        <svg
          className="size-3.5 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-3 4-6.5 4-9s-1.5-6-4-9m0 18c-2.5-3-4-6.5-4-9s1.5-6 4-9m-8.5 9h17"
          />
        </svg>
        <span className="font-semibold text-slate-800">{currentLang.flag}</span>
        <svg
          className={`size-3 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Bahasa / Language
          </div>
          <div className="grid gap-0.5 max-h-60 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentCode;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 font-semibold text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{lang.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {lang.flag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
