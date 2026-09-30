import { useEffect, useMemo, useState } from 'react';

interface CsvViewerProps {
  file: File;
}

export function CsvViewer({ file }: CsvViewerProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rowLimit, setRowLimit] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const text = await file.text();
        const parsedLines: string[][] = [];

        // RFC-4180 CSV line parser handling quotes, escaped quotes, and commas
        const lines = text.split(/\r?\n/);

        for (const line of lines) {
          if (!line.trim()) continue;
          const row: string[] = [];
          let current = '';
          let insideQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (insideQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                insideQuotes = !insideQuotes;
              }
            } else if (char === ',' && !insideQuotes) {
              row.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          row.push(current.trim());
          parsedLines.push(row);
        }

        if (!active) return;
        if (parsedLines.length > 0) {
          setHeaders(parsedLines[0]);
          setRows(parsedLines.slice(1));
        } else {
          setHeaders([]);
          setRows([]);
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : 'Gagal membaca berkas CSV.'
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [file]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const displayedRows = useMemo(() => {
    return filteredRows.slice(0, rowLimit);
  }, [filteredRows, rowLimit]);

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
        <span className="text-sm font-medium">Membaca tabel CSV...</span>
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
        <h4 className="text-sm font-bold text-slate-800">Gagal Membaca CSV</h4>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 text-xs">
        {/* Search Filter */}
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <input
            type="text"
            placeholder="Cari data dalam tabel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
          <svg
            className="absolute left-2.5 top-2 size-3.5 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>

        {/* Stats and Row Limit Selector */}
        <div className="flex items-center gap-3 text-slate-600">
          <span>
            Total: <span className="font-bold text-slate-900">{rows.length}</span> baris,{' '}
            <span className="font-bold text-slate-900">{headers.length}</span> kolom
          </span>

          <div className="flex items-center gap-1.5">
            <label htmlFor="csv-row-limit" className="text-slate-400">
              Tampilkan:
            </label>
            <select
              id="csv-row-limit"
              value={rowLimit}
              onChange={(e) => setRowLimit(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white py-1 px-2 text-xs text-slate-700 focus:outline-none"
            >
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
              <option value={200}>200 baris</option>
              <option value={500}>500 baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Data Container */}
      <div className="flex-1 overflow-auto bg-slate-100/60 p-3 sm:p-4">
        <div className="h-full w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-xs">
            {headers.length > 0 && (
              <thead className="sticky top-0 bg-slate-100 font-semibold text-slate-700 border-b border-slate-200 z-10 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-slate-400 font-mono text-[10px] text-center border-r border-slate-200">
                    #
                  </th>
                  {headers.map((h, idx) => (
                    <th
                      key={idx}
                      className="py-2.5 px-3 border-r border-slate-200 last:border-r-0 truncate max-w-[220px]"
                    >
                      {h || `Kolom ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100">
              {displayedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(headers.length + 1, 1)}
                    className="p-8 text-center text-slate-400 italic"
                  >
                    {searchQuery
                      ? 'Tidak ada baris data yang cocok dengan pencarian.'
                      : 'File CSV ini tidak memiliki data.'}
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-400 bg-slate-50/50 text-center border-r border-slate-100">
                      {rowIdx + 1}
                    </td>
                    {headers.map((_, colIdx) => (
                      <td
                        key={colIdx}
                        className="py-2 px-3 text-slate-700 border-r border-slate-100 last:border-r-0 truncate max-w-[220px]"
                        title={row[colIdx] || ''}
                      >
                        {row[colIdx] || ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
