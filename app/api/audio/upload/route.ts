import { NextResponse } from "next/server";
import { isAllowedAudioFile, saveUploadedAudio } from "@/lib/audio";
import { createAudioItem } from "@/lib/audio-repository";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const title = String(formData.get("title") || "").trim();
    const topic = String(formData.get("topic") || "").trim();
    const course = String(formData.get("course") || "").trim();
    const file = formData.get("file");

    if (!title || !topic || !course) {
      return NextResponse.json(
        { error: "Titolo, topic e corso sono obbligatori." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File audio mancante." },
        { status: 400 },
      );
    }

    if (!isAllowedAudioFile(file)) {
      return NextResponse.json(
        { error: "Formato non supportato. Usa MP3, M4A o WAV." },
        { status: 400 },
      );
    }

    const filePath = await saveUploadedAudio(file);

    const item = await createAudioItem({
      title,
      topic,
      course,
      filePath,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Upload failed", error);

    return NextResponse.json(
      { error: "Errore interno durante l'upload." },
      { status: 500 },
    );
  }
}
