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

function getR2Bucket() {
  const globalScope = globalThis as typeof globalThis & {
    AUDIO_BUCKET?: R2BucketLike;
    __AUDIO_PAPER_LIBRARY_R2__?: R2BucketLike;
  };

  return globalScope.AUDIO_BUCKET ?? globalScope.__AUDIO_PAPER_LIBRARY_R2__;
}

function normalizePublicBaseUrl() {
  const globalScope = globalThis as typeof globalThis & {
    PUBLIC_AUDIO_BASE_URL?: string;
  };

  const baseUrl = globalScope.PUBLIC_AUDIO_BASE_URL;

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
): Promise<string> {
  const bucket = getR2Bucket();

  if (!bucket) {
    throw new Error(
      "R2 bucket binding is not configured. Add an AUDIO_BUCKET binding in Cloudflare Pages.",
    );
  }

  const body = file instanceof Blob ? file : new Blob([file]);

  await bucket.put(key, body, {
    httpMetadata: {
      contentType: body.type || "application/octet-stream",
    },
  });

  return getAudioUrl(key);
}

export function getAudioUrl(key: string): string {
  if (/^https?:\/\//i.test(key)) {
    return key;
  }

  const baseUrl = normalizePublicBaseUrl();
  const normalizedKey = key.replace(/^\/+/, "");

  return `${baseUrl}/${normalizedKey}`;
}
