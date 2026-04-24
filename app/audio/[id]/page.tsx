export const runtime = "edge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioPlayer } from "@/components/audio-player";
import { getAudioItemById } from "@/lib/audio-repository";

type AudioDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function AudioDetailPage({
  params,
}: AudioDetailPageProps) {
  const { id } = params;

  const item = await getAudioItemById(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Torna alla libreria
        </Link>
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
            Audio detail
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            {item.title}
          </h1>
          <p className="max-w-2xl text-base text-muted">
            Riprendi l&apos;ascolto con un player piu pulito, controlli rapidi e
            progresso sempre visibile.
          </p>
        </div>
      </div>

      <section className="sticky top-4 z-10">
        <AudioPlayer
          audioId={item.id}
          filePath={item.filePath}
          initialPosition={item.lastPositionSeconds}
          title={item.title}
          topics={item.topics}
          course={item.course}
        />
      </section>

      <section className="grid gap-4 rounded-xl2 border border-line bg-panel p-6 shadow-soft md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Topic / tag</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-muted"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Corso</p>
          <p className="mt-2 text-sm text-ink">{item.course}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">
            Ultima posizione
          </p>
          <p className="mt-2 text-sm text-ink">
            {item.lastPositionSeconds} secondi
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">
            File
          </p>
          <p className="mt-2 break-all text-sm text-ink">{item.filePath}</p>
        </div>
      </section>
    </div>
  );
}
