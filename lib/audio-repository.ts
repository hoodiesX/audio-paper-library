import { query } from "@/lib/d1-client";
import { getPrimaryTopic, normalizeTopics, slugifyTopic } from "@/lib/topics";

export type TopicFilterMode = "or" | "and";

export type CreateAudioItemInput = {
  title: string;
  topics: string[];
  course: string;
  filePath: string;
  duration?: number | null;
};

export type AudioSearchFilters = {
  query?: string;
  topic?: string;
  topics?: string[];
  course?: string;
  topicMode?: TopicFilterMode;
};

export type AudioItemRecord = {
  id: string;
  title: string;
  topics: string[];
  topic: string;
  course: string;
  filePath: string;
  duration: number | null;
  createdAt: Date;
  lastPositionSeconds: number;
};

type AudioFilterOptions = {
  topics: string[];
  courses: string[];
};

type D1AudioItemWithTopicRow = {
  id: string;
  title: string;
  legacyTopic: string | null;
  course: string;
  filePath: string;
  duration: number | string | null;
  createdAt: string;
  lastPositionSeconds: number | string;
  topicName: string | null;
};

type D1TopicRow = {
  id: string;
  name: string;
  slug: string;
};

type D1ValueRow = {
  value: string;
};

let topicSchemaPromise: Promise<void> | null = null;

function normalizeTextFilter(value?: string) {
  const trimmed = value?.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed : undefined;
}

function normalizeTopicMode(value?: string): TopicFilterMode {
  return value === "and" ? "and" : "or";
}

function buildAudioItemRecord(input: {
  id: string;
  title: string;
  topics: string[];
  legacyTopic?: string | null;
  course: string;
  filePath: string;
  duration: number | string | null | undefined;
  createdAt: string | Date;
  lastPositionSeconds: number | string | null | undefined;
}): AudioItemRecord {
  const topics =
    input.topics.length > 0
      ? normalizeTopics(input.topics)
      : normalizeTopics(input.legacyTopic ?? "");

  return {
    id: input.id,
    title: input.title,
    topics,
    topic: getPrimaryTopic(topics, input.legacyTopic),
    course: input.course,
    filePath: input.filePath,
    duration:
      input.duration === null || input.duration === undefined
        ? null
        : Number(input.duration),
    createdAt:
      input.createdAt instanceof Date
        ? input.createdAt
        : new Date(input.createdAt),
    lastPositionSeconds: Number(input.lastPositionSeconds ?? 0),
  };
}

function groupD1AudioRows(rows: D1AudioItemWithTopicRow[]) {
  const groupedItems = new Map<
    string,
    Omit<AudioItemRecord, "topics" | "topic"> & {
      legacyTopic: string | null;
      topicNames: string[];
    }
  >();

  for (const row of rows) {
    const existingItem = groupedItems.get(row.id);

    if (existingItem) {
      if (row.topicName) {
        existingItem.topicNames.push(row.topicName);
      }

      continue;
    }

    groupedItems.set(row.id, {
      id: row.id,
      title: row.title,
      legacyTopic: row.legacyTopic,
      course: row.course,
      filePath: row.filePath,
      duration:
        row.duration === null || row.duration === undefined
          ? null
          : Number(row.duration),
      createdAt: new Date(row.createdAt),
      lastPositionSeconds: Number(row.lastPositionSeconds ?? 0),
      topicNames: row.topicName ? [row.topicName] : [],
    });
  }

  return Array.from(groupedItems.values()).map((item) =>
    buildAudioItemRecord({
      topics: item.topicNames,
      id: item.id,
      title: item.title,
      legacyTopic: item.legacyTopic,
      course: item.course,
      filePath: item.filePath,
      duration: item.duration,
      createdAt: item.createdAt,
      lastPositionSeconds: item.lastPositionSeconds,
    }),
  );
}

