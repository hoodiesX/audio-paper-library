CREATE TABLE IF NOT EXISTS AudioItem (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  course TEXT NOT NULL,
  filePath TEXT NOT NULL,
  duration INTEGER,
  createdAt TEXT NOT NULL,
  lastPositionSeconds INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_audio_item_created_at
ON AudioItem(createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_audio_item_course
ON AudioItem(course);

CREATE INDEX IF NOT EXISTS idx_audio_item_title
ON AudioItem(title);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topics_name
ON topics(name);

CREATE TABLE IF NOT EXISTS audio_topics (
  audio_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (audio_id, topic_id),
  FOREIGN KEY (audio_id) REFERENCES AudioItem(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audio_topics_audio_id
ON audio_topics(audio_id);

CREATE INDEX IF NOT EXISTS idx_audio_topics_topic_id
ON audio_topics(topic_id);
