/**
 * PDF Table Extractor & Spatial Content Analyzer
 *
 * Analyzes PDF text token coordinates (X, Y) to detect multi-column table
 * structures and distinguish them from standard text paragraphs.
 */

export interface TextToken {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  colWidthsPt: number[];
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface PageContentBlock {
  type: 'paragraph' | 'table';
  text?: string;
  table?: ExtractedTable;
}

export class PdfTableExtractor {
  /**
   * Analyzes an array of text tokens from a PDF page and groups them into
   * sequential blocks of either paragraphs or reconstructed tables.
   */
  static analyzePageBlocks(tokens: TextToken[]): PageContentBlock[] {
    if (tokens.length === 0) return [];

    // 1. Group tokens into horizontal visual lines based on baseline Y
    const visualLines: { y: number; height: number; tokens: TextToken[] }[] = [];

    // Sort tokens by Y descending (top-to-bottom in PDF coordinate space)
    const sortedTokens = [...tokens].sort((a, b) => b.y - a.y);

    for (const token of sortedTokens) {
      const h = Math.abs(token.height) || 10;
      const lastLine = visualLines[visualLines.length - 1];

      if (lastLine && Math.abs(lastLine.y - token.y) <= Math.max(lastLine.height, h) * 0.4) {
        lastLine.tokens.push(token);
        continue;
      }

      // Check nearby lines
      let matched = false;
      const lookback = Math.max(0, visualLines.length - 8);
      for (let i = visualLines.length - 2; i >= lookback; i--) {
        const line = visualLines[i];
        if (Math.abs(line.y - token.y) <= Math.max(line.height, h) * 0.4) {
          line.tokens.push(token);
          matched = true;
          break;
        }
      }
      if (matched) continue;

      visualLines.push({ y: token.y, height: h, tokens: [token] });
    }

    // Sort lines top to bottom (Y descending)
    visualLines.sort((a, b) => b.y - a.y);

    // Sort tokens within each line left to right (X ascending)
    for (const line of visualLines) {
      line.tokens.sort((a, b) => a.x - b.x);
    }

    // 2. Identify multi-column lines (candidate table rows)
    // A line is a table row candidate if it has multiple tokens separated by distinct horizontal gaps
    interface AnalyzedLine {
      y: number;
      height: number;
      rawText: string;
      cells: { text: string; x: number; width: number }[];
      isTableCandidate: boolean;
    }

    const analyzedLines: AnalyzedLine[] = visualLines.map((line) => {
      const cells: { text: string; x: number; width: number }[] = [];
      let currentCellText = '';
      let cellStartX = 0;
      let lastXEnd: number | null = null;

      for (const t of line.tokens) {
        if (lastXEnd === null) {
          cellStartX = t.x;
          currentCellText = t.str;
          lastXEnd = t.x + (t.width || 0);
        } else {
          const gap = t.x - lastXEnd;
          // A gap > 18 pt typically indicates a column separator rather than a simple word space
          if (gap > 18) {
            cells.push({
              text: currentCellText.trim(),
              x: cellStartX,
              width: lastXEnd - cellStartX,
            });
            cellStartX = t.x;
            currentCellText = t.str;
          } else {
            if (gap > 2 && !currentCellText.endsWith(' ') && !t.str.startsWith(' ')) {
              currentCellText += ' ';
            }
            currentCellText += t.str;
          }
          lastXEnd = t.x + (t.width || 0);
        }
      }

      if (currentCellText) {
        cells.push({
          text: currentCellText.trim(),
          x: cellStartX,
          width: (lastXEnd ?? cellStartX) - cellStartX,
        });
      }

      const fullLineText = cells.map((c) => c.text).join(' ');
      // Line is a candidate if it has >= 2 cells with non-empty content
      const validCells = cells.filter((c) => c.text.length > 0);
      const isTableCandidate = validCells.length >= 2;

      return {
        y: line.y,
        height: line.height,
        rawText: fullLineText,
        cells: validCells,
        isTableCandidate,
      };
    });

    // 3. Cluster contiguous candidate lines into tables
    const blocks: PageContentBlock[] = [];
    let i = 0;

    while (i < analyzedLines.length) {
      if (analyzedLines[i].isTableCandidate) {
        // Look ahead to see if there are at least 2 consecutive candidate lines
        let j = i;
        while (j < analyzedLines.length && analyzedLines[j].isTableCandidate) {
          j++;
        }

        const candidateRowCount = j - i;
        if (candidateRowCount >= 2) {
          // Reconstruct table from lines i to j-1
          const tableLines = analyzedLines.slice(i, j);
          const table = this.reconstructTableGrid(tableLines);
          if (table && table.headers.length >= 2 && table.rows.length >= 1) {
            blocks.push({ type: 'table', table });
            i = j;
            continue;
          }
        }
      }

      // Default: emit as paragraph
      if (analyzedLines[i].rawText.trim()) {
        blocks.push({
          type: 'paragraph',
          text: analyzedLines[i].rawText.trim(),
        });
      }
      i++;
    }

    return blocks;
  }

  /**
   * Reconstructs aligned headers and rows from candidate table lines
   */
  private static reconstructTableGrid(
    tableLines: {
      y: number;
      cells: { text: string; x: number; width: number }[];
    }[]
  ): ExtractedTable | null {
    if (tableLines.length === 0) return null;

    // Determine the global column boundary anchor positions across all rows
    const allX = tableLines.flatMap((l) => l.cells.map((c) => c.x));
    if (allX.length === 0) return null;

    // Cluster X coordinates that are within 25 pt of each other
    const sortedX = [...allX].sort((a, b) => a - b);
    const colAnchors: number[] = [];

    for (const x of sortedX) {
      const existing = colAnchors.find((anchor) => Math.abs(anchor - x) <= 25);
      if (existing === undefined) {
        colAnchors.push(x);
      }
    }
    colAnchors.sort((a, b) => a - b);

    if (colAnchors.length < 2) return null;

    // Map each row's cells into the matching column anchor
    const tableRows: string[][] = [];

    for (const line of tableLines) {
      const row = new Array<string>(colAnchors.length).fill('');

      for (const cell of line.cells) {
        // Find closest column anchor
        let closestIdx = 0;
        let minDist = Infinity;
        for (let aIdx = 0; aIdx < colAnchors.length; aIdx++) {
          const dist = Math.abs(colAnchors[aIdx] - cell.x);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = aIdx;
          }
        }

        if (row[closestIdx]) {
          row[closestIdx] += ' ' + cell.text;
        } else {
          row[closestIdx] = cell.text;
        }
      }

      tableRows.push(row);
    }

    if (tableRows.length < 2) return null;

    const headers = tableRows[0];
    const rows = tableRows.slice(1);

    // Calculate approximate column widths in points
    const colWidthsPt: number[] = [];
    for (let c = 0; c < colAnchors.length; c++) {
      const nextX = colAnchors[c + 1] ?? (colAnchors[c] + 120);
      colWidthsPt.push(Math.max(50, nextX - colAnchors[c]));
    }

    const minY = tableLines[tableLines.length - 1].y;
    const maxY = tableLines[0].y;
    const minX = colAnchors[0];
    const maxX = colAnchors[colAnchors.length - 1] + (colWidthsPt[colWidthsPt.length - 1] || 100);

    return {
      headers,
      rows,
      colWidthsPt,
      bbox: { minX, maxX, minY, maxY },
    };
  }
}
