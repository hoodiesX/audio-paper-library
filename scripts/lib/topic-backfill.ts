import { query } from "../../lib/d1-client.ts";
import { normalizeTopics, slugifyTopic } from "../../lib/topics.ts";

type LegacyAudioTopicRow = {
  id: string;
  topic: string;
  createdAt: string;
};

type D1TopicRow = {
  id: string;
  name: string;
  slug: string;
};

const BATCH_LOG_EVERY = 25;

const TOPIC_SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS audio_topics (
      audio_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (audio_id, topic_id),
      FOREIGN KEY (audio_id) REFERENCES AudioItem(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_audio_item_course
    ON AudioItem(course)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_audio_item_title
    ON AudioItem(title)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_topics_name
    ON topics(name)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_audio_topics_audio_id
    ON audio_topics(audio_id)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_audio_topics_topic_id
    ON audio_topics(topic_id)
  `,
];

async function getOrCreateTopic(name: string, createdAtIso: string) {
  const slug = slugifyTopic(name);
  const existingRows = await query<D1TopicRow>(
    `SELECT id, name, slug
     FROM topics
     WHERE slug = ?
     LIMIT 1`,
    [slug],
  );

  const existingTopic = existingRows[0];

  if (existingTopic) {
    if (existingTopic.name !== name) {
      await query(`UPDATE topics SET name = ? WHERE id = ?`, [
        name,
        existingTopic.id,
      ]);
    }

    return existingTopic.id;
  }

  const topicId = crypto.randomUUID();

  try {
    await query(
      `INSERT INTO topics (id, name, slug, created_at)
       VALUES (?, ?, ?, ?)`,
      [topicId, name, slug, createdAtIso],
    );

    return topicId;
  } catch {
    const racedRows = await query<D1TopicRow>(
      `SELECT id, name, slug
       FROM topics
       WHERE slug = ?
       LIMIT 1`,
      [slug],
    );

    if (!racedRows[0]) {
      throw new Error(`Unable to upsert topic: ${name}`);
    }

    return racedRows[0].id;
  }
}

export async function ensureD1TopicSchema() {
  for (const statement of TOPIC_SCHEMA_STATEMENTS) {
    await query(statement);
  }

  console.log("D1 topic schema ensured.");
}

export async function backfillAudioTopicsFromLegacyColumn() {
  await ensureD1TopicSchema();

  const audioRows = await query<LegacyAudioTopicRow>(
    `SELECT id, topic, createdAt
     FROM AudioItem
     ORDER BY createdAt ASC`,
  );

  console.log(`Found ${audioRows.length} audio items to backfill.`);

  let processedItems = 0;

  for (const row of audioRows) {
    const topics = normalizeTopics(row.topic);

    for (const topicName of topics) {
      const topicId = await getOrCreateTopic(topicName, row.createdAt);

      await query(
        `INSERT OR IGNORE INTO audio_topics (audio_id, topic_id, created_at)
         VALUES (?, ?, ?)`,
        [row.id, topicId, row.createdAt],
      );
    }

    processedItems += 1;

    if (
      processedItems % BATCH_LOG_EVERY === 0 ||
      processedItems === audioRows.length
    ) {
      console.log(
        `Backfilled topics for ${processedItems}/${audioRows.length} audio items...`,
      );
    }
  }

  const [topicCountRow] = await query<{ total: number | string }>(
    `SELECT COUNT(*) AS total FROM topics`,
  );
  const [linkCountRow] = await query<{ total: number | string }>(
    `SELECT COUNT(*) AS total FROM audio_topics`,
  );

  console.log(
    `Backfill completed. topics=${Number(topicCountRow?.total ?? 0)} audio_topics=${Number(linkCountRow?.total ?? 0)}`,
  );
}
