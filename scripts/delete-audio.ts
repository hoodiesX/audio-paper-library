import { execFile } from "node:child_process";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";
import { normalizeTopics } from "../lib/topics";

const execFileAsync = promisify(execFile);
const R2_BUCKET_NAME = "audio-paper-library";

type AudioItemRow = {
  id: string;
  title: string;
  topic: string;
  course: string;
  filePath: string;
  duration: number | string | null;
  createdAt: string;
  lastPositionSeconds: number | string;
};

type AudioItemWithTopics = AudioItemRow & {
  topics: string[];
};

type D1Response<T> = {
  success: boolean;
  errors?: Array<{ message?: string }>;
  result?: Array<{
    success?: boolean;
    results?: T[];
  }>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getD1Config() {
  return {
    accountId: getRequiredEnv("CLOUDFLARE_ACCOUNT_ID"),
    databaseId: getRequiredEnv("CLOUDFLARE_D1_DATABASE_ID"),
    apiToken: getRequiredEnv("CLOUDFLARE_D1_API_TOKEN"),
  };
}

async function queryD1<T>(sql: string, params: Array<string> = []) {
  const config = getD1Config();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    },
  );

  const payload = (await response.json()) as D1Response<T>;

  if (!response.ok || !payload.success) {
    const errorMessage =
      payload.errors?.map((error) => error.message).filter(Boolean).join(", ") ||
      "D1 query failed.";

    throw new Error(errorMessage);
  }

  return payload.result?.[0]?.results ?? [];
}

function getStorageKeyFromFilePath(filePath: string) {
  const normalized = filePath.trim();

  if (!normalized) {
    throw new Error("filePath is empty and cannot be mapped to an R2 object key.");
  }

  if (/^https?:\/\//i.test(normalized)) {
    const url = new URL(normalized);
    const key = url.pathname.replace(/^\/+/, "");

    if (!key) {
      throw new Error("filePath URL does not contain a valid R2 object key.");
    }

    return key;
  }

  return normalized.replace(/^\/+/, "");
}

async function loadAudioItem(audioId: string) {
  const rows = await queryD1<AudioItemRow>(
    `SELECT id, title, topic, course, filePath, duration, createdAt, lastPositionSeconds
     FROM AudioItem
     WHERE id = ?
     LIMIT 1`,
    [audioId],
  );

  const item = rows[0];

  if (!item) {
    return null;
  }

  const topicRows = await queryD1<{ name: string }>(
    `SELECT t.name
     FROM audio_topics at
     INNER JOIN topics t ON t.id = at.topic_id
     WHERE at.audio_id = ?
     ORDER BY t.name COLLATE NOCASE ASC`,
    [audioId],
  );

  return {
    ...item,
    topics:
      topicRows.length > 0
        ? topicRows.map((row) => row.name)
        : normalizeTopics(item.topic),
  } satisfies AudioItemWithTopics;
}

async function deleteFromR2(storageKey: string) {
  const objectPath = `${R2_BUCKET_NAME}/${storageKey}`;

  console.log("[delete-audio] deleting from R2", { objectPath });

  await execFileAsync(
    "npx",
    ["wrangler", "r2", "object", "delete", objectPath, "--remote"],
    {
      env: process.env,
    },
  );

  console.log("[delete-audio] R2 delete completed", { objectPath });
}

async function deleteFromD1(audioId: string) {
  console.log("[delete-audio] deleting metadata from D1", { audioId });

  await queryD1("DELETE FROM audio_topics WHERE audio_id = ?", [audioId]);
  await queryD1("DELETE FROM AudioItem WHERE id = ?", [audioId]);

  console.log("[delete-audio] D1 delete completed", { audioId });
}

async function confirmDeletion() {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const answer = await rl.question(
      'Type "DELETE" to permanently remove this audio from R2 and D1: ',
    );

    return answer.trim() === "DELETE";
  } finally {
    rl.close();
  }
}

async function main() {
  const audioId = process.argv[2]?.trim();

  if (!audioId) {
    console.error("Usage: node --experimental-strip-types ./scripts/delete-audio.ts <audio-id>");
    process.exitCode = 1;
    return;
  }

  console.log("[delete-audio] loading audio item", { audioId });
  const item = await loadAudioItem(audioId);

  if (!item) {
    console.log("[delete-audio] audio item not found, nothing to delete", {
      audioId,
    });
    return;
  }

  const storageKey = getStorageKeyFromFilePath(item.filePath);

  console.log("");
  console.log("Delete summary");
  console.log(`id: ${item.id}`);
  console.log(`title: ${item.title}`);
  console.log(`topics: ${item.topics.join(", ")}`);
  console.log(`course: ${item.course}`);
  console.log(`filePath: ${item.filePath}`);
  console.log(`storageKey: ${storageKey}`);
  console.log("");

  const confirmed = await confirmDeletion();

  if (!confirmed) {
    console.log("[delete-audio] deletion aborted");
    return;
  }

  try {
    await deleteFromR2(storageKey);
  } catch (error) {
    console.error("[delete-audio] R2 delete failed; metadata was NOT removed", error);
    process.exitCode = 1;
    return;
  }

  try {
    await deleteFromD1(audioId);
    console.log("[delete-audio] deletion completed successfully");
  } catch (error) {
    console.error(
      "[delete-audio] WARNING: R2 object was deleted but D1 metadata delete failed. Manual recovery may be required.",
      error,
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[delete-audio] fatal error", error);
  process.exitCode = 1;
});
