import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const ffmpeg = process.env.FFMPEG_PATH || (require('ffmpeg-static') as string | null);
export const ffprobe = process.env.FFPROBE_PATH ? {path:process.env.FFPROBE_PATH} : require('ffprobe-static') as { path: string };
