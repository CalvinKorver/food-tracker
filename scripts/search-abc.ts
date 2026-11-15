/**
 * Local A/B/C bake-off against live USDA FDC.
 * After shipping variant C, `searchFdcFoods` is production (= C).
 * Arm A below still calls that production path for a quick smoke check;
 * B/C remain the wider-page and prep-rank prototypes used in the bake-off.
 */
import "dotenv/config";
import {
  searchCaloriesPer100g,
  searchFdcFoods,
} from "../src/lib/sources/usda-fdc";
import {
  friendlyUsdaName,
  rankUsdaHits,
  scoreUsdaHit,
  usdaStem,
} from "../src/lib/sources/rank-usda-hits";

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";
const WIDE_TYPES = "Foundation,SR Legacy,Survey (FNDDS)";
const QUERIES = [
  "chicken thigh Grilled",
  "grilled chicken breast",
  "chicken thigh",
  "fried chicken thigh",
  "baked salmon",
  "scrambled eggs",
  "white rice",
  "banana",
];

type PrepGroup = {
  id: string;
  /** Words that count as saying this prep in the query. */
  queryWords: string[];
  /** Exact prep the user asked for. */
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

type SearchFood = {
  fdcId?: number | string;
  description?: string;
  brandOwner?: string | null;
  brandName?: string | null;
  dataType?: string;
  additionalDescriptions?: string;
  foodNutrients?: Parameters<typeof searchCaloriesPer100g>[0];
};

type SearchResponse = {
  totalHits?: number;
  foods?: SearchFood[];
};

type Hit = {
  fdcId: string;
  name: string;
  brand: string | null;
  dataType: string | null;
  caloriesPer100g: number | null;
  additionalDescriptions: string | null;
};

type Ranked = {
  fdcId: string;
  displayName: string;
  dataType: string | null;
  caloriesPer100g: number | null;
};

const cache = new Map<string, { totalHits: number; hits: Hit[] }>();

function apiKey(): string {
  const key = process.env.USDA_FDC_API_KEY?.trim();
  if (!key) throw new Error("USDA_FDC_API_KEY is not set");
  return key;
}

function tokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function prepIntent(query: string): PrepGroup | null {
  const words = new Set(tokens(query));
  return PREP_GROUPS.find((group) => group.queryWords.some((w) => words.has(w))) ?? null;
}

function wordBoundary(word: string): RegExp {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
}

function hasWord(text: string, word: string): boolean {
  return wordBoundary(word).test(text);
}

/** "from raw" means the cooked food started raw, not that it is served raw. */
function isServedRaw(text: string): boolean {
  return /\braw\b/i.test(text.replace(/\bfrom raw\b/gi, ""));
}

function rewriteQuery(query: string): string | null {
  const intent = prepIntent(query);
  if (!intent) return null;
  const prepWords = new Set(PREP_GROUPS.flatMap((group) => group.queryWords));
  const food = tokens(query).filter((word) => !prepWords.has(word));
  if (food.length === 0) return null;
  const ors = [...intent.literal, ...intent.synonyms].flatMap((word) => [
    `description:${word}`,
    `additionalDescriptions:${word}`,
  ]);
  return `${food.map((word) => `+${word}`).join(" ")} +(${ors.join(" ")})`;
}

async function fdcSearch(
  query: string,
  dataType: string,
  pageSize: number,
): Promise<{ totalHits: number; hits: Hit[] }> {
  const key = `${dataType}|${pageSize}|${query}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({ api_key: apiKey() });
  let res: Response | null = null;
  let body = "";
  for (let attempt = 1; attempt <= 4; attempt++) {
    res = await fetch(`${FDC_BASE}/foods/search?${params}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        pageSize,
        dataType: dataType.split(",").map((part) => part.trim()),
      }),
    });
    if (res.ok) break;
    body = await res.text();
    if (res.status !== 400 && res.status !== 429 && res.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }
  if (!res?.ok) {
    throw new Error(
      `USDA FDC search failed (${res?.status ?? "?"}) for ${query}\n${body.slice(0, 500)}`,
    );
  }
  const data = (await res.json()) as SearchResponse;
  const foods = Array.isArray(data.foods) ? data.foods : [];
  const hits: Hit[] = [];
  for (const food of foods) {
    const fdcId = String(food.fdcId ?? "").trim();
    const name = String(food.description ?? "").trim();
    if (!fdcId || !name) continue;
    hits.push({
      fdcId,
      name,
      brand: String(food.brandOwner ?? food.brandName ?? "").trim() || null,
      dataType: food.dataType ?? null,
      caloriesPer100g: searchCaloriesPer100g(food.foodNutrients),
      additionalDescriptions: food.additionalDescriptions?.trim() || null,
    });
  }
  const result = { totalHits: data.totalHits ?? hits.length, hits };
  cache.set(key, result);
  return result;
}

