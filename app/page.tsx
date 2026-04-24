export const runtime = "edge";
import Link from "next/link";
import { AudioCard } from "@/components/audio-card";
import {
  TopicFilterMode,
  getAudioFilterOptions,
  searchAudios,
} from "@/lib/audio-repository";
import { normalizeTopics } from "@/lib/topics";

type HomePageProps = {
  searchParams?: {
    query?: string | string[];
    topic?: string | string[];
    topics?: string | string[];
    course?: string | string[];
    topicMode?: string | string[];
  };
};

type HomeSearchState = {
  selectedQuery?: string;
  selectedCourse?: string;
  selectedTopics: string[];
  topicMode: TopicFilterMode;
  hasActiveFilters: boolean;
};

type ActiveFilterLink = {
  key: string;
  label: string;
  href: string;
};

function normalizeQueryParam(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const trimmedValue = rawValue?.trim().replace(/\s+/g, " ");
  return trimmedValue ? trimmedValue : undefined;
}

function getMultiValueQueryParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function normalizeTopicMode(value?: string | string[]): TopicFilterMode {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "and" ? "and" : "or";
}

function buildFilterHref(input: {
  query?: string;
  course?: string;
  topics?: string[];
  topicMode?: TopicFilterMode;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("query", input.query);
  }

  if (input.course) {
    params.set("course", input.course);
  }

  for (const topic of input.topics ?? []) {
    params.append("topics", topic);
  }

  if ((input.topics?.length ?? 0) > 1 && input.topicMode === "and") {
    params.set("topicMode", "and");
  }

  const queryString = params.toString();

  return queryString ? `/?${queryString}` : "/";
}

function parseHomeSearchState(
  searchParams?: HomePageProps["searchParams"],
): HomeSearchState {
  const selectedQuery = normalizeQueryParam(searchParams?.query);
  const selectedCourse = normalizeQueryParam(searchParams?.course);
  const selectedTopics = normalizeTopics([
    ...getMultiValueQueryParam(searchParams?.topics),
    ...getMultiValueQueryParam(searchParams?.topic),
  ]);
  const topicMode = normalizeTopicMode(searchParams?.topicMode);

  return {
    selectedQuery,
    selectedCourse,
    selectedTopics,
    topicMode,
    hasActiveFilters: Boolean(
      selectedQuery || selectedCourse || selectedTopics.length > 0,
    ),
  };
}

function getActiveFilterLinks(state: HomeSearchState): ActiveFilterLink[] {
  const links: ActiveFilterLink[] = [];

  if (state.selectedQuery) {
    links.push({
      key: "query",
      label: `Query: ${state.selectedQuery} ×`,
      href: buildFilterHref({
        course: state.selectedCourse,
        topics: state.selectedTopics,
        topicMode: state.topicMode,
      }),
    });
  }

  if (state.selectedCourse) {
    links.push({
      key: "course",
      label: `Corso: ${state.selectedCourse} ×`,
      href: buildFilterHref({
        query: state.selectedQuery,
        topics: state.selectedTopics,
        topicMode: state.topicMode,
      }),
    });
  }

  for (const topic of state.selectedTopics) {
    links.push({
      key: `topic-${topic}`,
      label: `Topic: ${topic} ×`,
      href: buildFilterHref({
        query: state.selectedQuery,
        course: state.selectedCourse,
        topics: state.selectedTopics.filter(
          (selectedTopic) => selectedTopic !== topic,
        ),
        topicMode: state.topicMode,
      }),
    });
  }

  return links;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const searchState = parseHomeSearchState(searchParams);
  const {
    selectedQuery,
    selectedCourse,
    selectedTopics,
    topicMode,
    hasActiveFilters,
  } = searchState;

  const [items, filterOptions] = await Promise.all([
    searchAudios({
      query: selectedQuery,
      topics: selectedTopics,
      course: selectedCourse,
      topicMode,
    }),
    getAudioFilterOptions(),
  ]);

  const activeFilterLinks = getActiveFilterLinks(searchState);
  const resultsLabel = `${items.length} ${items.length === 1 ? "elemento" : "elementi"}`;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-line bg-panel px-8 py-10 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          Personal audio library
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-ink">
          Organizza podcast, sintesi paper e lezioni in una libreria semplice e veloce.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Cerca per testo libero, combina topic multipli e filtra per corso con
          URL condivisibili.
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
        <div className="rounded-xl2 border border-line bg-panel p-5 shadow-soft">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink">
                Libreria audio
              </h2>
              <p className="mt-1 text-sm text-muted">
                Combina ricerca testuale, topic multipli e corso senza perdere i
                filtri al refresh.
              </p>
            </div>
            {selectedTopics.length > 1 ? (
              <p className="text-sm text-muted">
                Match topic: {topicMode === "and" ? "AND" : "OR"}
              </p>
            ) : null}
          </div>

          <form className="mt-5 space-y-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.8fr)_180px]">
              <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                <span>Ricerca testuale</span>
                <input
                  type="search"
                  name="query"
                  defaultValue={selectedQuery ?? ""}
                  placeholder="Es. transformer, paper, zero trust"
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                <span>Corso</span>
                <select
                  name="course"
                  defaultValue={selectedCourse ?? ""}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
                >
                  <option value="">Tutti i corsi</option>
                  {filterOptions.courses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-ink">
                <span>Match topic</span>
                <select
                  name="topicMode"
                  defaultValue={topicMode}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ink/20 focus:ring-2 focus:ring-ink/5"
                >
                  <option value="or">Almeno uno (OR)</option>
                  <option value="and">Tutti i selezionati (AND)</option>
                </select>
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">Topic</p>
                  <p className="text-xs text-muted">
                    Seleziona uno o piu tag esistenti. Il filtro e condivisibile via URL.
                  </p>
                </div>
              </div>

              {filterOptions.topics.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line bg-canvas px-4 py-3 text-sm text-muted">
                  Nessun topic disponibile. Carica il primo audio per iniziare a filtrare.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filterOptions.topics.map((topic) => {
                    const isSelected = selectedTopics.includes(topic);

                    return (
                      <label key={topic} className="cursor-pointer">
                        <input
                          type="checkbox"
                          name="topics"
                          value={topic}
                          defaultChecked={isSelected}
                          className="peer sr-only"
                        />
                        <span className="inline-flex rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-muted transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white">
                          {topic}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Cerca
              </button>

              {hasActiveFilters ? (
                <Link
                  href="/"
                  className="rounded-full border border-line px-5 py-3 text-sm font-medium text-muted transition hover:border-ink/10 hover:text-ink"
                >
                  Reset
                </Link>
              ) : null}
            </div>
          </form>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted">{resultsLabel}</p>

          {hasActiveFilters ? (
            <div className="flex flex-wrap gap-2">
              {activeFilterLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-muted transition hover:border-ink/10 hover:text-ink"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl2 border border-dashed border-line bg-panel p-8 text-sm text-muted">
            {hasActiveFilters
              ? "Nessun audio corrisponde ai filtri correnti. Modifica query, topic o corso per ampliare la ricerca."
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
