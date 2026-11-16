import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@food-tracker/client/styles.css";
import "./barcode-scanner.css";
import { AppHost } from "./AppHost";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(
  <StrictMode>
    <AppHost />
  </StrictMode>,
);
