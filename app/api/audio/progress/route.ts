import { NextResponse } from "next/server";
import { updateAudioProgress } from "@/lib/audio-repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      lastPositionSeconds?: number;
    };

    if (!body.id || typeof body.lastPositionSeconds !== "number") {
      return NextResponse.json(
        { error: "id e lastPositionSeconds sono obbligatori." },
        { status: 400 },
      );
    }

    const item = await updateAudioProgress(body.id, body.lastPositionSeconds);

    return NextResponse.json(item);
  } catch (error) {
    console.error("Progress update failed", error);

    return NextResponse.json(
      { error: "Errore durante il salvataggio del progresso." },
      { status: 500 },
    );
  }
}
