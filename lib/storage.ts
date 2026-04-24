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
  delete: (key: string) => Promise<unknown>;
};

export type StorageEnv = {
  AUDIO_BUCKET: R2BucketLike;
  PUBLIC_AUDIO_BASE_URL?: string;
  R2_PUBLIC_BASE_URL?: string;
};

function normalizePublicBaseUrl(env?: Pick<
  StorageEnv,
  "PUBLIC_AUDIO_BASE_URL" | "R2_PUBLIC_BASE_URL"
>) {
  const baseUrl = env?.PUBLIC_AUDIO_BASE_URL || env?.R2_PUBLIC_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "PUBLIC_AUDIO_BASE_URL binding is missing in Cloudflare environment.",
    );
  }

  return baseUrl.replace(/\/$/, "");
}
export async function uploadAudio(
  file: ArrayBuffer | Blob,
  key: string,
  env: StorageEnv,
): Promise<string> {
  if (!env?.AUDIO_BUCKET) {
    throw new Error(
      "R2 bucket binding is not configured. Add an AUDIO_BUCKET binding in Cloudflare Pages.",
    );
  }

  const body = file instanceof Blob ? file : new Blob([file]);

  await env.AUDIO_BUCKET.put(key, body, {
    httpMetadata: {
      contentType: body.type || "application/octet-stream",
    },
  });

  return getAudioUrl(key, env);
}

export function getAudioUrl(
  key: string,
  env?: Pick<StorageEnv, "PUBLIC_AUDIO_BASE_URL" | "R2_PUBLIC_BASE_URL">,
): string {
  if (/^https?:\/\//i.test(key)) {
    return key;
  }

  const baseUrl = normalizePublicBaseUrl(env);
  const normalizedKey = key.replace(/^\/+/, "");

  return `${baseUrl}/${normalizedKey}`;
}

export async function deleteAudioObject(key: string, env: StorageEnv) {
  if (!env?.AUDIO_BUCKET) {
    throw new Error(
      "R2 bucket binding is not configured. Add an AUDIO_BUCKET binding in Cloudflare Pages.",
    );
  }

  const normalizedKey = key.replace(/^\/+/, "");

  await env.AUDIO_BUCKET.delete(normalizedKey);
}

export function getStorageKeyFromFilePath(filePath: string): string {
  const normalizedFilePath = filePath.trim();

  if (!normalizedFilePath) {
    throw new Error("Audio filePath is empty and cannot be mapped to an R2 key.");
  }

  if (/^https?:\/\//i.test(normalizedFilePath)) {
    const url = new URL(normalizedFilePath);
    const key = url.pathname.replace(/^\/+/, "");

    if (!key) {
      throw new Error("Audio filePath URL does not contain a valid object key.");
    }

    return key;
  }

  return normalizedFilePath.replace(/^\/+/, "");
}
