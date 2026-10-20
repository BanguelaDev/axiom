import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const ffmpeg = require('ffmpeg-static') as string | null;
export const ffprobe = require('ffprobe-static') as { path: string };
