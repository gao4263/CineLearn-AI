export type ParsedMetadata = {
  showName: string;
  season?: string;
  episode?: string;
};

export const parseFilename = (filename: string): ParsedMetadata => {
  // Remove extension
  const cleanName = filename.replace(/\.[^/.]+$/, "");
  
  // Patterns like S01E01 (with optional E and optional space) or 1x01
  // Old regex had ( \d+) forcing a space capture. New regex: [E]?\s*(\d+)
  const sePattern = /(.*?)[ ._]S(\d+)[E]?\s*(\d+)/i;
  const xPattern = /(.*?)[ ._](\d+)x(\d+)/i;
  
  const seMatch = cleanName.match(sePattern);
  if (seMatch) {
    return {
      showName: seMatch[1].replace(/[._]/g, " ").trim(),
      season: `S${seMatch[2].padStart(2, '0')}`,
      episode: `E${seMatch[3].trim().padStart(2, '0')}`
    };
  }

  const xMatch = cleanName.match(xPattern);
  if (xMatch) {
    return {
      showName: xMatch[1].replace(/[._]/g, " ").trim(),
      season: `S${xMatch[2].padStart(2, '0')}`,
      episode: `E${xMatch[3].padStart(2, '0')}`
    };
  }

  return { showName: cleanName };
};