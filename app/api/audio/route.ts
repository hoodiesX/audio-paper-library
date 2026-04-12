export const runtime = "edge";
import { NextResponse } from "next/server";
import { getAudioItems } from "@/lib/audio-repository";


export async function GET() {
  const items = await getAudioItems();

  return NextResponse.json(items);
}
