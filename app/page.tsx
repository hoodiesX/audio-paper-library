export const runtime = "edge";
import Link from "next/link";
import { AudioCard } from "@/components/audio-card";
import { getAudioFilterOptions, getAudioItems } from "@/lib/audio-repository";

type HomePageProps = {
  searchParams?: {
    topic?: string;
    course?: string;
  };
};

function normalizeQueryParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}
export default async function HomePage({ searchParams }: HomePageProps) {
  const selectedTopic = normalizeQueryParam(searchParams?.topic);
  const selectedCourse = normalizeQueryParam(searchParams?.course);

  const [items, filterOptions] = await Promise.all([
    getAudioItems({
      topic: selectedTopic,
      course: selectedCourse,
    }),
    getAudioFilterOptions(),
  ]);

  const hasActiveFilters = Boolean(selectedTopic || selectedCourse);

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
        <div className="flex flex-col gap-4 rounded-xl2 border border-line bg-panel p-5 shadow-soft md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              Libreria audio
            </h2>
            <p className="mt-1 text-sm text-muted">
              Filtra per topic o corso per ritrovare piu velocemente i contenuti.
            </p>
          </div>

          <form className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              <span>Topic</span>
              <select
                name="topic"
                defaultValue={selectedTopic ?? ""}
                className="min-w-[180px] rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
              >
                <option value="">Tutti i topic</option>
                {filterOptions.topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-ink">
              <span>Corso</span>
              <select
                name="course"
                defaultValue={selectedCourse ?? ""}
                className="min-w-[180px] rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
              >
                <option value="">Tutti i corsi</option>
                {filterOptions.courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Applica
            </button>

            {hasActiveFilters ? (
              <Link
                href="/"
                className="rounded-full border border-line px-5 py-3 text-sm font-medium text-muted transition hover:border-ink/10 hover:text-ink"
              >
                Reset
              </Link>
            ) : null}
          </form>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{items.length} elementi</p>
          {hasActiveFilters ? (
            <p className="text-sm text-muted">
              {selectedTopic ? `Topic: ${selectedTopic}` : "Tutti i topic"}
              {" · "}
              {selectedCourse ? `Corso: ${selectedCourse}` : "Tutti i corsi"}
            </p>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl2 border border-dashed border-line bg-panel p-8 text-sm text-muted">
            {hasActiveFilters
              ? "Nessun audio corrisponde ai filtri selezionati. Prova a resettarli o a scegliere una combinazione diversa."
              : "Nessun audio presente. Vai su Upload per aggiungere il primo file."}
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
