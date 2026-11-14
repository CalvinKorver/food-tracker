import { beforeEach, describe, expect, it, vi } from "vitest";
import { MealType } from "@/generated/prisma/client";
import { handleOptions, isAllowedCorsOrigin, withCors } from "@/lib/api/cors";
import { jsonOk } from "@/lib/api/http";
import {
  toDiaryDayDto,
  toGoals,
  toMealWindows,
  toSessionUser,
} from "@/lib/api/serializers";
import { createCustomFood } from "@/lib/custom-food";
import { resolveDiaryDate } from "@/lib/dates";
import { getDiaryDay } from "@/lib/diary";
import { createFoodEntry } from "@/lib/foods";
import {
  apiRequest,
  createTestAccessToken,
  createTestUser,
  createTestUserWithPassword,
  resetTestDb,
} from "../helpers/db";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    auth: {
      ...actual.auth,
      api: {
        ...actual.auth.api,
        getSession: vi.fn().mockResolvedValue(null),
      },
    },
  };
});

describe("api v1 cors", () => {
  it("allows same-origin and CAPACITOR_ORIGINS", () => {
    const request = new Request("http://localhost:3000/api/v1/me", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(isAllowedCorsOrigin(request, "http://localhost:3000")).toBe(true);

    const previous = process.env.CAPACITOR_ORIGINS;
    process.env.CAPACITOR_ORIGINS = "capacitor://localhost,ionic://localhost";
    expect(
      isAllowedCorsOrigin(request, "capacitor://localhost"),
    ).toBe(true);
    expect(isAllowedCorsOrigin(request, "https://evil.example")).toBe(false);
    process.env.CAPACITOR_ORIGINS = previous;
  });

  it("sets credentialed CORS headers on allowed origins", async () => {
    process.env.CAPACITOR_ORIGINS = "capacitor://localhost";
    const request = new Request("http://localhost:3000/api/v1/me", {
      headers: { origin: "capacitor://localhost" },
    });
    const response = withCors(request, jsonOk({ ping: true }));
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "capacitor://localhost",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true",
    );

    const options = handleOptions(request);
    expect(options.status).toBe(204);
    expect(options.headers.get("Access-Control-Allow-Origin")).toBe(
      "capacitor://localhost",
    );
  });
});

describe("api v1 serializers", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("maps session user, goals, meal windows, and diary day", async () => {
    const user = await createTestUser();
    const session = toSessionUser(user);
    expect(session.id).toBe(user.id);
    expect(session.email).toBe(user.email);
    expect(session.goals).toBeNull();
    expect(toGoals(user)).toBeNull();
    expect(toMealWindows(user).breakfast.start).toMatch(/^\d{2}:\d{2}$/);

    const food = await createCustomFood(user.id, {
      name: "Yogurt",
      brand: null,
      servingQty: 1,
      servingUnit: "cup",
      calories: 150,
      proteinG: 15,
      carbsG: 10,
      fatG: 4,
      fiberG: 0,
      sugarG: 8,
      sodiumMg: 80,
    });
    const loggedOn = new Date("2026-11-06");
    await createFoodEntry({
      userId: user.id,
      foodId: food.id,
      loggedOn,
      meal: MealType.breakfast,
      quantity: 1,
      unitMode: "serving",
    });

    const day = await getDiaryDay(user.id, loggedOn);
    const resolved = resolveDiaryDate("2026-11-06", user.timezone);
    expect(resolved).not.toBeNull();
    const dto = toDiaryDayDto(day, resolved!);
    expect(dto.dateKey).toBe("2026-11-06");
    expect(dto.totals.calories).toBe(150);
    expect(
      dto.meals.find((m) => m.meal === "breakfast")?.entries,
    ).toHaveLength(1);
  });
});

