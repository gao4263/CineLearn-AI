import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

export const initFFmpeg = async () => {
  if (ffmpeg.loaded) return;
  
  // Use version matching the package.json/importmap to avoid compatibility issues
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
};

export const convertMkvToMp4 = async (
  file: File, 
  onProgress: (progress: number) => void
): Promise<Blob> => {
  await initFFmpeg();

  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.round(progress * 100));
  });

  const inputName = 'input.mkv';
  const outputName = 'output.mp4';

  try {
    // Write the file to FFmpeg's virtual file system
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Run FFmpeg command
    // -i input.mkv: Input file
    // -c:v copy: Copy video stream (remuxing is much faster than transcoding)
    // -c:a aac: Convert audio to AAC (ensure browser compatibility)
    await ffmpeg.exec(['-i', inputName, '-c:v', 'copy', '-c:a', 'aac', outputName]);

    // Read the result
    const data = await ffmpeg.readFile(outputName);

    // Return as Blob
    return new Blob([data], { type: 'video/mp4' });
  } catch (e) {
    console.error("Conversion error", e);
    throw new Error("Failed to convert video");
  } finally {
    // Clean up files from memory to prevent leaks
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (e) {
      // Ignore cleanup errors if files don't exist
    }
  }
};