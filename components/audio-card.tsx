import Link from "next/link";

type AudioCardProps = {
  item: {
    id: string;
    title: string;
    topics: string[];
    course: string;
    createdAt: Date;
    lastPositionSeconds: number;
  };
};

export function AudioCard({ item }: AudioCardProps) {
  const createdAt = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
  }).format(item.createdAt);

  return (
    <Link
      href={`/audio/${item.id}`}
      className="block rounded-xl2 border border-line bg-panel p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-ink/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted">
            {item.course}
          </p>
          <div>
            <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
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
        </div>
        <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-muted">
          {item.lastPositionSeconds > 0
            ? `Resume ${item.lastPositionSeconds}s`
            : "New"}
        </span>
      </div>
      <p className="mt-5 text-xs text-muted">Aggiunto il {createdAt}</p>
    </Link>
  );
}
