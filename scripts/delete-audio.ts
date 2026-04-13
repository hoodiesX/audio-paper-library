import { execFile } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";
import { stdin, stdout } from "node:process";
import {
  deleteAudioItemById,
  getAudioItemById,
} from "../lib/audio-repository";
import { getStorageKeyFromFilePath } from "../lib/storage";

const execFileAsync = promisify(execFile);
const R2_BUCKET_NAME = "audio-paper-library";

async function deleteFromR2(storageKey: string) {
  const objectPath = `${R2_BUCKET_NAME}/${storageKey}`;

  console.log("[delete-audio] deleting object from R2", { objectPath });

  await execFileAsync(
    "npx",
    ["wrangler", "r2", "object", "delete", objectPath, "--remote"],
    {
      env: process.env,
    },
  );

  console.log("[delete-audio] R2 delete completed", { objectPath });
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
  process.env.USE_D1 = "true";

  const audioId = process.argv[2]?.trim();

  if (!audioId) {
    console.error("Usage: node --experimental-strip-types ./scripts/delete-audio.ts <audio-id>");
    process.exitCode = 1;
    return;
  }

  console.log("[delete-audio] loading audio item", { audioId });
  const item = await getAudioItemById(audioId);

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
  console.log(`topic: ${item.topic}`);
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
    console.log("[delete-audio] deleting metadata row from D1", { audioId });
    await deleteAudioItemById(audioId);
    console.log("[delete-audio] metadata delete completed", { audioId });
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
