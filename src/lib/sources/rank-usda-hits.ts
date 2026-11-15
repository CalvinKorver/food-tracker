import type { FdcSearchHit } from "@/lib/sources/usda-fdc";

/** USDA hit after friendly naming + stem clustering. */
export type RankedUsdaHit = {
  fdcId: string;
  name: string;
  displayName: string;
  brand: string | null;
  dataType: string | null;
  caloriesPer100g: number | null;
  /** Same-stem prep variants, already sorted best-first (no nested variants). */
  variants: RankedUsdaHitLeaf[];
};

export type RankedUsdaHitLeaf = Omit<RankedUsdaHit, "variants">;

const DROP_SEGMENTS =
  /^(broilers or fryers|ns as to form|not further specified|nfs)$/i;

const PREP_STATE =
  /^(raw|fresh|frozen|cooked|roasted|braised|stewed|fried|grilled|baked|boiled|heated|reheated)$/i;

/** Second USDA segment that reads better glued to the food name. */
const CUT_LIKE =
  /^(thighs?|breasts?|wings?|legs?|loins?|chops?|tenderloins?|ribs?|drumsticks?|dark meat|light meat)$/i;

const QUERY_OPTIONAL_NOISE = [
  { re: /skin \(drumsticks/i, penalty: 80 },
  { re: /with added solution/i, penalty: 50 },
  { re: /fast foods/i, penalty: 60 },
  { re: /\bbreaded\b/i, penalty: 40 },
  { re: /\brotisserie\b/i, penalty: 30 },
  { re: /\b(popeyes|kfc|mcdonald)/i, penalty: 50 },
] as const;

type PrepGroup = {
  id: string;
  /** Words that count as saying this prep in the query. */
  queryWords: string[];
  /** Exact prep words that score the full literal bonus. */
  literal: string[];
  /** USDA wording that should rank under the literal, above raw. */
  synonyms: string[];
};

const PREP_GROUPS: PrepGroup[] = [
  {
    id: "grilled",
    queryWords: ["grilled", "broiled", "barbecued", "barbecue", "bbq"],
    literal: ["grilled"],
    synonyms: ["broiled", "barbecued", "barbecue", "bbq"],
  },
  {
    id: "baked",
    queryWords: ["baked", "roasted"],
    literal: ["baked", "roasted"],
    synonyms: [],
  },
  {
    id: "fried",
    queryWords: ["fried"],
    literal: ["fried"],
    synonyms: [],
  },
  {
    id: "steamed",
    queryWords: ["steamed"],
    literal: ["steamed"],
    synonyms: [],
  },
  {
    id: "boiled",
    queryWords: ["boiled"],
    literal: ["boiled"],
    synonyms: [],
  },
  {
    id: "raw",
    queryWords: ["raw"],
    literal: ["raw"],
    synonyms: [],
  },
];

const OTHER_PREP_WORDS = [
  "grilled",
  "broiled",
  "barbecued",
  "barbecue",
  "bbq",
  "baked",
  "roasted",
  "fried",
  "steamed",
  "boiled",
  "raw",
];

type PrepIntent = {
  id: string;
  literal: string[];
  synonyms: string[];
};

function queryTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function wordBoundary(word: string): RegExp {
  return new RegExp(
    `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  );
}

function hasWord(text: string, word: string): boolean {
  return wordBoundary(word).test(text);
}

/** "from raw" means the cooked food started raw, not that it is served raw. */
function isServedRaw(text: string): boolean {
  return /\braw\b/i.test(text.replace(/\bfrom raw\b/gi, ""));
}

function prepIntent(query: string): PrepIntent | null {
  const words = new Set(queryTokens(query));
  const group = PREP_GROUPS.find((g) =>
    g.queryWords.some((w) => words.has(w)),
  );
  if (!group) return null;

  const used = group.queryWords.filter((w) => words.has(w));
  const expansion = [...new Set([...group.literal, ...group.synonyms])];
  // Mutual literals (baked/roasted) keep equal weight; grilled synonyms stay secondary.
  if (group.synonyms.length === 0) {
    return { id: group.id, literal: group.literal, synonyms: [] };
  }
  const literal = used.length > 0 ? used : group.literal;
  const synonyms = expansion.filter((w) => !literal.includes(w));
  return { id: group.id, literal, synonyms };
}

/** USDA operator rewrite when the query names a preparation. */
export function rewriteUsdaSearchQuery(query: string): string | null {
  const intent = prepIntent(query);
  if (!intent) return null;
  const prepWords = new Set(PREP_GROUPS.flatMap((group) => group.queryWords));
  const food = queryTokens(query).filter((word) => !prepWords.has(word));
  if (food.length === 0) return null;
  const ors = [...intent.literal, ...intent.synonyms].flatMap((word) => [
    `description:${word}`,
    `additionalDescriptions:${word}`,
  ]);
  return `${food.map((word) => `+${word}`).join(" ")} +(${ors.join(" ")})`;
}

function segments(description: string): string[] {
  return description
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !DROP_SEGMENTS.test(p));
}

function filterPrepNoise(parts: string[]): string[] {
  return parts.filter((part, i, arr) => {
    if (!PREP_STATE.test(part)) return true;
    // Drop bare "cooked" when a more specific prep follows.
    if (part.toLowerCase() === "cooked") {
      return !arr.slice(i + 1).some((p) => PREP_STATE.test(p));
    }
    return true;
  });
}

/** Cronometer-ish title from USDA comma lists. */
export function friendlyUsdaName(description: string): string {
  const rawParts = description
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const droppedNoise = rawParts.some((p) => DROP_SEGMENTS.test(p));
  const parts = rawParts.filter((p) => !DROP_SEGMENTS.test(p));
  if (parts.length === 0) return description.trim();
  if (parts.length === 1) return parts[0]!;

  const glueCut = droppedNoise || CUT_LIKE.test(parts[1]!);
  if (!glueCut) return filterPrepNoise(parts).join(", ");

  const head = `${parts[0]} ${parts[1]}`;
  const rest = filterPrepNoise(parts.slice(2));
  return rest.length ? `${head}, ${rest.join(", ")}` : head;
}

/** Stem keeps cut/skin attributes; drops prep/state so roasted≈braised cluster. */
export function usdaStem(description: string): string {
  return segments(description)
    .map((p) => p.toLowerCase())
    .filter((p) => !PREP_STATE.test(p))
    .join("|");
}

function baseScoreUsdaHit(
  hit: Pick<FdcSearchHit, "name" | "dataType">,
  query: string,
): number {
  const q = query.trim().toLowerCase();
  const name = hit.name.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  let score = 0;

  if (hit.dataType === "Foundation") score += 100;
  else if (hit.dataType === "SR Legacy") score += 40;

  if (tokens.length && tokens.every((t) => name.includes(t))) score += 30;

  const flat = name.replace(/,/g, " ").replace(/\s+/g, " ");
  if (q && flat.includes(q)) score += 20;

  for (const { re, penalty } of QUERY_OPTIONAL_NOISE) {
    if (re.test(name) && !re.test(q)) score -= penalty;
  }

  const wantsSkin = /\bskin\b/.test(q);
  const wantsFried = /\bfried\b/.test(q);
  if (!wantsSkin && !wantsFried) {
    if (/boneless[,\s]+skinless|meat only/.test(name)) score += 25;
    else if (/meat and skin/.test(name)) score += 5;
  }

  score -= Math.min(name.length / 20, 15);
  return score;
}

export function scoreUsdaHit(
  hit: Pick<FdcSearchHit, "name" | "dataType" | "additionalDescriptions">,
  query: string,
): number {
  let score = baseScoreUsdaHit(hit, query);
  const intent = prepIntent(query);
  if (!intent) return score;

  const text = `${hit.name} ${hit.additionalDescriptions ?? ""}`;
  const literal = intent.literal.some((word) => hasWord(text, word));
  const synonym = intent.synonyms.some((word) => hasWord(text, word));
  if (literal) score += 160;
  else if (synonym) score += 70;

  const matched = literal || synonym;
  const allowed = new Set([...intent.literal, ...intent.synonyms]);
  const conflict = OTHER_PREP_WORDS.some(
    (word) =>
      !allowed.has(word) &&
      hasWord(text, word) &&
      !(word === "raw" && !isServedRaw(text)),
  );
  if (!matched && conflict) score -= 160;
  if (intent.id !== "raw" && isServedRaw(text)) score -= 160;

  const wantsSkin = /\bskin\b/.test(query.toLowerCase());
  const alreadySkinless = /boneless[,\s]+skinless|meat only/i.test(hit.name);
  if (
    !wantsSkin &&
    !alreadySkinless &&
    /skin not eaten|without skin/i.test(text)
  ) {
    score += 25;
  }
  return score;
}

export function dataTypeBadge(dataType: string | null): string {
  if (dataType === "Foundation") return "Foundation";
  if (dataType === "SR Legacy") return "SR";
  if (dataType === "Survey (FNDDS)") return "Survey";
  return "USDA";
}

function toLeaf(
  hit: FdcSearchHit,
  displayName: string,
): RankedUsdaHitLeaf {
  return {
    fdcId: hit.fdcId,
    name: hit.name,
    displayName,
    brand: hit.brand,
    dataType: hit.dataType,
    caloriesPer100g: hit.caloriesPer100g,
  };
}

/** Re-rank USDA page hits and soft-cluster same-stem prep variants. */
export function rankUsdaHits(
  hits: FdcSearchHit[],
  query: string,
): RankedUsdaHit[] {
  if (hits.length === 0) return [];

  const scored = hits.map((hit) => ({
    hit,
    displayName: friendlyUsdaName(hit.name),
    stem: usdaStem(hit.name) || hit.fdcId,
    score: scoreUsdaHit(hit, query),
  }));

  const byStem = new Map<string, typeof scored>();
  for (const row of scored) {
    const group = byStem.get(row.stem);
    if (group) group.push(row);
    else byStem.set(row.stem, [row]);
  }

  const clusters: Array<{ hit: RankedUsdaHit; score: number }> = [];
  for (const group of byStem.values()) {
    group.sort((a, b) => b.score - a.score || a.hit.name.localeCompare(b.hit.name));
    const [head, ...rest] = group;
    if (!head) continue;
    clusters.push({
      score: head.score,
      hit: {
        ...toLeaf(head.hit, head.displayName),
        variants: rest.map((r) => toLeaf(r.hit, r.displayName)),
      },
    });
  }

  clusters.sort(
    (a, b) =>
      b.score - a.score || a.hit.displayName.localeCompare(b.hit.displayName),
  );
  return clusters.map((c) => c.hit);
}
