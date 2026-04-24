import { query } from "../lib/d1-client,ts";
import { slugifyTopic } from "../lib/topics.ts";
import { backfillAudioTopicsFromLegacyColumn } from "./lib/topic-backfill.ts";

type TopicRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

async function loadTopics() {
  return query<TopicRow>(
    `SELECT id, name, slug, created_at
     FROM topics
     ORDER BY created_at ASC, id ASC`,
  );
}

async function assignTemporarySlugs(topics: TopicRow[]) {
  let updatedCount = 0;

  for (const topic of topics) {
    const canonicalSlug = slugifyTopic(topic.name);

    if (topic.slug === canonicalSlug) {
      continue;
    }

    await query(`UPDATE topics SET slug = ? WHERE id = ?`, [
      `tmp-${topic.id}`,
      topic.id,
    ]);
    updatedCount += 1;
  }

  return updatedCount;
}

async function mergeTopicGroup(canonicalSlug: string, topics: TopicRow[]) {
  const canonicalTopic = topics[0];
  let mergedCount = 0;

  if (canonicalTopic.slug !== canonicalSlug) {
    await query(`UPDATE topics SET slug = ? WHERE id = ?`, [
      canonicalSlug,
      canonicalTopic.id,
    ]);
  }

  for (const duplicateTopic of topics.slice(1)) {
    await query(
      `INSERT OR IGNORE INTO audio_topics (audio_id, topic_id, created_at)
       SELECT audio_id, ?, created_at
       FROM audio_topics
       WHERE topic_id = ?`,
      [canonicalTopic.id, duplicateTopic.id],
    );
    await query(`DELETE FROM audio_topics WHERE topic_id = ?`, [duplicateTopic.id]);
    await query(`DELETE FROM topics WHERE id = ?`, [duplicateTopic.id]);
    mergedCount += 1;
  }

  return mergedCount;
}

async function repairTopicSlugsAndDuplicates() {
  const topicsBeforeRepair = await loadTopics();
  const temporarySlugUpdates = await assignTemporarySlugs(topicsBeforeRepair);
  const topicsAfterTemporarySlugs = await loadTopics();
  const topicsByCanonicalSlug = new Map<string, TopicRow[]>();

  for (const topic of topicsAfterTemporarySlugs) {
    const canonicalSlug = slugifyTopic(topic.name);
    const existingTopics = topicsByCanonicalSlug.get(canonicalSlug);

    if (existingTopics) {
      existingTopics.push(topic);
    } else {
      topicsByCanonicalSlug.set(canonicalSlug, [topic]);
    }
  }

  let mergedTopics = 0;

  for (const [canonicalSlug, topics] of topicsByCanonicalSlug) {
    mergedTopics += await mergeTopicGroup(canonicalSlug, topics);
  }

  const topicsAfterRepair = await loadTopics();

  return {
    temporarySlugUpdates,
    mergedTopics,
    finalTopics: topicsAfterRepair.length,
  };
}

async function main() {
  console.log("[repair-d1-topic-data] starting backfill and repair");
  await backfillAudioTopicsFromLegacyColumn();

  const result = await repairTopicSlugsAndDuplicates();

  console.log("[repair-d1-topic-data] completed", result);
}

main().catch((error) => {
  console.error("[repair-d1-topic-data] failed", error);
  process.exitCode = 1;
});
