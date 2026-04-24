import { query } from "../lib/d1-client";
import { normalizeTopics, slugifyTopic } from "../lib/topics";
import { ensureD1TopicSchema } from "./lib/topic-backfill";

type AudioItemRow = {
  id: string;
  topic: string;
  createdAt: string;
};

type TopicRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type AudioTopicRow = {
  audio_id: string;
  topic_id: string;
};

type RepairSummary = {
  audioItemsScanned: number;
  topicRowsCreated: number;
  linksCreated: number;
  combinedTopicRowsRemoved: number;
  finalTopicsCount: number;
  finalAudioTopicsCount: number;
};

type RepairContext = {
  topicsById: Map<string, TopicRow>;
  canonicalTopicBySlug: Map<string, TopicRow>;
  linksByAudioId: Map<string, Set<string>>;
  linkCountByTopicId: Map<string, number>;
  summary: RepairSummary;
};

function normalizeTopicNameKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isCombinedTopicRow(topicName: string) {
  return normalizeTopics(topicName).length > 1;
}

function addLinkToContext(context: RepairContext, audioId: string, topicId: string) {
  const audioLinks = context.linksByAudioId.get(audioId) ?? new Set<string>();

  if (audioLinks.has(topicId)) {
    return false;
  }

  audioLinks.add(topicId);
  context.linksByAudioId.set(audioId, audioLinks);
  context.linkCountByTopicId.set(
    topicId,
    (context.linkCountByTopicId.get(topicId) ?? 0) + 1,
  );

  return true;
}

function removeLinkFromContext(context: RepairContext, audioId: string, topicId: string) {
  const audioLinks = context.linksByAudioId.get(audioId);

  if (!audioLinks?.has(topicId)) {
    return false;
  }

  audioLinks.delete(topicId);

  if (audioLinks.size === 0) {
    context.linksByAudioId.delete(audioId);
  }

  const nextCount = Math.max((context.linkCountByTopicId.get(topicId) ?? 1) - 1, 0);

  if (nextCount === 0) {
    context.linkCountByTopicId.delete(topicId);
  } else {
    context.linkCountByTopicId.set(topicId, nextCount);
  }

  return true;
}

async function loadRepairContext(): Promise<RepairContext> {
  const [topics, audioTopics] = await Promise.all([
    query<TopicRow>(
      `SELECT id, name, slug, created_at
       FROM topics
       ORDER BY created_at ASC, id ASC`,
    ),
    query<AudioTopicRow>(
      `SELECT audio_id, topic_id
       FROM audio_topics`,
    ),
  ]);

  const context: RepairContext = {
    topicsById: new Map(topics.map((topic) => [topic.id, topic])),
    canonicalTopicBySlug: new Map<string, TopicRow>(),
    linksByAudioId: new Map<string, Set<string>>(),
    linkCountByTopicId: new Map<string, number>(),
    summary: {
      audioItemsScanned: 0,
      topicRowsCreated: 0,
      linksCreated: 0,
      combinedTopicRowsRemoved: 0,
      finalTopicsCount: 0,
      finalAudioTopicsCount: 0,
    },
  };

  for (const topic of topics) {
    if (isCombinedTopicRow(topic.name)) {
      continue;
    }

    const canonicalSlug = slugifyTopic(topic.name);

    if (topic.slug === canonicalSlug && !context.canonicalTopicBySlug.has(canonicalSlug)) {
      context.canonicalTopicBySlug.set(canonicalSlug, topic);
    }
  }

  for (const audioTopic of audioTopics) {
    addLinkToContext(context, audioTopic.audio_id, audioTopic.topic_id);
  }

  return context;
}

async function resolveCanonicalTopic(
  context: RepairContext,
  topicName: string,
  createdAtIso: string,
) {
  const canonicalName = normalizeTopics(topicName)[0];

  if (!canonicalName) {
    throw new Error("Cannot resolve an empty canonical topic.");
  }

  const canonicalSlug = slugifyTopic(canonicalName);
  const existingCanonicalTopic = context.canonicalTopicBySlug.get(canonicalSlug);

  if (existingCanonicalTopic) {
    return existingCanonicalTopic;
  }

  const matchingTopicByName = Array.from(context.topicsById.values()).find((topic) => {
    if (isCombinedTopicRow(topic.name)) {
      return false;
    }

    return normalizeTopicNameKey(topic.name) === normalizeTopicNameKey(canonicalName);
  });

  if (matchingTopicByName) {
    const slugOwner = context.canonicalTopicBySlug.get(canonicalSlug);

    if (!slugOwner && matchingTopicByName.slug !== canonicalSlug) {
      await query(`UPDATE topics SET slug = ? WHERE id = ?`, [
        canonicalSlug,
        matchingTopicByName.id,
      ]);

      matchingTopicByName.slug = canonicalSlug;
    }

    if (matchingTopicByName.name !== canonicalName) {
      await query(`UPDATE topics SET name = ? WHERE id = ?`, [
        canonicalName,
        matchingTopicByName.id,
      ]);

      matchingTopicByName.name = canonicalName;
    }

    context.canonicalTopicBySlug.set(canonicalSlug, matchingTopicByName);
    context.topicsById.set(matchingTopicByName.id, matchingTopicByName);

    return matchingTopicByName;
  }

  const topic: TopicRow = {
    id: crypto.randomUUID(),
    name: canonicalName,
    slug: canonicalSlug,
    created_at: createdAtIso,
  };
  const hadStoredSlugOwner = Array.from(context.topicsById.values()).some(
    (existingTopic) => existingTopic.slug === canonicalSlug,
  );

  await query(
    `INSERT OR IGNORE INTO topics (id, name, slug, created_at)
     VALUES (?, ?, ?, ?)`,
    [topic.id, topic.name, topic.slug, topic.created_at],
  );

  const insertedRows = await query<TopicRow>(
    `SELECT id, name, slug, created_at
     FROM topics
     WHERE slug = ?
     LIMIT 1`,
    [canonicalSlug],
  );

  const insertedTopic = insertedRows[0];

  if (!insertedTopic) {
    throw new Error(`Failed to resolve canonical topic row for ${canonicalName}.`);
  }

  if (!hadStoredSlugOwner) {
    context.summary.topicRowsCreated += 1;
  }

  context.canonicalTopicBySlug.set(canonicalSlug, insertedTopic);
  context.topicsById.set(insertedTopic.id, insertedTopic);

  return insertedTopic;
}

