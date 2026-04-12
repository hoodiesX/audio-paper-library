import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/vnd.wave",
]);

const ALLOWED_EXTENSIONS = new Set([".mp3", ".m4a", ".wav"]);

export function isAllowedAudioFile(file: File) {
  const extension = path.extname(file.name).toLowerCase();

  return (
    ALLOWED_EXTENSIONS.has(extension) ||
    ALLOWED_AUDIO_TYPES.has(file.type.toLowerCase())
  );
}

export async function saveUploadedAudio(file: File) {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const extension = path.extname(file.name).toLowerCase() || ".mp3";
  const fileName = `${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(uploadsDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return `/uploads/${fileName}`;
}
