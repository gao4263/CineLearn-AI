
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();
let conversionQueue = Promise.resolve();

export const initFFmpeg = async () => {
  if (ffmpeg.loaded) return;
  
  // Use version matching the package.json/importmap to avoid compatibility issues
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
  
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  } catch (error) {
    console.error("Failed to load FFmpeg:", error);
    throw error;
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
      // -i input.mkv: Input file
      // -c:v copy: Copy video stream (remuxing is much faster than transcoding)
      // -c:a aac: Convert audio to AAC
      // -ac 2: Downmix to Stereo (Fixes 5.1 channel silence issues in browsers)
      await ffmpeg.exec(['-i', inputName, '-c:v', 'copy', '-c:a', 'aac', '-ac', '2', outputName]);

      // Read the result
      const data = await ffmpeg.readFile(outputName);

      // Return as Blob
      return new Blob([data], { type: 'video/mp4' });
    } catch (e) {
      console.error("Conversion error details:", e);
      throw new Error("Failed to convert video: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      // Clean up files from memory to prevent leaks
      try {
        await ffmpeg.deleteFile('input.mkv');
        await ffmpeg.deleteFile('output.mp4');
      } catch (e) {
        // Ignore cleanup errors if files don't exist
      }
    }
  };

  // Chain the task to the queue
  const result = conversionQueue.then(task);
  
  // Update the queue to wait for this task (ignoring errors so queue persists)
  conversionQueue = result.then(() => {}).catch(() => {});
  
  return result;
};
