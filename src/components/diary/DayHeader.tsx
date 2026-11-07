import Link from "next/link";

type DayHeaderProps = {
  label: string;
  prevKey: string;
  nextKey: string;
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="12"
      height="20"
      viewBox="0 0 12 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={direction === "left" ? "M10 2 2 10l8 8" : "M2 2l8 8-8 8"} />
    </svg>
  );
}

export function DayHeader({ label, prevKey, nextKey }: DayHeaderProps) {
  return (
    <header className="flex items-center justify-center gap-6 pt-1">
      <Link
        href={`/diary/${prevKey}`}
        className="flex h-11 w-11 items-center justify-center text-accent transition active:opacity-50"
        aria-label="Previous day"
      >
        <Chevron direction="left" />
      </Link>
      <h1 className="min-w-[8rem] text-center text-[17px] font-semibold">
        {label}
      </h1>
      <Link
        href={`/diary/${nextKey}`}
        className="flex h-11 w-11 items-center justify-center text-accent transition active:opacity-50"
        aria-label="Next day"
      >
        <Chevron direction="right" />
      </Link>
    </header>
  );
}
