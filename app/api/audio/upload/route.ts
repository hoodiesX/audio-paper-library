export const runtime = "edge";

import { NextResponse } from "next/server";

type R2PutOptions = {
  httpMetadata?: {
    contentType?: string;
  };
};

type R2BucketLike = {
  put: (
    key: string,
    value: ArrayBuffer | Blob,
    options?: R2PutOptions,
  ) => Promise<unknown>;
};

type UploadRouteContext = {
  env?: {
    AUDIO_BUCKET?: R2BucketLike;
  };
  cloudflare?: {
    env?: {
      AUDIO_BUCKET?: R2BucketLike;
    };
  };
};

function getBucket(context: UploadRouteContext) {
  return context.env?.AUDIO_BUCKET ?? context.cloudflare?.env?.AUDIO_BUCKET;
}

export async function POST(request: Request, context: UploadRouteContext) {
  console.log("[audio-upload-debug] route entered");

  try {
    const formData = await request.formData();
    console.log("[audio-upload-debug] formData parsed");

    const title = String(formData.get("title") || "").trim();
    const topic = String(formData.get("topic") || "").trim();
    const course = String(formData.get("course") || "").trim();
    const file = formData.get("file");

    console.log("[audio-upload-debug] fields read", {
      title,
      topic,
      course,
      hasFile: file instanceof File,
    });

    if (!(file instanceof File)) {
      console.log("[audio-upload-debug] file not found");
      return NextResponse.json(
        { error: "File audio mancante." },
        { status: 400 },
      );
    }

    console.log("[audio-upload-debug] file found", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const fileBuffer = await file.arrayBuffer();
    console.log("[audio-upload-debug] file arrayBuffer created", {
      bytes: fileBuffer.byteLength,
    });

    const bucket = getBucket(context);
    console.log("[audio-upload-debug] bucket resolved", {
      hasBucket: Boolean(bucket),
    });

    if (!bucket) {
      return NextResponse.json(
        { error: "AUDIO_BUCKET binding not found." },
        { status: 500 },
      );
    }

    const key = "debug/test-upload.mp3";
    console.log("[audio-upload-debug] bucket put started", { key });

    await bucket.put(key, fileBuffer, {
      httpMetadata: {
        contentType: file.type || "audio/mpeg",
      },
    });

    console.log("[audio-upload-debug] bucket put completed", { key });
    console.log("[audio-upload-debug] returning response");

    return NextResponse.json({
      ok: true,
      key,
      title,
      topic,
      course,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("[audio-upload-debug] thrown error", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown upload error.",
      },
      { status: 500 },
    );
  }
}
