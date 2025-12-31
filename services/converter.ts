
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();
// Queue to serialize conversions, preventing memory exhaustion (OOM)
let conversionQueue = Promise.resolve();

export const initFFmpeg = async () => {
  if (ffmpeg.loaded) return;
  
  // Check browser environment for WASM compatibility
  // In Electron, we set the headers in main.ts, so this should pass.
  if (!window.crossOriginIsolated) {
    console.warn("Browser not Cross-Origin Isolated. FFmpeg WASM might be slower or fail to use threads.");
  }

  // NOTE: For a fully offline Electron app, you should download these files,
  // place them in the 'public' folder, and point to them like: './ffmpeg-core.js'
  // For now, we keep the CDN for ease of setup, but it requires internet.
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
  
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  } catch (error) {
    console.error("Failed to load FFmpeg:", error);
    throw new Error("FFmpeg load failed: " + (error instanceof Error ? error.message : "Unknown error"));
  }
};

export const convertMkvToMp4 = (
  file: Blob, 
  onProgress: (progress: number) => void
): Promise<Blob> => {
  const task = async () => {
    try {
      await initFFmpeg();

      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });

      const inputName = 'input.mkv';
      const outputName = 'output.mp4';

      // Write the file to FFmpeg's virtual file system
      // fetchFile handles Blob -> Uint8Array conversion
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Performance Optimization for Electron / Desktop:
      // 1. -c:v copy: Direct stream copy for video (no re-encoding), near instant.
      // 2. -preset ultrafast: Use fastest algorithms for audio encoding.
      // 3. -threads 0: Use all available CPU cores (requires SharedArrayBuffer support in Electron).
      // 4. -bufsize: Manage rate control buffer to prevent stalls.
      await ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'copy',           // Video pass-through (Fastest)
        '-c:a', 'aac',            // Transcode audio
        '-ac', '2',               // Force stereo
        '-ar', '44100',           // Standard sample rate
        '-b:a', '128k',           // 128k is sufficient for speech, faster to encode than default
        '-threads', '0',          // Enable multi-threading
        '-preset', 'ultrafast',   // Sacrifice tiny bit of compression for max speed
        '-movflags', '+faststart',// Optimize MP4 container structure
        '-bufsize', '4M',         // Optimize encoding buffer
        outputName
      ]);

      // Read the result
      const data = await ffmpeg.readFile(outputName);

      // Return as Blob
      return new Blob([data], { type: 'video/mp4' });
    } catch (e) {
      console.warn("Conversion skipped/failed:", e);
      throw e;
    } finally {
      // Aggressive Cleanup for Memory Management in Renderer Process
      if (ffmpeg.loaded) {
          try {
            await ffmpeg.deleteFile('input.mkv');
            await ffmpeg.deleteFile('output.mp4');
          } catch (e) {
            // Ignore cleanup errors
          }
      }
    }
  };

  // Append task to queue
  const result = conversionQueue.then(task);
  conversionQueue = result.then(() => {}).catch(() => {});
  
  return result;
};