describe("api v1 routes", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("returns 401 without a session or bearer token", async () => {
    const { GET } = await import("@/app/api/v1/me/route");
    const response = await GET(apiRequest("/api/v1/me"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Unauthorized",
    });
  });

  it("returns the session user with a bearer token", async () => {
    const user = await createTestUser({ displayName: "Api User" });
    const token = await createTestAccessToken(user.id);
    const { GET } = await import("@/app/api/v1/me/route");
    const response = await GET(apiRequest("/api/v1/me", { token }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        displayName: "Api User",
      },
    });
  });

  it("reads and writes a diary day through route handlers", async () => {
    const user = await createTestUser();
    const token = await createTestAccessToken(user.id);
    const food = await createCustomFood(user.id, {
      name: "Oats",
      brand: null,
      servingQty: 40,
      servingUnit: "g",
      calories: 150,
      proteinG: 5,
      carbsG: 27,
      fatG: 3,
      fiberG: 4,
      sugarG: 1,
      sodiumMg: 2,
    });

    const { POST } = await import("@/app/api/v1/entries/route");
    const addResponse = await POST(
      apiRequest("/api/v1/entries", {
        token,
        method: "POST",
        body: JSON.stringify({
          foodId: food.id,
          dateKey: "2026-11-06",
          loggedOnKey: "2026-11-06",
          meal: "breakfast",
          quantity: 1,
          unitMode: "serving",
        }),
      }),
    );
    expect(addResponse.status).toBe(200);
    const added = await addResponse.json();
    expect(added.ok).toBe(true);
    expect(added.data.foodNameSnapshot).toBe("Oats");
    expect(added.data.caloriesSnapshot).toBe(150);

    const { GET } = await import("@/app/api/v1/diary/[date]/route");
    const diaryResponse = await GET(
      apiRequest("/api/v1/diary/2026-11-06", { token }),
      { params: Promise.resolve({ date: "2026-11-06" }) },
    );
    expect(diaryResponse.status).toBe(200);
    const diary = await diaryResponse.json();
    expect(diary.data.dateKey).toBe("2026-11-06");
    expect(diary.data.totals.calories).toBe(150);

    const { GET: getFoods } = await import("@/app/api/v1/foods/route");
    const foodsResponse = await getFoods(
      apiRequest("/api/v1/foods?tab=custom", { token }),
    );
    expect(foodsResponse.status).toBe(200);
    const foods = await foodsResponse.json();
    expect(foods.data).toHaveLength(1);
    expect(foods.data[0].name).toBe("Oats");
  });

  it("creates a custom food and returns a FoodListItem", async () => {
    const user = await createTestUser();
    const token = await createTestAccessToken(user.id);
    const { POST } = await import("@/app/api/v1/foods/custom/route");
    const response = await POST(
      apiRequest("/api/v1/foods/custom", {
        token,
        method: "POST",
        body: JSON.stringify({
          name: "Cottage cheese",
          servingQty: 100,
          servingUnit: "g",
          calories: 98,
          proteinG: 11,
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.name).toBe("Cottage cheese");
    expect(body.data.source).toBe("custom");
    expect(body.data.isFavorite).toBe(false);
    expect(body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("signs in with email/password and accepts the bearer token", async () => {
    const password = "test-password-123";
    const user = await createTestUserWithPassword(password, {
      email: "native@foodtracker.local",
      displayName: "Native User",
    });

    const { POST: signIn } = await import("@/app/api/v1/auth/sign-in/route");
    const bad = await signIn(
      apiRequest("/api/v1/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          password: "wrong-password",
        }),
      }),
    );
    expect(bad.status).toBe(401);

    const ok = await signIn(
      apiRequest("/api/v1/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ email: user.email, password }),
      }),
    );
    expect(ok.status).toBe(200);
    const signed = await ok.json();
    expect(signed.ok).toBe(true);
    expect(signed.data.accessToken).toBeTruthy();
    expect(signed.data.refreshToken).toBeTruthy();
    expect(signed.data.user.email).toBe(user.email);

    const { GET } = await import("@/app/api/v1/me/route");
    const me = await GET(
      apiRequest("/api/v1/me", { token: signed.data.accessToken }),
    );
    expect(me.status).toBe(200);

    const { POST: refresh } = await import("@/app/api/v1/auth/refresh/route");
    const refreshed = await refresh(
      apiRequest("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: signed.data.refreshToken }),
      }),
    );
    expect(refreshed.status).toBe(200);
    const next = await refreshed.json();
    expect(next.data.accessToken).toBeTruthy();
    expect(next.data.accessToken).not.toBe(signed.data.accessToken);

    const { POST: revoke } = await import("@/app/api/v1/auth/revoke/route");
    const revoked = await revoke(
      apiRequest("/api/v1/auth/revoke", {
        method: "POST",
        token: next.data.accessToken,
        body: JSON.stringify({
          token: next.data.accessToken,
          refreshToken: next.data.refreshToken,
        }),
      }),
    );
    expect(revoked.status).toBe(200);
  });
});
