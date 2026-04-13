export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

type CloudflareEnv = {
  AUDIO_BUCKET?: unknown;
};

export async function POST() {
  console.log("[audio-upload-debug] route entered");

  try {
    const requestContext = getRequestContext();
    const env = requestContext?.env as CloudflareEnv | undefined;

    const hasEnv = Boolean(env);
    const envKeys = env ? Object.keys(env) : [];
    const hasAudioBucket = Boolean(env?.AUDIO_BUCKET);

    console.log("[audio-upload-debug] request context inspected", {
      hasEnv,
      envKeys,
      hasAudioBucket,
    });

    console.log("[audio-upload-debug] returning diagnostic response");

    return NextResponse.json({
      hasEnv,
      envKeys,
      hasAudioBucket,
    });
  } catch (error) {
    console.error("[audio-upload-debug] thrown error", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown request context diagnostic error.",
      },
      { status: 500 },
    );
  }
}
