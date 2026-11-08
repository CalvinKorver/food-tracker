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

export function scoreUsdaHit(
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

export function dataTypeBadge(dataType: string | null): string {
  if (dataType === "Foundation") return "Foundation";
  if (dataType === "SR Legacy") return "SR";
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

  const clusters: RankedUsdaHit[] = [];
  for (const group of byStem.values()) {
    group.sort((a, b) => b.score - a.score || a.hit.name.localeCompare(b.hit.name));
    const [head, ...rest] = group;
    if (!head) continue;
    clusters.push({
      ...toLeaf(head.hit, head.displayName),
      variants: rest.map((r) => toLeaf(r.hit, r.displayName)),
    });
  }

  clusters.sort((a, b) => {
    const sa = scoreUsdaHit(a, query);
    const sb = scoreUsdaHit(b, query);
    return sb - sa || a.displayName.localeCompare(b.displayName);
  });
  return clusters;
}
