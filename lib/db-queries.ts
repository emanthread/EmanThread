// ── Deprecated barrel re-export ────────────────────────────────────
// This file previously contained all database query functions in a single
// ~3077-line file. It has been split into domain modules under lib/db/.
// All imports from "@/lib/db-queries" continue to work through this barrel.
// New code should import directly from lib/db/* for better tree-shaking.
export * from './db/index';
