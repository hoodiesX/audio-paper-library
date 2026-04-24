import { backfillAudioTopicsFromLegacyColumn } from "./lib/topic-backfill";

async function main() {
  await backfillAudioTopicsFromLegacyColumn();
}

main().catch((error) => {
  console.error("Audio topic migration failed.", error);
  process.exitCode = 1;
});
