"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { TOPICS_INPUT_MAX_LENGTH, normalizeTopics } from "@/lib/topics";

declare global {
  interface Window {
    audioPaperLibraryTurnstileCallback?: (token: string) => void;
  }
}

type UploadFormProps = {
  turnstileEnabled?: boolean;
  turnstileSiteKey?: string;
};

export function UploadForm({
  turnstileEnabled = false,
  turnstileSiteKey = "",
}: UploadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [topicsInput, setTopicsInput] = useState("");

  const topicPreview = normalizeTopics(topicsInput);

  useEffect(() => {
    if (!turnstileEnabled) {
      return;
    }

    window.audioPaperLibraryTurnstileCallback = (token: string) => {
      setTurnstileToken(token);
    };

    return () => {
      delete window.audioPaperLibraryTurnstileCallback;
    };
  }, [turnstileEnabled]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/audio/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string; id?: string };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error || "Upload non riuscito.");
      }

      router.push(`/audio/${payload.id}`);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Si e verificato un errore durante l'upload.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {turnstileEnabled && turnstileSiteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        />
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl2 border border-line bg-panel p-6 shadow-soft"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink" htmlFor="title">
            Titolo
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
            placeholder="Es. Deep Learning for Biology"
            type="text"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="topics">
              Topic / tag
            </label>
            <input
              id="topics"
              name="topics"
              required
              maxLength={TOPICS_INPUT_MAX_LENGTH}
              value={topicsInput}
              onChange={(event) => setTopicsInput(event.target.value)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
              placeholder="AI, calcolo parallelo, cybersecurity"
              type="text"
            />
            <p className="text-xs text-muted">
              Separa i topic con una virgola. Verranno normalizzati e i duplicati
              saranno rimossi.
            </p>
            {topicPreview.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topicPreview.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-muted"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-ink" htmlFor="course">
              Corso
            </label>
            <input
              id="course"
              name="course"
              required
              maxLength={80}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
              placeholder="Machine Learning"
              type="text"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink" htmlFor="file">
            File audio
          </label>
          <input
            id="file"
            name="file"
            required
            accept=".mp3,.m4a,.wav,audio/*"
            className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
            type="file"
          />
          <p className="text-xs text-muted">Dimensione massima: 50 MB.</p>
        </div>

        {turnstileEnabled && turnstileSiteKey ? (
          <div className="space-y-2">
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-callback="audioPaperLibraryTurnstileCallback"
            />
            <input type="hidden" name="turnstileToken" value={turnstileToken} />
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Caricamento..." : "Carica audio"}
        </button>
      </form>
    </>
  );
}
