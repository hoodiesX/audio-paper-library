"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function UploadForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
          placeholder="Es. Deep Learning for Biology"
          type="text"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink" htmlFor="topic">
            Topic
          </label>
          <input
            id="topic"
            name="topic"
            required
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
            placeholder="AI, neuroscience, econometrics"
            type="text"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink" htmlFor="course">
            Corso
          </label>
          <input
            id="course"
            name="course"
            required
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
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Caricamento..." : "Carica audio"}
      </button>
    </form>
  );
}
