export const TOPIC_MAX_LENGTH = 60;
export const MAX_TOPICS_PER_AUDIO = 12;
export const TOPICS_INPUT_MAX_LENGTH = 320;

function normalizeTopicWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeTopics(
  value: string | string[] | null | undefined,
): string[] {
  const rawValues = Array.isArray(value) ? value : [value ?? ""];
  const seen = new Set<string>();
  const topics: string[] = [];

  for (const rawValue of rawValues) {
    for (const chunk of String(rawValue).split(",")) {
      const normalizedTopic = normalizeTopicWhitespace(chunk);

      if (!normalizedTopic) {
        continue;
      }

      const dedupeKey = normalizedTopic.toLowerCase();

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      topics.push(normalizedTopic);
    }
  }

  return topics;
}

export function slugifyTopic(value: string) {
  const normalizedValue = normalizeTopicWhitespace(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalizedValue.slice(0, 80) || "topic";
}

export function getPrimaryTopic(
  topics: string[],
  fallbackTopic?: string | null,
): string {
  const normalizedTopics = normalizeTopics(topics);

  if (normalizedTopics[0]) {
    return normalizedTopics[0];
  }

  return normalizeTopics(fallbackTopic ?? "")[0] ?? "";
}
