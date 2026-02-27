type TextChunk = {
  chunkIndex: number;
  content: string;
  tokenCount: number;
};

function decodePdfEscapes(input: string): string {
  return input
    .replace(/\\([nrtbf()\\])/g, (_, c: string) => {
      if (c === 'n') return '\n';
      if (c === 'r') return '\r';
      if (c === 't') return '\t';
      if (c === 'b') return '\b';
      if (c === 'f') return '\f';
      return c;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
}

function extractFromTextBlocks(source: string): string[] {
  const blocks = source.match(/BT[\s\S]*?ET/g) ?? [];
  const parts: string[] = [];

  for (const block of blocks) {
    const literalMatches = block.match(/\((?:\\.|[^\\)])*\)/g) ?? [];
    for (const literal of literalMatches) {
      const decoded = decodePdfEscapes(literal.slice(1, -1)).trim();
      if (decoded) parts.push(decoded);
    }
  }

  return parts;
}

function fallbackPrintableText(source: string): string[] {
  return (source.match(/[A-Za-z0-9][A-Za-z0-9,.;:!?'"()\- ]{20,}/g) ?? [])
    .map((segment) => segment.trim());
}

export function extractTextFromPdf(pdfBuffer: Buffer): string {
  const raw = pdfBuffer.toString('latin1');
  const parts = extractFromTextBlocks(raw);
  const merged = (parts.length > 0 ? parts : fallbackPrintableText(raw)).join(' ');

  return merged
    .replace(/\s+/g, ' ')
    .replace(/ ?([,.;:!?]) ?/g, '$1 ')
    .trim();
}

export function chunkText(content: string, chunkChars = 1200, overlapChars = 200): TextChunk[] {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const chunks: TextChunk[] = [];
  let cursor = 0;
  let chunkIndex = 0;

  while (cursor < normalized.length) {
    const maxEnd = Math.min(cursor + chunkChars, normalized.length);
    let end = maxEnd;

    if (maxEnd < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf('. ', maxEnd);
      if (paragraphBreak > cursor + Math.floor(chunkChars * 0.5)) {
        end = paragraphBreak + 1;
      }
    }

    const slice = normalized.slice(cursor, end).trim();
    if (slice) {
      chunks.push({
        chunkIndex,
        content: slice,
        tokenCount: slice.split(/\s+/).length,
      });
      chunkIndex += 1;
    }

    if (end >= normalized.length) break;
    cursor = Math.max(0, end - overlapChars);
  }

  return chunks;
}
