import Link from "next/link";
import { AudioCard } from "@/components/audio-card";
import { getAudioItems } from "@/lib/audio-repository";

export default async function HomePage() {
  const items = await getAudioItems();

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-line bg-panel px-8 py-10 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          Personal audio library
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-ink">
          Organizza podcast e sintesi paper in una libreria semplice e veloce.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Carica file audio, salva metadata essenziali e riprendi l&apos;ascolto
          dal punto giusto.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/upload"
            className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Carica un audio
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Libreria audio
          </h2>
          <p className="text-sm text-muted">{items.length} elementi</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl2 border border-dashed border-line bg-panel p-8 text-sm text-muted">
            Nessun audio presente. Vai su Upload per aggiungere il primo file.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <AudioCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
