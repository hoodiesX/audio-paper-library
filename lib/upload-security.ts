import { query } from "@/lib/d1-client";

const MAX_AUDIO_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const TITLE_MAX_LENGTH = 120;
const TOPIC_MAX_LENGTH = 60;
const COURSE_MAX_LENGTH = 80;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type RateLimitResult =
  | { allowed: true; ip: string; nowIso: string }
  | { allowed: false; message: string };

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export type UploadRuntimeEnv = {
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
};

export function normalizeMetadataValue(value: FormDataEntryValue | null) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function validateUploadMetadata(input: {
  title: string;
  topic: string;
  course: string;
}) {
  if (!input.title || !input.topic || !input.course) {
    return {
      valid: false as const,
      message: "Titolo, topic e corso sono obbligatori.",
    };
  }

  if (input.title.length > TITLE_MAX_LENGTH) {
    return {
      valid: false as const,
      message: `Il titolo non puo superare ${TITLE_MAX_LENGTH} caratteri.`,
    };
  }

  if (input.topic.length > TOPIC_MAX_LENGTH) {
    return {
      valid: false as const,
      message: `Il topic non puo superare ${TOPIC_MAX_LENGTH} caratteri.`,
    };
  }

  if (input.course.length > COURSE_MAX_LENGTH) {
    return {
      valid: false as const,
      message: `Il corso non puo superare ${COURSE_MAX_LENGTH} caratteri.`,
    };
  }

  return { valid: true as const };
}

export function validateUploadFileSize(file: File) {
  if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
    return {
      valid: false as const,
      message: "Il file supera il limite massimo di 50 MB.",
    };
  }

  return { valid: true as const };
}

function getClientIp(request: Request) {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  return "unknown";
}

async function ensureUploadRateLimitTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS UploadAttempt (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_upload_attempt_ip_created_at
    ON UploadAttempt(ip, createdAt)
  `);
}

export async function checkUploadRateLimit(request: Request): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - FIFTEEN_MINUTES_MS).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS).toISOString();
  const nowIso = now.toISOString();

  await ensureUploadRateLimitTable();

  await query("DELETE FROM UploadAttempt WHERE createdAt < ?", [twentyFourHoursAgo]);

  const counts = await query<{
    last15m: number | string;
    last24h: number | string;
  }>(
    `SELECT
       SUM(CASE WHEN createdAt >= ? THEN 1 ELSE 0 END) AS last15m,
       SUM(CASE WHEN createdAt >= ? THEN 1 ELSE 0 END) AS last24h
     FROM UploadAttempt
     WHERE ip = ?`,
    [fifteenMinutesAgo, twentyFourHoursAgo, ip],
  );

  const currentCounts = counts[0];
  const attemptsLast15m = Number(currentCounts?.last15m ?? 0);
  const attemptsLast24h = Number(currentCounts?.last24h ?? 0);

  if (attemptsLast15m >= 5) {
    return {
      allowed: false,
      message: "Troppi tentativi di upload. Riprova tra qualche minuto.",
    };
  }

  if (attemptsLast24h >= 20) {
    return {
      allowed: false,
      message: "Limite giornaliero di tentativi upload raggiunto. Riprova domani.",
    };
  }

  return { allowed: true, ip, nowIso };
}

export async function recordUploadAttempt(ip: string, nowIso: string) {
  await ensureUploadRateLimitTable();
  await query(
    `INSERT INTO UploadAttempt (id, ip, createdAt) VALUES (?, ?, ?)`,
    [crypto.randomUUID(), ip, nowIso],
  );
}

export function isTurnstileEnabled(env?: UploadRuntimeEnv) {
  return env?.TURNSTILE_ENABLED === "true" || process.env.TURNSTILE_ENABLED === "true";
}

export async function verifyTurnstileToken(input: {
  token: string;
  request: Request;
  env?: UploadRuntimeEnv;
}) {
  const secret =
    input.env?.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY || "";

  if (!secret) {
    throw new Error("TURNSTILE_SECRET_KEY is missing.");
  }

  const ip = getClientIp(input.request);
  const formBody = new URLSearchParams();
  formBody.set("secret", secret);
  formBody.set("response", input.token);
  formBody.set("remoteip", ip);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    },
  );

  const payload = (await response.json()) as TurnstileVerifyResponse;

  return payload.success;
}
