import { useEffect, useMemo, useState } from 'react';

interface TextViewerProps {
  file: File;
}

export function TextViewer({ file }: TextViewerProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isFormattedJson, setIsFormattedJson] = useState<boolean>(false);

  const isJson = file.name.toLowerCase().endsWith('.json');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const text = await file.text();
        if (!active) return;
        setContent(text);

        if (isJson) {
          try {
            const parsed = JSON.parse(text);
            setContent(JSON.stringify(parsed, null, 2));
            setIsFormattedJson(true);
          } catch {
            // keep raw text
          }
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : 'Gagal membaca berkas teks.'
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [file, isJson]);

  const lines = useMemo(() => {
    return content.split(/\r?\n/);
  }, [content]);

  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleToggleFormatJson = () => {
    if (!isJson) return;
    try {
      if (isFormattedJson) {
        const parsed = JSON.parse(content);
        setContent(JSON.stringify(parsed));
        setIsFormattedJson(false);
      } else {
        const parsed = JSON.parse(content);
        setContent(JSON.stringify(parsed, null, 2));
        setIsFormattedJson(true);
      }
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <svg
          className="size-8 animate-spin text-indigo-600 mb-3"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium">Membaca berkas teks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-3 border border-rose-100">
          <svg
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 7.5h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-slate-800">Gagal Membaca Teks</h4>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Text Info Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            <span className="font-bold text-slate-900">{lines.length}</span> Baris
          </span>
          <span>•</span>
          <span>
            <span className="font-bold text-slate-900">{wordCount.toLocaleString()}</span> Kata
          </span>
          <span>•</span>
          <span>
            <span className="font-bold text-slate-900">{content.length.toLocaleString()}</span> Karakter
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isJson && (
            <button
              type="button"
              onClick={handleToggleFormatJson}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              {isFormattedJson ? 'Kompak (Minify)' : 'Format Rapi (Prettify)'}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            {isCopied ? 'Tersalin!' : 'Salin Teks'}
          </button>
        </div>
      </div>

      {/* Code Editor Style Viewport with Line Numbers */}
      <div className="flex-1 overflow-auto bg-slate-900 font-mono text-xs text-slate-200 p-4 leading-relaxed">
        <div className="flex min-w-full">
          {/* Line Numbers Gutter */}
          <div className="select-none pr-4 text-right text-slate-600 font-mono text-[11px]">
            {lines.map((_, idx) => (
              <div key={idx} className="h-5 leading-5">
                {idx + 1}
              </div>
            ))}
          </div>

          {/* Code Text Content */}
          <div className="flex-1 overflow-x-auto whitespace-pre font-mono">
            {lines.map((line, idx) => (
              <div key={idx} className="h-5 leading-5 text-slate-100">
                {line || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
