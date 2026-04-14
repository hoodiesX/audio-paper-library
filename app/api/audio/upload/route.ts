export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { createAudioStorageKey, isAllowedAudioFile } from "@/lib/audio";
import { createAudioItem } from "@/lib/audio-repository";
import { StorageEnv, uploadAudio } from "@/lib/storage";
import {
  isTurnstileEnabled,
  normalizeMetadataValue,
  checkUploadRateLimit,
  recordUploadAttempt,
  validateUploadFileSize,
  validateUploadMetadata,
  verifyTurnstileToken,
} from "@/lib/upload-security";

type CloudflareRequestEnv = Partial<
  StorageEnv & {
    TURNSTILE_ENABLED?: string;
    TURNSTILE_SECRET_KEY?: string;
  }
>;

export async function POST(request: Request) {
  console.log("[audio-upload] route entered");

  try {
    const rateLimit = await checkUploadRateLimit(request);

    if (!rateLimit.allowed) {
      console.log("[audio-upload] upload blocked by rate limiting");
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }

    const formData = await request.formData();
    console.log("[audio-upload] formData parsed");

    const title = normalizeMetadataValue(formData.get("title"));
    const topic = normalizeMetadataValue(formData.get("topic"));
    const course = normalizeMetadataValue(formData.get("course"));
    const file = formData.get("file");
    const turnstileToken = normalizeMetadataValue(formData.get("turnstileToken"));
    const { env } = getRequestContext();
    const runtimeEnv = env as CloudflareRequestEnv | undefined;

    const metadataValidation = validateUploadMetadata({
      title,
      topic,
      course,
    });

    if (!metadataValidation.valid) {
      console.log("[audio-upload] metadata validation failed");
      return NextResponse.json(
        { error: metadataValidation.message },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      console.log("[audio-upload] file missing or invalid");
      return NextResponse.json(
        { error: "File audio mancante." },
        { status: 400 },
      );
    }

    const fileSizeValidation = validateUploadFileSize(file);

    if (!fileSizeValidation.valid) {
      console.log("[audio-upload] upload rejected because file too large", {
        size: file.size,
      });
      return NextResponse.json(
        { error: fileSizeValidation.message },
        { status: 400 },
      );
    }

    if (!isAllowedAudioFile(file)) {
      console.log("[audio-upload] upload rejected because invalid type", {
        name: file.name,
        type: file.type,
      });
      return NextResponse.json(
        { error: "Formato non supportato. Usa MP3, M4A o WAV." },
        { status: 400 },
      );
    }

    console.log("[audio-upload] metadata validated", {
      title,
      topic,
      course,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    if (isTurnstileEnabled(runtimeEnv)) {
      if (!turnstileToken) {
        console.log("[audio-upload] Turnstile validation failed");
        return NextResponse.json(
          { error: "Verifica anti-bot mancante." },
          { status: 400 },
        );
      }

      const turnstileValid = await verifyTurnstileToken({
        token: turnstileToken,
        request,
        env: runtimeEnv,
      });

      if (!turnstileValid) {
        console.log("[audio-upload] Turnstile validation failed");
        return NextResponse.json(
          { error: "Verifica anti-bot non valida." },
          { status: 400 },
        );
      }
    }

    await recordUploadAttempt(rateLimit.ip, rateLimit.nowIso);

    if (!runtimeEnv?.AUDIO_BUCKET) {
      console.error("[audio-upload] missing AUDIO_BUCKET binding");
      return NextResponse.json(
        { error: "Storage audio non configurato correttamente." },
        { status: 500 },
      );
    }

    if (!runtimeEnv.PUBLIC_AUDIO_BASE_URL && !runtimeEnv.R2_PUBLIC_BASE_URL) {
      console.error("[audio-upload] missing public audio base URL");
      return NextResponse.json(
        { error: "PUBLIC_AUDIO_BASE_URL non configurato." },
        { status: 500 },
      );
    }

    const storageKey = createAudioStorageKey(title, file.name);
    console.log("[audio-upload] storage key generated", { storageKey });

    console.log("[audio-upload] R2 upload started");
    const filePath = await uploadAudio(file, storageKey, runtimeEnv as StorageEnv);
    console.log("[audio-upload] R2 upload completed", { filePath });

    console.log("[audio-upload] DB save started");
    const item = await createAudioItem({
      title,
      topic,
      course,
      filePath,
    });
    console.log("[audio-upload] DB save completed", { id: item.id });

    console.log("[audio-upload] response returned");
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[audio-upload] thrown error", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore interno durante l'upload.",
      },
      { status: 500 },
    );
  }
}
