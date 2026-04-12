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

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? `.${parts.pop()}` : "";
}

export function isAllowedAudioFile(file: File) {
  const extension = getFileExtension(file.name);

  return (
    ALLOWED_EXTENSIONS.has(extension) ||
    ALLOWED_AUDIO_TYPES.has(file.type.toLowerCase())
  );
}

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function createAudioStorageKey(title: string, fileName: string) {
  const extension = getFileExtension(fileName) || ".mp3";
  const safeTitle = slugifySegment(title) || "audio";

  return `audio/${safeTitle}-${crypto.randomUUID()}${extension}`;
}
