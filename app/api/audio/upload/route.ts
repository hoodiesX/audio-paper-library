export const runtime = "edge";
import { NextResponse } from "next/server";
import { createAudioStorageKey, isAllowedAudioFile } from "@/lib/audio";
import { createAudioItem } from "@/lib/audio-repository";
import { StorageEnv, uploadAudio } from "@/lib/storage";

type UploadRouteContext = {
  env?: StorageEnv;
  cloudflare?: {
    env?: StorageEnv;
  };
};

function getStorageEnv(context: UploadRouteContext) {
  return context.env ?? context.cloudflare?.env;
}

export async function POST(request: Request, context: UploadRouteContext) {
  console.log("[audio-upload] route entered");

  try {
    const formData = await request.formData();
    console.log("[audio-upload] formData parsed");

    const title = String(formData.get("title") || "").trim();
    const topic = String(formData.get("topic") || "").trim();
    const course = String(formData.get("course") || "").trim();
    const file = formData.get("file");
    const env = getStorageEnv(context);

    if (!title || !topic || !course) {
      console.log("[audio-upload] missing required metadata");
      return NextResponse.json(
        { error: "Titolo, topic e corso sono obbligatori." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      console.log("[audio-upload] file not found");
      return NextResponse.json(
        { error: "File audio mancante." },
        { status: 400 },
      );
    }

    console.log("[audio-upload] file found", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!isAllowedAudioFile(file)) {
      console.log("[audio-upload] unsupported file format");
      return NextResponse.json(
        { error: "Formato non supportato. Usa MP3, M4A o WAV." },
        { status: 400 },
      );
    }

    if (!env?.AUDIO_BUCKET) {
      console.error("[audio-upload] missing AUDIO_BUCKET binding");
      return NextResponse.json(
        { error: "Storage audio non configurato correttamente." },
        { status: 500 },
      );
    }

    const storageKey = createAudioStorageKey(title, file.name);
    console.log("[audio-upload] storage key generated", { storageKey });

    console.log("[audio-upload] R2 upload started");
    const filePath = await uploadAudio(file, storageKey, env);
    console.log("[audio-upload] R2 upload completed", { filePath });

    console.log("[audio-upload] DB save started");
    const item = await createAudioItem({
      title,
      topic,
      course,
      filePath,
    });
    console.log("[audio-upload] DB save completed", { id: item.id });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[audio-upload] thrown error", error);

    return NextResponse.json(
      { error: "Errore interno durante l'upload." },
      { status: 500 },
    );
  }
}
