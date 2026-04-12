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