function scoreC(hit: Hit, query: string): number {
  const intent = prepIntent(query);
  let score = scoreUsdaHit(hit, query);
  if (!intent) return score;

  const text = `${hit.name} ${hit.additionalDescriptions ?? ""}`;
  const literal = intent.literal.some((word) => hasWord(text, word));
  const synonym = intent.synonyms.some((word) => hasWord(text, word));
  if (literal) score += 160;
  else if (synonym) score += 70;

  const matched = literal || synonym;
  const allowed = new Set([...intent.literal, ...intent.synonyms]);
  const conflict = OTHER_PREP_WORDS.some(
    (word) => !allowed.has(word) && hasWord(text, word) && !(word === "raw" && !isServedRaw(text)),
  );
  if (!matched && conflict) score -= 160;
  if (intent.id !== "raw" && isServedRaw(text)) score -= 160;

  const wantsSkin = /\bskin\b/.test(query.toLowerCase());
  const alreadySkinless = /boneless[,\s]+skinless|meat only/i.test(hit.name);
  if (!wantsSkin && !alreadySkinless && /skin not eaten|without skin/i.test(text)) {
    score += 25;
  }
  return score;
}

function rankC(hits: Hit[], query: string): Ranked[] {
  if (hits.length === 0) return [];
  const scored = hits.map((hit) => ({
    hit,
    displayName: friendlyUsdaName(hit.name),
    stem: usdaStem(hit.name) || hit.fdcId,
    score: scoreC(hit, query),
  }));
  const byStem = new Map<string, typeof scored>();
  for (const row of scored) {
    const group = byStem.get(row.stem);
    if (group) group.push(row);
    else byStem.set(row.stem, [row]);
  }
  const clusters = [...byStem.values()].map((group) => {
    group.sort((a, b) => b.score - a.score || a.hit.name.localeCompare(b.hit.name));
    return group[0]!;
  });
  clusters.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
  return clusters.map((row) => ({
    fdcId: row.hit.fdcId,
    displayName: row.displayName,
    dataType: row.hit.dataType,
    caloriesPer100g: row.hit.caloriesPer100g,
  }));
}

function fromRanked(
  hits: Array<{
    fdcId: string;
    displayName: string;
    dataType: string | null;
    caloriesPer100g: number | null;
  }>,
): Ranked[] {
  return hits.map((hit) => ({
    fdcId: hit.fdcId,
    displayName: hit.displayName,
    dataType: hit.dataType,
    caloriesPer100g: hit.caloriesPer100g,
  }));
}

function printList(rows: Ranked[]) {
  if (rows.length === 0) {
    console.log("  (no hits)");
    return;
  }
  rows.slice(0, 5).forEach((row, i) => {
    const kcal =
      row.caloriesPer100g == null ? "kcal n/a" : `${Math.round(row.caloriesPer100g)} kcal`;
    const type = row.dataType ?? "USDA";
    console.log(`  ${i + 1}. ${row.displayName}`);
    console.log(`     ${type} · ${kcal} · ${row.fdcId}`);
  });
}

async function main() {
  for (const query of QUERIES) {
    console.log(`\n=== ${query} ===`);

    const a = await searchFdcFoods(query);
    console.log("\nA  current (Foundation + SR Legacy, 20, current rank)");
    printList(fromRanked(a));

    const wide = await fdcSearch(query, WIDE_TYPES, 50);
    const b = rankUsdaHits(wide.hits, query);
    console.log(
      `\nB  wider page, same rank (${wide.totalHits} total, showing ranked top 5)`,
    );
    printList(fromRanked(b));

    const rewritten = rewriteQuery(query);
    let cHits = wide.hits;
    let cNote = "same page as B";
    if (rewritten) {
      const narrowed = await fdcSearch(rewritten, WIDE_TYPES, 50);
      if (narrowed.hits.length > 0) {
        cHits = narrowed.hits;
        cNote = `rewritten (${narrowed.totalHits} total): ${rewritten}`;
      } else {
        cNote = "rewrite returned nothing; fell back to the plain page";
      }
    }
    console.log(`\nC  prep rank — ${cNote}`);
    printList(rankC(cHits, query));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
