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

function isCloudflareRuntime() {
  return process.env.CF_PAGES === "1";
}

function shouldUseD1() {
  return (
    isCloudflareRuntime() ||
    process.env.USE_D1 === "true" ||
    Boolean(
      process.env.CLOUDFLARE_ACCOUNT_ID &&
        process.env.CLOUDFLARE_D1_DATABASE_ID &&
        process.env.CLOUDFLARE_D1_API_TOKEN,
    )
  );
}

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
  if (shouldUseD1()) {
    console.log("[audio-repository] using D1 for read: getAudioItems");

    const rows = await query<D1AudioItemRow>(
      `SELECT id, title, topic, course, filePath, duration, createdAt, lastPositionSeconds
       FROM AudioItem
       ORDER BY createdAt DESC`,
    );

    console.log("[audio-repository] audio item read", {
      source: "D1",
      count: rows.length,
    });

    return rows.map(mapD1Row);
  }

  console.log("[audio-repository] using local Prisma fallback: getAudioItems");
  const prisma = await getPrismaClient();
  return prisma.audioItem.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getAudioItemById(id: string) {
  if (shouldUseD1()) {
    console.log("[audio-repository] using D1 for read: getAudioItemById", {
      id,
    });

    const rows = await query<D1AudioItemRow>(
      `SELECT id, title, topic, course, filePath, duration, createdAt, lastPositionSeconds
       FROM AudioItem
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    console.log("[audio-repository] audio item read", {
      source: "D1",
      id,
      found: Boolean(rows[0]),
    });

    return rows[0] ? mapD1Row(rows[0]) : null;
  }

  console.log("[audio-repository] using local Prisma fallback: getAudioItemById", {
    id,
  });
  const prisma = await getPrismaClient();
  return prisma.audioItem.findUnique({
    where: { id },
  });
}

export async function createAudioItem(data: CreateAudioItemInput) {
  if (shouldUseD1()) {
    console.log("[audio-repository] using D1 for write: createAudioItem", {
      title: data.title,
      topic: data.topic,
      course: data.course,
    });

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

    console.log("[audio-repository] audio item create", {
      source: "D1",
      id: item.id,
    });

    return item;
  }

  console.log("[audio-repository] using local Prisma fallback: createAudioItem", {
    title: data.title,
    topic: data.topic,
    course: data.course,
  });
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

  if (shouldUseD1()) {
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

    console.log("[audio-repository] progress update", {
      source: "D1",
      id,
      position: nextPosition,
    });

    return updatedItem;
  }

  console.log("[audio-repository] using local Prisma fallback: updateAudioProgress", {
    id,
    position: nextPosition,
  });
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
