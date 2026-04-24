PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE AudioItem (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  course TEXT NOT NULL,
  filePath TEXT NOT NULL,
  duration INTEGER,
  createdAt TEXT NOT NULL,
  lastPositionSeconds INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "AudioItem" ("id","title","topic","course","filePath","duration","createdAt","lastPositionSeconds") VALUES('f46dd25e-e370-4c9b-9b90-5b3b36aab7c7','H264 Exploit','AI, Cybersecurity, Videoencoding','Cybersecurity','https://pub-0aa4bf7443c04ea59a9cccc948cfd24d.r2.dev/audio/h264-exploit-2a975efb-0813-4d29-9429-2d04aebf71ff.m4a',NULL,'2026-04-13T19:09:24.773Z',470);
INSERT INTO "AudioItem" ("id","title","topic","course","filePath","duration","createdAt","lastPositionSeconds") VALUES('36f14072-22b1-432a-9ae7-3b8dd328c82c','Attention is all you need','AI, Transformers, Self-Attention, Positional Encoding, NLP','Deep Learning','https://pub-0aa4bf7443c04ea59a9cccc948cfd24d.r2.dev/audio/attention-is-all-you-need-18699d1a-be83-4cde-98ae-3b89bea90a78.m4a',NULL,'2026-04-15T09:28:59.766Z',897);
INSERT INTO "AudioItem" ("id","title","topic","course","filePath","duration","createdAt","lastPositionSeconds") VALUES('1ae0dcb5-ca5a-4fa8-9e85-409c34ecc291','Google File System (2003)','Distributed File Systems, Storage Architecture, Google','Distributed Systems','https://pub-0aa4bf7443c04ea59a9cccc948cfd24d.r2.dev/audio/google-file-system-2003-938820b9-2860-49cb-86d3-bf92f7eb16f5.m4a',NULL,'2026-04-15T09:47:22.753Z',933);
INSERT INTO "AudioItem" ("id","title","topic","course","filePath","duration","createdAt","lastPositionSeconds") VALUES('f66d040c-945f-4091-9fcb-ee24b3e192d7','Brook (CUDA) for GPUs: Stream Computing on Graphics Hardware','GPU Computing, Stream Processing, Parallel Programming, CUDA','High Performance Computing','https://pub-0aa4bf7443c04ea59a9cccc948cfd24d.r2.dev/audio/brook-cuda-for-gpus-stream-computing-on-graphics-cddf0bf3-b990-4715-9593-8a90aa96953a.m4a',NULL,'2026-04-15T12:35:30.449Z',728);
CREATE TABLE UploadAttempt (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
INSERT INTO "UploadAttempt" ("id","ip","createdAt") VALUES('590f4e9d-b9bd-41bf-80a3-ffa08a6749d5','80.116.140.138','2026-04-15T09:28:58.064Z');
INSERT INTO "UploadAttempt" ("id","ip","createdAt") VALUES('c1fc9d3f-2405-4df2-87e7-48be22338623','80.116.140.138','2026-04-15T09:47:20.423Z');
INSERT INTO "UploadAttempt" ("id","ip","createdAt") VALUES('31245fbb-618e-4724-928a-8244231bde0e','80.116.140.138','2026-04-15T12:35:28.628Z');
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE audio_topics (
  audio_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (audio_id, topic_id),
  FOREIGN KEY (audio_id) REFERENCES AudioItem(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);
CREATE INDEX idx_audio_item_created_at
ON AudioItem(createdAt DESC);
CREATE INDEX idx_upload_attempt_ip_created_at
    ON UploadAttempt(ip, createdAt)
  ;
CREATE INDEX idx_audio_item_course
ON AudioItem(course);
CREATE INDEX idx_audio_item_title
ON AudioItem(title);
CREATE INDEX idx_topics_name
ON topics(name);
CREATE INDEX idx_audio_topics_audio_id
ON audio_topics(audio_id);
CREATE INDEX idx_audio_topics_topic_id
ON audio_topics(topic_id);
