import { useEffect, useState } from 'react';
import * as fflate from 'fflate';

interface DocxViewerProps {
  file: File;
}

interface DocxParagraph {
  text: string;
  isHeading?: boolean;
}

export function DocxViewer({ file }: DocxViewerProps) {
  const [paragraphs, setParagraphs] = useState<DocxParagraph[]>([]);
  const [wordCount, setWordCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const buffer = await file.arrayBuffer();
        const unzipped = fflate.unzipSync(new Uint8Array(buffer));
        const docXmlBytes = unzipped['word/document.xml'];

        if (!docXmlBytes) {
          throw new Error('Berkas DOCX tidak memiliki entri word/document.xml.');
        }

        const docXml = fflate.strFromU8(docXmlBytes);
        const pTags = docXml.split(/<\/w:p>/i);
        const parsedParagraphs: DocxParagraph[] = [];
        let totalWords = 0;

        for (const p of pTags) {
          const textMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi);
          if (textMatches && textMatches.length > 0) {
            const rawText = textMatches
              .map((m) => m.replace(/<w:t[^>]*>/i, '').replace(/<\/w:t>/i, ''))
              .join('');

            const cleanText = rawText
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
              .trim();

            if (cleanText) {
              const words = cleanText.split(/\s+/).filter(Boolean);
              totalWords += words.length;

              const isHeading =
                p.includes('w:val="Heading') ||
                p.includes('w:val="Title') ||
                p.includes('w:val="Subtitle');

              parsedParagraphs.push({
                text: cleanText,
                isHeading,
              });
            }
          }
        }

        if (!active) return;
        setParagraphs(parsedParagraphs);
        setWordCount(totalWords);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal membaca isi dokumen Microsoft Word (.docx).'
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [file]);

  const handleCopy = async () => {
    const fullText = paragraphs.map((p) => p.text).join('\n\n');
    try {
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
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
        <span className="text-sm font-medium">Mengekstrak isi dokumen Word...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3 border border-amber-100">
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
        <h4 className="text-sm font-bold text-slate-800">Gagal Membaca Dokumen</h4>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Document Stats Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
            <span className="font-bold text-slate-900">{paragraphs.length}</span> Paragraf
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
            <span className="font-bold text-slate-900">{wordCount.toLocaleString()}</span> Kata
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          {isCopied ? 'Tersalin!' : 'Salin Semua Teks'}
        </button>
      </div>

      {/* Realistic Paper Sheet Layout */}
      <div className="flex-1 overflow-auto bg-slate-200/70 p-4 sm:p-8 flex justify-center items-start">
        <article className="w-full max-w-3xl min-h-[500px] rounded-lg bg-white p-6 sm:p-12 shadow-lg border border-slate-200/80 space-y-4 font-sans text-slate-800">
          {paragraphs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              Dokumen ini kosong (tidak ada teks di dalamnya).
            </div>
          ) : (
            paragraphs.map((p, idx) =>
              p.isHeading ? (
                <h3
                  key={idx}
                  className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1 pt-2"
                >
                  {p.text}
                </h3>
              ) : (
                <p key={idx} className="text-xs sm:text-sm leading-relaxed text-slate-700">
                  {p.text}
                </p>
              )
            )
          )}
        </article>
      </div>
    </div>
  );
}
