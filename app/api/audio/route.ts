export const runtime = "edge";
import { NextResponse } from "next/server";
import { searchAudios } from "@/lib/audio-repository";
import { normalizeTopics } from "@/lib/topics";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const items = await searchAudios({
    query: searchParams.get("query") ?? undefined,
    topics: normalizeTopics([
      ...searchParams.getAll("topics"),
      searchParams.get("topic") ?? "",
    ]),
    course: searchParams.get("course") ?? undefined,
    topicMode:
      searchParams.get("topicMode") === "and" ? "and" : "or",
  });

  return NextResponse.json(items);
}
