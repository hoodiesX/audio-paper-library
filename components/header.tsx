import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-line bg-panel/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
          Audio Paper Library
        </Link>
        <nav className="flex items-center gap-3 text-sm text-muted">
          <Link
            href="/"
            className="rounded-full px-4 py-2 transition hover:bg-canvas hover:text-ink"
          >
            Home
          </Link>
          <Link
            href="/upload"
            className="rounded-full bg-ink px-4 py-2 font-medium text-white transition hover:opacity-90"
          >
            Upload
          </Link>
        </nav>
      </div>
    </header>
  );
}
