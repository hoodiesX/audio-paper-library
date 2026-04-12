import { query } from "@/lib/d1-client";

type CreateAudioItemInput = {
  title: string;
  topic: string;
  course: string;
  filePath: string;
  duration?: number | null;
};

type AudioItemRecord = {
  id: string;
  title: string;
  topic: string;
  course: string;
  filePath: string;
  duration: number | null;
  createdAt: Date;
  lastPositionSeconds: number;
};

type D1AudioItemRow = {
  id: string;
  title: string;
  topic: string;
  course: string;
  filePath: string;
  duration: number | string | null;
  createdAt: string;
  lastPositionSeconds: number | string;
};

const USE_D1 = process.env.USE_D1 === "true";

async function getPrismaClient() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

function mapD1Row(row: D1AudioItemRow): AudioItemRecord {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    course: row.course,
    filePath: row.filePath,
    duration:
      row.duration === null || row.duration === undefined
        ? null
        : Number(row.duration),
    createdAt: new Date(row.createdAt),
    lastPositionSeconds: Number(row.lastPositionSeconds ?? 0),
  };
}

export async function getAudioItems() {
  if (USE_D1) {
    console.log("Using D1 for read");

    // TODO: Replace Prisma path entirely after D1 rollout is verified.
    // SQL equivalent:
    // SELECT id, title, topic, course, filePath, duration, createdAt, lastPositionSeconds
    // FROM AudioItem
    // ORDER BY createdAt DESC;
    const rows = await query<D1AudioItemRow>(
      `SELECT id, title, topic, course, filePath, duration, createdAt, lastPositionSeconds
       FROM AudioItem
       ORDER BY createdAt DESC`,
    );

    return rows.map(mapD1Row);
  }

  console.log("Using Prisma for read");

  // TODO: Replace Prisma with D1 query:
  // SELECT * FROM AudioItem ORDER BY createdAt DESC;
  const prisma = await getPrismaClient();
  return prisma.audioItem.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getAudioItemById(id: string) {
  if (USE_D1) {
    console.log("Using D1 for read");

    // TODO: Replace Prisma path entirely after D1 rollout is verified.
    // SQL equivalent:
    // SELECT id, title, topic, course, filePath, duration, createdAt, lastPositionSeconds
    // FROM AudioItem
    // WHERE id = ?
    // LIMIT 1;
    const rows = await query<D1AudioItemRow>(
      `SELECT id, title, topic, course, filePath, duration, createdAt, lastPositionSeconds
       FROM AudioItem
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    return rows[0] ? mapD1Row(rows[0]) : null;
  }

  console.log("Using Prisma for read");

  // TODO: Replace Prisma with D1 query:
  // SELECT * FROM AudioItem WHERE id = ? LIMIT 1;
  const prisma = await getPrismaClient();
  return prisma.audioItem.findUnique({
    where: { id },
  });
}

export async function createAudioItem(data: CreateAudioItemInput) {
  if (USE_D1) {
    console.log("Using D1 for write");

    const item: AudioItemRecord = {
      id: crypto.randomUUID(),
      title: data.title,
      topic: data.topic,
      course: data.course,
      filePath: data.filePath,
      duration: data.duration ?? null,
      createdAt: new Date(),
      lastPositionSeconds: 0,
    };

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
        item.createdAt.toISOString(),
        item.lastPositionSeconds,
      ],
    );

    return item;
  }

  console.log("Using Prisma for write");

  // TODO: Replace Prisma with D1 query:
  // INSERT INTO AudioItem (id, title, topic, course, filePath, duration, createdAt, lastPositionSeconds)
  // VALUES (?, ?, ?, ?, ?, ?, ?, 0);
  const prisma = await getPrismaClient();
  return prisma.audioItem.create({
    data: {
      title: data.title,
      topic: data.topic,
      course: data.course,
      filePath: data.filePath,
      duration: data.duration ?? null,
    },
  });
}

export async function updateAudioProgress(id: string, position: number) {
  const nextPosition = Math.max(0, Math.floor(position));

  if (USE_D1) {
    console.log("Using D1 for write");

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

  console.log("Using Prisma for write");

  // TODO: Replace Prisma with D1 query:
  // UPDATE AudioItem SET lastPositionSeconds = ? WHERE id = ?;
  const prisma = await getPrismaClient();
  return prisma.audioItem.update({
    where: {
      id,
    },
    data: {
      lastPositionSeconds: nextPosition,
    },
  });
}
