"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: "discover" | "diary" | "foods" | "more";
  col: 0 | 1 | 3 | 4;
};

const items: NavItem[] = [
  { href: "/discover", label: "Discover", icon: "discover", col: 0 },
  { href: "/diary/today", label: "Diary", icon: "diary", col: 1 },
  { href: "/foods", label: "Foods", icon: "foods", col: 3 },
  { href: "/more", label: "More", icon: "more", col: 4 },
];

function isActive(pathname: string, href: string) {
  if (href.startsWith("/diary")) {
    return pathname.startsWith("/diary");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function activeCol(pathname: string): number {
  const hit = items.find((item) => isActive(pathname, item.href));
  return hit?.col ?? -1;
}

function NavIcon({
  icon,
  active,
}: {
  icon: NavItem["icon"];
  active: boolean;
}) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: active ? "var(--text)" : "var(--text-muted)",
    fillRule: "evenodd" as const,
    "aria-hidden": true as const,
  };

  switch (icon) {
    case "discover":
      return (
        <svg {...common}>
          <rect x="3" y="13" width="4.5" height="8" rx="1.2" />
          <rect x="9.75" y="8" width="4.5" height="13" rx="1.2" />
          <rect x="16.5" y="3" width="4.5" height="18" rx="1.2" />
        </svg>
      );
    case "diary":
      return (
        <svg {...common}>
          <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8.5 6.5v1.6h7V6.5zM8.5 10.5v1.6h7v-1.6zM8.5 14.5v1.6h4.5v-1.6z" />
        </svg>
      );
    case "foods":
      return (
        <svg {...common}>
          <path d="M12 7.2c-1-.9-2.6-1.4-4-.9-2.6.9-3.6 4-2.9 7.1.7 3.1 2.8 6.1 4.9 6.1.8 0 1.3-.4 2-.4s1.2.4 2 .4c2.1 0 4.2-3 4.9-6.1.7-3.1-.3-6.2-2.9-7.1-1.4-.5-3 0-4 .9z" />
          <path d="M12.2 6.3c0-2 1.3-3.6 3.4-3.9-.1 2-1.4 3.7-3.4 3.9z" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM7 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM12 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM17 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z" />
        </svg>
      );
  }
}

type BottomNavProps = {
  onAdd?: () => void;
};

export function BottomNav({ onAdd }: BottomNavProps) {
  const pathname = usePathname();
  const index = activeCol(pathname);
  const left = items.filter((item) => item.col < 2);
  const right = items.filter((item) => item.col > 2);

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[var(--app-max-width)] -translate-x-1/2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-label="Primary"
    >
      <svg width="0" height="0" aria-hidden className="absolute">
        <filter
          id="liquid-glass-lens"
          colorInterpolationFilters="sRGB"
          x="-20%"
          y="-40%"
          width="140%"
          height="180%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.04"
            numOctaves="2"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="1.5" result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale="28"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <div
        className="liquid-glass relative grid h-16 grid-cols-5 items-center rounded-full p-1.5"
        style={
          {
            "--count": 5,
            "--index": Math.max(index, 0),
          } as CSSProperties
        }
      >
        {index >= 0 ? (
          <span className="tab-indicator" aria-hidden>
            <span key={index} className="tab-blob" />
          </span>
        ) : null}

        {left.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="relative z-10 flex items-center justify-center rounded-full py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <NavIcon icon={item.icon} active={active} />
            </Link>
          );
        })}

        <div className="relative z-10 flex justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add food"
            className="flex h-full w-full items-center justify-center rounded-full py-1 text-text outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {right.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="relative z-10 flex items-center justify-center rounded-full py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <NavIcon icon={item.icon} active={active} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
