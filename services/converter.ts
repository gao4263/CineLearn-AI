import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

export const initFFmpeg = async () => {
  if (ffmpeg.loaded) return;
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
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

  // Write the file to FFmpeg's virtual file system
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Run FFmpeg command
  // -i input.mkv: Input file
  // -c:v copy: Copy video stream (remuxing is much faster than transcoding)
  // -c:a aac: Convert audio to AAC (ensure browser compatibility)
  // -strict experimental: Sometimes needed for aac
  try {
    // Attempt remux first with audio transcode if necessary
    await ffmpeg.exec(['-i', inputName, '-c:v', 'copy', '-c:a', 'aac', outputName]);
  } catch (e) {
    console.error("Conversion error", e);
    throw new Error("Failed to convert video");
  }

  // Read the result
  const data = await ffmpeg.readFile(outputName);

  // Clean up
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  // Return as Blob
  return new Blob([data], { type: 'video/mp4' });
};