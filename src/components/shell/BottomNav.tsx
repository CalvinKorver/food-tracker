"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: "discover" | "diary" | "foods" | "more";
};

const items: NavItem[] = [
  { href: "/discover", label: "Discover", icon: "discover" },
  { href: "/diary/today", label: "Diary", icon: "diary" },
  { href: "/foods", label: "Foods", icon: "foods" },
  { href: "/more", label: "More", icon: "more" },
];

function isActive(pathname: string, href: string) {
  if (href.startsWith("/diary")) {
    return pathname.startsWith("/diary");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ icon, active }: { icon: NavItem["icon"]; active: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--text-muted)";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (icon) {
    case "discover":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15v4" />
          <path d="M12 11v8" />
          <path d="M16 8v11" />
        </svg>
      );
    case "diary":
      return (
        <svg {...common}>
          <path d="M6 4h11a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
        </svg>
      );
    case "foods":
      return (
        <svg {...common}>
          <path d="M12 3c-2.5 3-4 5.5-4 8a4 4 0 0 0 8 0c0-2.5-1.5-5-4-8z" />
          <path d="M12 15v6" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.4" fill={stroke} stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill={stroke} stroke="none" />
          <circle cx="18" cy="12" r="1.4" fill={stroke} stroke="none" />
        </svg>
      );
  }
}

type BottomNavProps = {
  onAdd?: () => void;
};

export function BottomNav({ onAdd }: BottomNavProps) {
  const pathname = usePathname();
  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[var(--app-max-width)] -translate-x-1/2 border-t border-border bg-bg-elevated/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="grid h-[var(--nav-height)] grid-cols-5 items-center px-1">
        {left.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-2"
            >
              <NavIcon icon={item.icon} active={active} />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add food"
            className="flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-accent text-bg shadow-[0_8px_20px_rgba(245,166,35,0.35)] transition hover:bg-accent-hover active:scale-95"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
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
              className="flex flex-col items-center gap-1 py-2"
            >
              <NavIcon icon={item.icon} active={active} />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
