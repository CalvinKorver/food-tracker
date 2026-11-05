import Link from "next/link";

type DayHeaderProps = {
  label: string;
  prevKey: string;
  nextKey: string;
};

export function DayHeader({ label, prevKey, nextKey }: DayHeaderProps) {
  return (
    <header className="flex items-center justify-between pt-1">
      <span className="w-8" aria-hidden />
      <div className="flex items-center gap-3">
        <Link
          href={`/diary/${prevKey}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-muted transition hover:bg-surface hover:text-text"
          aria-label="Previous day"
        >
          ‹
        </Link>
        <h1 className="min-w-[8rem] text-center text-lg font-semibold tracking-tight">
          {label}
        </h1>
        <Link
          href={`/diary/${nextKey}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-muted transition hover:bg-surface hover:text-text"
          aria-label="Next day"
        >
          ›
        </Link>
      </div>
      <span className="w-8" aria-hidden />
    </header>
  );
}
