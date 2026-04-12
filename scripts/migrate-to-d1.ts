import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { query } from "../lib/d1-client.ts";

const prisma = new PrismaClient();
const BATCH_LOG_EVERY = 25;

async function ensureSchema() {
  const schemaPath = path.join(process.cwd(), "schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");

  await query(schemaSql);
  console.log("D1 schema ensured.");
}

async function migrateAudioItems() {
  const items = await prisma.audioItem.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${items.length} audio items in SQLite.`);

  let migrated = 0;

  for (const item of items) {
    await query(
      `INSERT OR IGNORE INTO AudioItem (
        id,
        title,
        topic,
        course,
        filePath,
        duration,
        createdAt,
        lastPositionSeconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.title,
        item.topic,
        item.course,
        item.filePath,
        item.duration,
        item.createdAt.toISOString(),
        item.lastPositionSeconds,
      ],
    );

    migrated += 1;

    if (migrated % BATCH_LOG_EVERY === 0 || migrated === items.length) {
      console.log(`Migrated ${migrated}/${items.length} audio items...`);
    }
  }

  const countRows = await query<{ total: number | string }>(
    "SELECT COUNT(*) AS total FROM AudioItem",
  );

  const total = Number(countRows[0]?.total ?? 0);
  console.log(`D1 now contains ${total} audio items.`);
}

async function main() {
  await ensureSchema();
  await migrateAudioItems();
}

main()
  .catch((error) => {
    console.error("D1 migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