function getNormalizedSelectedTopics(filters: AudioSearchFilters) {
  return normalizeTopics([
    ...(filters.topics ?? []),
    ...(filters.topic ? [filters.topic] : []),
  ]);
}

async function ensureTopicSchema() {
  if (!topicSchemaPromise) {
    topicSchemaPromise = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS topics (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL
        )
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS audio_topics (
          audio_id TEXT NOT NULL,
          topic_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (audio_id, topic_id),
          FOREIGN KEY (audio_id) REFERENCES AudioItem(id) ON DELETE CASCADE,
          FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
        )
      `);

      await query(`
        CREATE INDEX IF NOT EXISTS idx_audio_item_course
        ON AudioItem(course)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_audio_item_title
        ON AudioItem(title)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_topics_name
        ON topics(name)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_audio_topics_audio_id
        ON audio_topics(audio_id)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_audio_topics_topic_id
        ON audio_topics(topic_id)
      `);
    })().catch((error) => {
      topicSchemaPromise = null;
      throw error;
    });
  }

  await topicSchemaPromise;
}

async function getOrCreateD1Topic(name: string, createdAtIso: string) {
  const slug = slugifyTopic(name);
  const existingTopicRows = await query<D1TopicRow>(
    `SELECT id, name, slug
     FROM topics
     WHERE slug = ?
     LIMIT 1`,
    [slug],
  );

  const existingTopic = existingTopicRows[0];

  if (existingTopic) {
    if (existingTopic.name !== name) {
      await query(`UPDATE topics SET name = ? WHERE id = ?`, [
        name,
        existingTopic.id,
      ]);
    }

    return {
      id: existingTopic.id,
      name,
      slug,
    };
  }

  const topicId = crypto.randomUUID();

  try {
    await query(
      `INSERT INTO topics (id, name, slug, created_at)
       VALUES (?, ?, ?, ?)`,
      [topicId, name, slug, createdAtIso],
    );

    return {
      id: topicId,
      name,
      slug,
    };
  } catch (error) {
    const racedTopicRows = await query<D1TopicRow>(
      `SELECT id, name, slug
       FROM topics
       WHERE slug = ?
       LIMIT 1`,
      [slug],
    );

    const racedTopic = racedTopicRows[0];

    if (!racedTopic) {
      throw error;
    }

    if (racedTopic.name !== name) {
      await query(`UPDATE topics SET name = ? WHERE id = ?`, [
        name,
        racedTopic.id,
      ]);
    }

    return {
      id: racedTopic.id,
      name,
      slug,
    };
  }
}

async function attachTopicsToD1AudioItem(
  audioId: string,
  topics: string[],
  createdAtIso: string,
) {
  for (const topicName of topics) {
    const topic = await getOrCreateD1Topic(topicName, createdAtIso);

    await query(
      `INSERT OR IGNORE INTO audio_topics (audio_id, topic_id, created_at)
       VALUES (?, ?, ?)`,
      [audioId, topic.id, createdAtIso],
    );
  }
}

async function removeTopicsForD1AudioItem(audioId: string) {
  await ensureTopicSchema();
  await query(`DELETE FROM audio_topics WHERE audio_id = ?`, [audioId]);
}

async function searchAudiosFromD1(filters: AudioSearchFilters) {
  await ensureTopicSchema();

  const normalizedQuery = normalizeTextFilter(filters.query);
  const normalizedCourse = normalizeTextFilter(filters.course);
  const selectedTopics = getNormalizedSelectedTopics(filters);
  const selectedTopicSlugs = selectedTopics.map(slugifyTopic);
  const topicMode = normalizeTopicMode(filters.topicMode);
  const whereClauses: string[] = [];
  const params: Array<string> = [];

  if (normalizedQuery) {
    const queryMatch = `%${normalizedQuery.toLowerCase()}%`;

    whereClauses.push(`(
      LOWER(ai.title) LIKE ?
      OR LOWER(ai.course) LIKE ?
      OR LOWER(COALESCE(ai.topic, '')) LIKE ?
      OR EXISTS (
        SELECT 1
        FROM audio_topics at_query
        INNER JOIN topics tq ON tq.id = at_query.topic_id
        WHERE at_query.audio_id = ai.id
          AND LOWER(tq.name) LIKE ?
      )
    )`);
    params.push(queryMatch, queryMatch, queryMatch, queryMatch);
  }

  if (normalizedCourse) {
    whereClauses.push(`LOWER(ai.course) = ?`);
    params.push(normalizedCourse.toLowerCase());
  }

  if (selectedTopics.length > 0) {
    if (topicMode === "and") {
      const slugPlaceholders = selectedTopicSlugs.map(() => "?").join(", ");

      if (selectedTopics.length === 1) {
        whereClauses.push(`(
          (
            SELECT COUNT(DISTINCT tf.slug)
            FROM audio_topics at_filter
            INNER JOIN topics tf ON tf.id = at_filter.topic_id
            WHERE at_filter.audio_id = ai.id
              AND tf.slug IN (${slugPlaceholders})
          ) = 1
          OR LOWER(TRIM(COALESCE(ai.topic, ''))) = ?
        )`);
        params.push(...selectedTopicSlugs, selectedTopics[0].toLowerCase());
      } else {
        whereClauses.push(`(
          SELECT COUNT(DISTINCT tf.slug)
          FROM audio_topics at_filter
          INNER JOIN topics tf ON tf.id = at_filter.topic_id
          WHERE at_filter.audio_id = ai.id
            AND tf.slug IN (${slugPlaceholders})
        ) = ${selectedTopicSlugs.length}`);
        params.push(...selectedTopicSlugs);
      }
    } else {
      const slugPlaceholders = selectedTopicSlugs.map(() => "?").join(", ");
      const legacyPlaceholders = selectedTopics.map(() => "?").join(", ");

      whereClauses.push(`(
        EXISTS (
          SELECT 1
          FROM audio_topics at_filter
          INNER JOIN topics tf ON tf.id = at_filter.topic_id
          WHERE at_filter.audio_id = ai.id
            AND tf.slug IN (${slugPlaceholders})
        )
        OR LOWER(TRIM(COALESCE(ai.topic, ''))) IN (${legacyPlaceholders})
      )`);
      params.push(
        ...selectedTopicSlugs,
        ...selectedTopics.map((topic) => topic.toLowerCase()),
      );
    }
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const rows = await query<D1AudioItemWithTopicRow>(
    `SELECT
       ai.id,
       ai.title,
       ai.topic AS legacyTopic,
       ai.course,
       ai.filePath,
       ai.duration,
       ai.createdAt,
       ai.lastPositionSeconds,
       t.name AS topicName
     FROM AudioItem ai
     LEFT JOIN audio_topics at ON at.audio_id = ai.id
     LEFT JOIN topics t ON t.id = at.topic_id
     ${whereSql}
     ORDER BY ai.createdAt DESC, t.name COLLATE NOCASE ASC`,
    params,
  );

  console.log("[audio-repository] audio item read", {
    source: "D1",
    count: rows.length,
    query: normalizedQuery,
    selectedTopics,
    course: normalizedCourse,
    topicMode,
  });

  return groupD1AudioRows(rows);
}

export async function searchAudios(filters: AudioSearchFilters = {}) {
  console.log("[audio-repository] using D1 for read: searchAudios");
  return searchAudiosFromD1(filters);
}

export async function getAudioItems(filters: AudioSearchFilters = {}) {
  return searchAudios(filters);
}

export async function getAllTopics() {
  console.log("[audio-repository] using D1 for read: getAllTopics");
  await ensureTopicSchema();

  const rows = await query<{ name: string }>(
    `SELECT name
     FROM (
       SELECT name
       FROM topics
       UNION
       SELECT TRIM(topic) AS name
       FROM AudioItem
       WHERE topic IS NOT NULL AND TRIM(topic) != ''
     )
     ORDER BY name COLLATE NOCASE ASC`,
  );

  return normalizeTopics(rows.map((row) => row.name));
}

async function getAllCourses() {
  console.log("[audio-repository] using D1 for read: getAllCourses");

  const rows = await query<D1ValueRow>(
    `SELECT DISTINCT course AS value
     FROM AudioItem
     WHERE course IS NOT NULL AND TRIM(course) != ''
     ORDER BY course COLLATE NOCASE ASC`,
  );

  return rows.map((row) => row.value).filter(Boolean);
}

export async function getAudioFilterOptions(): Promise<AudioFilterOptions> {
  const [topics, courses] = await Promise.all([getAllTopics(), getAllCourses()]);

  return {
    topics,
    courses,
  };
}

export async function getAudioItemById(id: string) {
  console.log("[audio-repository] using D1 for read: getAudioItemById", {
    id,
  });
  await ensureTopicSchema();

  const rows = await query<D1AudioItemWithTopicRow>(
    `SELECT
       ai.id,
       ai.title,
       ai.topic AS legacyTopic,
       ai.course,
       ai.filePath,
       ai.duration,
       ai.createdAt,
       ai.lastPositionSeconds,
       t.name AS topicName
     FROM AudioItem ai
     LEFT JOIN audio_topics at ON at.audio_id = ai.id
     LEFT JOIN topics t ON t.id = at.topic_id
     WHERE ai.id = ?
     ORDER BY t.name COLLATE NOCASE ASC`,
    [id],
  );

  const item = groupD1AudioRows(rows)[0] ?? null;

  console.log("[audio-repository] audio item read", {
    source: "D1",
    id,
    found: Boolean(item),
  });

  return item;
}

export async function createAudioItem(data: CreateAudioItemInput) {
  const topics = normalizeTopics(data.topics);
  const primaryTopic = getPrimaryTopic(topics);

  console.log("[audio-repository] using D1 for write: createAudioItem", {
    title: data.title,
    topics,
    course: data.course,
  });
  await ensureTopicSchema();

  const item: AudioItemRecord = {
    id: crypto.randomUUID(),
    title: data.title,
    topics,
    topic: primaryTopic,
    course: data.course,
    filePath: data.filePath,
    duration: data.duration ?? null,
    createdAt: new Date(),
    lastPositionSeconds: 0,
  };
  const createdAtIso = item.createdAt.toISOString();

  try {
    await query(
      `INSERT INTO AudioItem (
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
        createdAtIso,
        item.lastPositionSeconds,
      ],
    );

    await attachTopicsToD1AudioItem(item.id, item.topics, createdAtIso);
  } catch (error) {
    await removeTopicsForD1AudioItem(item.id).catch(() => undefined);
    await query(`DELETE FROM AudioItem WHERE id = ?`, [item.id]).catch(
      () => undefined,
    );
    throw error;
  }

  console.log("[audio-repository] audio item create", {
    source: "D1",
    id: item.id,
    topics: item.topics,
  });

  return item;
}

export async function updateAudioProgress(id: string, position: number) {
  const nextPosition = Math.max(0, Math.floor(position));

  console.log("[audio-repository] using D1 for write: updateAudioProgress", {
    id,
    position: nextPosition,
  });

  await query(
    `UPDATE AudioItem
     SET lastPositionSeconds = ?
     WHERE id = ?`,
    [nextPosition, id],
  );

  const updatedItem = await getAudioItemById(id);

  if (!updatedItem) {
    throw new Error(`Audio item not found: ${id}`);
  }

  return updatedItem;
}

export async function deleteAudioItemById(id: string) {
  console.log("[audio-repository] using D1 for write: deleteAudioItemById", {
    id,
  });
  await ensureTopicSchema();

  await removeTopicsForD1AudioItem(id);
  await query(`DELETE FROM AudioItem WHERE id = ?`, [id]);

  console.log("[audio-repository] audio item delete", {
    source: "D1",
    id,
  });
}
