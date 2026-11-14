"use client";

import { FoodTrackerApp } from "@food-tracker/client";
import "@food-tracker/client/styles.css";

/** Next.js website host for the shared SPA. */
export function WebApp() {
  return <FoodTrackerApp authMode="cookie" baseUrl="" />;
}
