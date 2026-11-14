const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DiaryDateInfo = {
  /** Calendar date at UTC midnight for Prisma `@db.Date`. */
  date: Date;
  key: string;
  isToday: boolean;
  label: string;
  prevKey: string;
  nextKey: string;
};

function partsInTimeZone(instant: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(instant);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return { year, month, day, key: `${year}-${month}-${day}` };
}

/** Parse YYYY-MM-DD into a UTC Date suitable for Prisma `@db.Date`. */
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function todayKey(timeZone: string, now = new Date()): string {
  return partsInTimeZone(now, timeZone).key;
}

export function shiftDiaryDate(key: string, deltaDays: number): string {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatLabel(key: string, isToday: boolean): string {
  if (isToday) return "Today";
  const date = dateFromKey(key);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function isValidDateKey(param: string): boolean {
  if (!DATE_KEY_RE.test(param)) return false;
  const date = dateFromKey(param);
  const [y, m, d] = param.split("-").map(Number);
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() + 1 === m &&
    date.getUTCDate() === d
  );
}

export function resolveDiaryDate(
  param: string,
  timeZone: string,
  now = new Date(),
): DiaryDateInfo | null {
  const today = todayKey(timeZone, now);

  let key: string;
  if (param === "today") {
    key = today;
  } else if (isValidDateKey(param)) {
    key = param;
  } else {
    return null;
  }

  const isToday = key === today;
  return {
    date: dateFromKey(key),
    key,
    isToday,
    label: formatLabel(key, isToday),
    prevKey: shiftDiaryDate(key, -1),
    nextKey: shiftDiaryDate(key, 1),
  };
}
