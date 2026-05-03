export { createClient, type DbClient, type ClientHandles } from "./client.js";
export { runMigrations } from "./migrate.js";
export { seedDatabase } from "./seed.js";

export * as schema from "./schema.js";

export * from "./queries/clients.js";
export * from "./queries/projects.js";
export * from "./queries/sessions.js";
export * from "./queries/tasks.js";
export * from "./queries/events.js";
export * from "./queries/tags.js";
export * from "./queries/settings.js";
export * from "./queries/pricing.js";
export * from "./queries/currency.js";
export * from "./queries/diagnostics.js";
export * from "./queries/revenue.js";
