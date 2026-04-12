import { NextResponse } from "next/server";
import { getAudioItemById } from "@/lib/audio-repository";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = context.params;

  const item = await getAudioItemById(id);

  if (!item) {
    return NextResponse.json({ error: "Audio non trovato." }, { status: 404 });
  }

  return NextResponse.json(item);
}
