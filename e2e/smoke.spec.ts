import { test, expect } from "@playwright/test";

/**
 * Browser smoke tests for the shared SPA hosted by Next.
 * Requires `npm run local` (or a deployed preview) and seeded credentials.
 */
const email = process.env.E2E_EMAIL ?? "calvin@foodtracker.local";
const password = process.env.E2E_PASSWORD ?? process.env.SEED_USER_PASSWORD ?? "";

test.describe("shared client smoke", () => {
  test.skip(!password, "SEED_USER_PASSWORD / E2E_PASSWORD required");

  test("sign in and open diary", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/diary\//, { timeout: 15_000 });
    await expect(page.getByText(/today|breakfast|lunch|dinner/i).first()).toBeVisible();
  });
});
