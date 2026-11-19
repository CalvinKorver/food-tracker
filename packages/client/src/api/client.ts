import type {
  AddFoodEntryInput,
  CreateRecipeInput,
  CustomFoodInputDto,
  DiaryDayDto,
  DiaryEntryDto,
  DiscoverSummaryDto,
  DiscoverWindowDto,
  FoodListItem,
  MealWindows,
  NativeTokenPair,
  OcrFoodPrefill,
  OffSearchHit,
  RecipeDetailDto,
  SessionUserDto,
  UpdateFoodEntryInput,
  UsdaSearchHit,
  UserGoals,
} from "@food-tracker/contracts";
import { ApiError, unwrapApiEnvelope } from "./envelope";
import { apiRequestHeaders } from "./headers";

export type FoodsTab = "recents" | "favorites" | "all" | "custom";

export type CreateApiClientOptions = {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | null> | string | null;
  /** Attempt one silent refresh; return the new access token or null. */
  refreshAccessToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
};

export type TokenRevokeInput = {
  token?: string;
  refreshToken?: string;
};

export type PasswordResetRequest = {
  email: string;
  redirectTo?: string;
};

export type NutritionLabelInput = {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

export type SaveMealWindowsInput = {
  breakfastStart: string;
  breakfastEnd: string;
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;
};

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}${path}`;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: text || "Invalid JSON response" };
  }
}

export function createApiClient({
  baseUrl = "",
  getAccessToken,
  refreshAccessToken,
  onUnauthorized,
}: CreateApiClientOptions) {
  async function request<T>(
    path: string,
    init: RequestInit = {},
    allowRefresh = true,
  ): Promise<T> {
    const headers = apiRequestHeaders(baseUrl, init.headers);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const token = (await getAccessToken?.()) ?? null;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(joinUrl(baseUrl, path), {
        ...init,
        headers,
        credentials: "include",
      });
    } catch {
      throw new ApiError("Network error — check your connection", 0);
    }

    if (
      response.status === 401 &&
      allowRefresh &&
      refreshAccessToken &&
      !path.startsWith("/api/v1/auth/")
    ) {
      const next = await refreshAccessToken();
      if (next) {
        return request<T>(path, init, false);
      }
      onUnauthorized?.();
    } else if (response.status === 401) {
      onUnauthorized?.();
    }

    const json = await readJson(response);
    return unwrapApiEnvelope<T>(json, response.status);
  }

  return {
    baseUrl,

    getMe: () => request<SessionUserDto>("/api/v1/me"),

    deleteAccount: () =>
      request<{ deleted: true }>("/api/v1/me", { method: "DELETE" }),

    exportData: () => request<unknown>("/api/v1/me/export"),

    getDiary: (date: string) => request<DiaryDayDto>(`/api/v1/diary/${date}`),

    getDiscover: () => request<DiscoverWindowDto>("/api/v1/discover"),

    getDiscoverSummary: () =>
      request<DiscoverSummaryDto>("/api/v1/discover/summary"),

    addEntry: (input: AddFoodEntryInput) =>
      request<DiaryEntryDto>("/api/v1/entries", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    updateEntry: (id: string, input: UpdateFoodEntryInput) =>
      request<DiaryEntryDto>(`/api/v1/entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),

    deleteEntry: (id: string) =>
      request<{ deleted: true }>(`/api/v1/entries/${id}`, { method: "DELETE" }),

    listFoods: (opts?: { tab?: FoodsTab; q?: string }) => {
      const params = new URLSearchParams();
      if (opts?.tab) params.set("tab", opts.tab);
      if (opts?.q) params.set("q", opts.q);
      const qs = params.toString();
      return request<FoodListItem[]>(`/api/v1/foods${qs ? `?${qs}` : ""}`);
    },

    getFood: (id: string) => request<FoodListItem>(`/api/v1/foods/${id}`),

    createCustomFood: (input: CustomFoodInputDto) =>
      request<FoodListItem>("/api/v1/foods/custom", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    updateCustomFood: (id: string, input: CustomFoodInputDto) =>
      request<FoodListItem>(`/api/v1/foods/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),

    deleteCustomFood: (id: string) =>
      request<{ deleted: true }>(`/api/v1/foods/${id}`, { method: "DELETE" }),

    createRecipe: (input: CreateRecipeInput) =>
      request<FoodListItem>("/api/v1/foods/recipes", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    getRecipe: (id: string) =>
      request<RecipeDetailDto>(`/api/v1/foods/recipes/${id}`),

    updateRecipe: (id: string, input: CreateRecipeInput) =>
      request<FoodListItem>(`/api/v1/foods/recipes/${id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),

    toggleFavorite: (foodId: string) =>
      request<{ isFavorite: boolean }>(`/api/v1/favorites/${foodId}`, {
        method: "POST",
      }),

    searchUsda: (q: string) =>
      request<{ foods: UsdaSearchHit[] }>(
        `/api/v1/search/usda?${new URLSearchParams({ q })}`,
      ),

    searchOff: (q: string) =>
      request<{ foods: OffSearchHit[] }>(
        `/api/v1/search/off?${new URLSearchParams({ q })}`,
      ),

    selectUsda: (fdcId: string) =>
      request<{ food: FoodListItem }>(`/api/v1/search/usda/${fdcId}`, {
        method: "POST",
      }),

    lookupBarcode: (code: string) =>
      request<{ food: FoodListItem }>("/api/v1/barcode", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),

    parseNutritionLabel: (input: NutritionLabelInput) =>
      request<{ values: OcrFoodPrefill }>("/api/v1/ocr/nutrition-label", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    getGoals: () => request<UserGoals | null>("/api/v1/goals"),

    saveGoals: (goals: UserGoals) =>
      request<UserGoals | null>("/api/v1/goals", {
        method: "PUT",
        body: JSON.stringify(goals),
      }),

    getMealWindows: () => request<MealWindows>("/api/v1/meal-windows"),

    saveMealWindows: (input: SaveMealWindowsInput) =>
      request<MealWindows>("/api/v1/meal-windows", {
        method: "PUT",
        body: JSON.stringify(input),
      }),

    setCalorieNag: (enabled: boolean) =>
      request<{ enabled: boolean }>("/api/v1/settings/calorie-nag", {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      }),

    signInWithPassword: (email: string, password: string) =>
      request<NativeTokenPair>("/api/v1/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    refreshTokens: (refreshToken: string) =>
      request<NativeTokenPair>("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),

    revokeTokens: (input: TokenRevokeInput = {}) =>
      request<{ revoked: true }>("/api/v1/auth/revoke", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    requestPasswordReset: (input: PasswordResetRequest) =>
      request<{ requested: true; message: string }>(
        "/api/v1/auth/password-reset",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
