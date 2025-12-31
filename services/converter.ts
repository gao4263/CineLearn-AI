
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();
let conversionQueue = Promise.resolve();

export const initFFmpeg = async () => {
  if (ffmpeg.loaded) return;
  
  // Check browser environment for WASM compatibility
  if (!window.crossOriginIsolated) {
    throw new Error("Browser not Cross-Origin Isolated. FFmpeg WASM cannot run. Video will try to play directly.");
  }

  // Use version matching the package.json/importmap to avoid compatibility issues
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
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Run FFmpeg command
      // -c:v copy: Copy video stream (remuxing is much faster than transcoding)
      // -c:a aac: Convert audio to AAC (often needed for browser playback)
      await ffmpeg.exec(['-i', inputName, '-c:v', 'copy', '-c:a', 'aac', '-ac', '2', outputName]);

      // Read the result
      const data = await ffmpeg.readFile(outputName);

      // Return as Blob
      return new Blob([data], { type: 'video/mp4' });
    } catch (e) {
      console.warn("Conversion skipped/failed:", e);
      // Re-throw to let App.tsx handle the fallback
      throw e;
    } finally {
      // Clean up files
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

  // Chain the task to the queue
  const result = conversionQueue.then(task);
  
  // Update the queue to wait for this task
  conversionQueue = result.then(() => {}).catch(() => {});
  
  return result;
};
