import { Subtitle } from '../types';

export const timeStringToSeconds = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString.split(':');
  const [secs, ms] = seconds.split(',');
  return (
    parseInt(hours, 10) * 3600 +
    parseInt(minutes, 10) * 60 +
    parseInt(secs, 10) +
    parseInt(ms, 10) / 1000
  );
};

/**
 * Strips formatting tags from subtitle text.
 * Handles SSA/ASS style tags like {\...} and standard HTML tags like <i>...</i>
 */
const cleanSubtitleText = (text: string): string => {
  return text
    // Remove SSA/ASS style tags like {\fs16\an2\b0}
    .replace(/\{[^}]*\}/g, '') 
    // Remove HTML tags like <i> or <font>
    .replace(/<[^>]*>/g, '')   
    // Remove multiple spaces and trim
    .replace(/\s+/g, ' ')
    .trim();
};

export const parseSRT = (data: string): Subtitle[] => {
  const normalizedData = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Split by double newline or more to get blocks
  const blocks = normalizedData.trim().split(/\n\n+/);
  
  const subtitles: Subtitle[] = [];

  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      // Line 1: Index
      // Line 2: Timecode
      const timecodeLine = lines[1];
      const textLines = lines.slice(2);
      
      const timeMatch = timecodeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch) {
        // We preserve manual line breaks if they were intended for dual language
        // but we clean each line individually.
        const cleanedText = textLines
          .map(line => cleanSubtitleText(line))
          .filter(line => line.length > 0)
          .join('\n');

        if (cleanedText) {
          const startTime = timeStringToSeconds(timeMatch[1]);
          // Deterministic ID based on index and start time to ensure consistency across reloads
          // replacing . with - for simpler IDs
          const stableId = `sub-${index}_${startTime.toString().replace('.', '-')}`;
          
          subtitles.push({
            id: stableId,
            index: index + 1,
            startTime: startTime,
            endTime: timeStringToSeconds(timeMatch[2]),
            text: cleanedText,
          });
        }
      }
    }
  });

  return subtitles;
};