async function ensureCanonicalAudioTopicLink(
  context: RepairContext,
  audioId: string,
  topicId: string,
  createdAtIso: string,
) {
  if (!addLinkToContext(context, audioId, topicId)) {
    return;
  }

  await query(
    `INSERT OR IGNORE INTO audio_topics (audio_id, topic_id, created_at)
     VALUES (?, ?, ?)`,
    [audioId, topicId, createdAtIso],
  );

  context.summary.linksCreated += 1;
}

async function removeAudioTopicLink(
  context: RepairContext,
  audioId: string,
  topicId: string,
) {
  if (!removeLinkFromContext(context, audioId, topicId)) {
    return;
  }

  await query(
    `DELETE FROM audio_topics
     WHERE audio_id = ? AND topic_id = ?`,
    [audioId, topicId],
  );
}

async function migrateAudioItemTopics(context: RepairContext, audio: AudioItemRow) {
  const normalizedTopics = normalizeTopics(audio.topic);
  const desiredCanonicalTopicIds = new Set<string>();
  const desiredCanonicalTopicSlugs = new Set<string>();

  for (const topicName of normalizedTopics) {
    const canonicalTopic = await resolveCanonicalTopic(
      context,
      topicName,
      audio.createdAt,
    );

    desiredCanonicalTopicIds.add(canonicalTopic.id);
    desiredCanonicalTopicSlugs.add(canonicalTopic.slug);

    await ensureCanonicalAudioTopicLink(
      context,
      audio.id,
      canonicalTopic.id,
      audio.createdAt,
    );
  }

  if (normalizedTopics.length <= 1) {
    return;
  }

  const linkedTopicIds = Array.from(context.linksByAudioId.get(audio.id) ?? []);

  for (const linkedTopicId of linkedTopicIds) {
    if (desiredCanonicalTopicIds.has(linkedTopicId)) {
      continue;
    }

    const linkedTopic = context.topicsById.get(linkedTopicId);

    if (!linkedTopic) {
      continue;
    }

    if (isCombinedTopicRow(linkedTopic.name)) {
      await removeAudioTopicLink(context, audio.id, linkedTopicId);
      continue;
    }

    if (desiredCanonicalTopicSlugs.has(slugifyTopic(linkedTopic.name))) {
      await removeAudioTopicLink(context, audio.id, linkedTopicId);
    }
  }
}

async function removeUnlinkedCombinedTopicRows(context: RepairContext) {
  for (const topic of Array.from(context.topicsById.values())) {
    if (!isCombinedTopicRow(topic.name)) {
      continue;
    }

    if ((context.linkCountByTopicId.get(topic.id) ?? 0) > 0) {
      continue;
    }

    await query(`DELETE FROM topics WHERE id = ?`, [topic.id]);
    context.topicsById.delete(topic.id);
    context.summary.combinedTopicRowsRemoved += 1;
  }
}

async function loadFinalCounts() {
  const [[topicCountRow], [audioTopicCountRow]] = await Promise.all([
    query<{ total: number | string }>(`SELECT COUNT(*) AS total FROM topics`),
    query<{ total: number | string }>(`SELECT COUNT(*) AS total FROM audio_topics`),
  ]);

  return {
    finalTopicsCount: Number(topicCountRow?.total ?? 0),
    finalAudioTopicsCount: Number(audioTopicCountRow?.total ?? 0),
  };
}

async function repairTopicData() {
  await ensureD1TopicSchema();

  const context = await loadRepairContext();
  const audioItems = await query<AudioItemRow>(
    `SELECT id, topic, createdAt
     FROM AudioItem
     WHERE topic IS NOT NULL AND TRIM(topic) != ''
     ORDER BY createdAt ASC, id ASC`,
  );

  for (const audio of audioItems) {
    context.summary.audioItemsScanned += 1;
    await migrateAudioItemTopics(context, audio);
  }

  await removeUnlinkedCombinedTopicRows(context);

  const finalCounts = await loadFinalCounts();

  context.summary.finalTopicsCount = finalCounts.finalTopicsCount;
  context.summary.finalAudioTopicsCount = finalCounts.finalAudioTopicsCount;

  return context.summary;
}

async function main() {
  console.log("[repair-d1-topic-data] starting");

  const summary = await repairTopicData();

  console.log("[repair-d1-topic-data] summary");
  console.log(`audio items scanned: ${summary.audioItemsScanned}`);
  console.log(`topic rows created: ${summary.topicRowsCreated}`);
  console.log(`links created: ${summary.linksCreated}`);
  console.log(`combined topic rows removed: ${summary.combinedTopicRowsRemoved}`);
  console.log(`final topics count: ${summary.finalTopicsCount}`);
  console.log(`final audio_topics count: ${summary.finalAudioTopicsCount}`);
}

main().catch((error) => {
  console.error("[repair-d1-topic-data] failed", error);
  process.exitCode = 1;
});
