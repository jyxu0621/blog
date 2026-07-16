/// <reference types="vite/client" />

import type { StellarControlApi } from "../../shared/types";

declare global {
  interface Window {
    stellarControl: StellarControlApi;
  }
}

export {};
