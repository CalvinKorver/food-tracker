import { createHash } from "node:crypto";
import type {
  DiscoverSummaryDto,
  DiscoverWindowDto,
} from "@food-tracker/contracts";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getDiscoverWindowForUser } from "@/lib/discover";

export type DiscoverSummaryCacheRecord = {
  inputHash: string;
  summary: string;
  generatedAt: string;
};

const SYSTEM_PROMPT = `You write ultra-concise 7-day nutrition summaries for a food tracking app.
Rules:
- Write 2 to 4 short, declarative sentences (40 to 65 words total).
- Focus strictly on calories and macronutrients (protein, carbs, fat) across the logged days.
- If fewer than 7 days were logged, note the logged day count briefly (e.g. "Over 5 logged days..."). Do not treat unlogged days as zero intake.
- When daily goals are provided, compare average intake to the calorie and macro targets (mentioning deficit/surplus and notable macro hits or shortfalls). When goals are null, summarize average calories and macro split.
- Output plain prose sentences in a single paragraph. No greetings, bullet points, markdown, emojis, motivational filler, or medical disclaimers.`;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeDiscoverInputHash(window: DiscoverWindowDto): string {
  const payload = {
    v: 1,
    startDateKey: window.startDateKey,
    endDateKey: window.endDateKey,
    goals: window.goals
      ? {
          calorieGoal: Math.round(window.goals.calorieGoal),
          proteinGoalG: Math.round(window.goals.proteinGoalG),
          carbsGoalG: Math.round(window.goals.carbsGoalG),
          fatGoalG: Math.round(window.goals.fatGoalG),
        }
      : null,
    days: window.days.map((d) => ({
      dateKey: d.dateKey,
      entryCount: d.entryCount,
      calories: round1(d.totals.calories),
      proteinG: round1(d.totals.proteinG),
      carbsG: round1(d.totals.carbsG),
      netCarbsG: round1(d.totals.netCarbsG),
      fatG: round1(d.totals.fatG),
    })),
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function parseDiscoverSummaryCache(
  raw: unknown,
): DiscoverSummaryCacheRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.inputHash !== "string" ||
    typeof obj.summary !== "string" ||
    typeof obj.generatedAt !== "string" ||
    obj.summary.trim().length === 0
  ) {
    return null;
  }
  return {
    inputHash: obj.inputHash,
    summary: obj.summary,
    generatedAt: obj.generatedAt,
  };
}

export function cleanSummaryText(raw: string): string {
  return raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDiscoverUserPrompt(window: DiscoverWindowDto): string {
  const promptData = {
    range: window.rangeLabel,
    loggedDays: `${window.loggedDaysCount} of 7`,
    goals: window.goals
      ? {
          calories: Math.round(window.goals.calorieGoal),
          proteinG: Math.round(window.goals.proteinGoalG),
          carbsG: Math.round(window.goals.carbsGoalG),
          fatG: Math.round(window.goals.fatGoalG),
        }
      : null,
    loggedDayAverages: window.averages
      ? {
          calories: Math.round(window.averages.calories),
          proteinG: Math.round(window.averages.proteinG),
          carbsG: Math.round(window.averages.carbsG),
          netCarbsG: Math.round(window.averages.netCarbsG),
          fatG: Math.round(window.averages.fatG),
        }
      : null,
    avgDailyCalorieDelta:
      window.avgCalorieDelta != null
        ? Math.round(window.avgCalorieDelta)
        : null,
    dailyLoggedBreakdown: window.days
      .filter((d) => d.logged)
      .map((d) => ({
        day: `${d.weekdayLabel} ${d.shortDateLabel}`,
        calories: Math.round(d.totals.calories),
        calorieDelta:
          d.calorieDelta != null ? Math.round(d.calorieDelta) : null,
        proteinG: Math.round(d.totals.proteinG),
        carbsG: Math.round(d.totals.carbsG),
        netCarbsG: Math.round(d.totals.netCarbsG),
        fatG: Math.round(d.totals.fatG),
      })),
  };

  return `Summarize this 7-day nutrition log:\n${JSON.stringify(promptData)}`;
}

type OpenAiChatResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
};

export async function generateDiscoverSummaryText(input: {
  window: DiscoverWindowDto;
  apiKey: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const fetchImpl = input.fetchImpl ?? fetch;

  const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 160,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildDiscoverUserPrompt(input.window) },
      ],
    }),
  });

  const body = (await res.json()) as OpenAiChatResponse;
  if (!res.ok) {
    throw new Error(
      body.error?.message ?? `OpenAI request failed (${res.status})`,
    );
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty summary");
  }

  const cleaned = cleanSummaryText(content);
  if (!cleaned) {
    throw new Error("OpenAI summary was empty after cleaning");
  }

  return cleaned;
}

export async function getOrCreateDiscoverSummary(input: {
  user: User;
  window?: DiscoverWindowDto;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<DiscoverSummaryDto> {
  const window =
    input.window ?? (await getDiscoverWindowForUser(input.user, input.now));

  if (window.loggedDaysCount === 0) {
    return {
      status: "empty",
      summary: null,
      generatedAt: null,
    };
  }

  const inputHash = computeDiscoverInputHash(window);
  const cached = parseDiscoverSummaryCache(input.user.discoverSummaryCache);
  if (cached && cached.inputHash === inputHash) {
    return {
      status: "ready",
      summary: cached.summary,
      generatedAt: cached.generatedAt,
    };
  }

  const apiKey = (input.apiKey ?? process.env.OPENAI_API_KEY)?.trim();
  if (!apiKey) {
    return {
      status: "unavailable",
      summary: null,
      generatedAt: null,
    };
  }

  try {
    const summary = await generateDiscoverSummaryText({
      window,
      apiKey,
      fetchImpl: input.fetchImpl,
    });
    const generatedAt = (input.now ?? new Date()).toISOString();
    const nextCache: DiscoverSummaryCacheRecord = {
      inputHash,
      summary,
      generatedAt,
    };

    await prisma.user.update({
      where: { id: input.user.id },
      data: { discoverSummaryCache: nextCache },
    });

    return {
      status: "ready",
      summary,
      generatedAt,
    };
  } catch (err) {
    console.warn("[discover-summary] generation failed:", err);
    return {
      status: "unavailable",
      summary: null,
      generatedAt: null,
    };
  }
}
