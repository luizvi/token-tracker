import {
  sqliteTable, text, integer, real, primaryKey, index,
} from "drizzle-orm/sqlite-core";

const ts = (name: string) => integer(name, { mode: "number" }).notNull();
const optTs = (name: string) => integer(name, { mode: "number" });
const bool = (name: string, def = false) =>
  integer(name, { mode: "boolean" }).notNull().default(def);

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  hourLimitValue: real("hour_limit_value"),
  hourLimitPeriod: text("hour_limit_period", { enum: ["week", "month"] }),
  billableFactor: real("billable_factor").notNull().default(0.4),
  color: text("color"),
  notes: text("notes"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  cwdPath: text("cwd_path").notNull().unique(),
  claudeProjectDir: text("claude_project_dir").unique(),
  clientId: text("client_id").references(() => clients.id),
  color: text("color"),
  active: bool("active", true),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
}, (t) => ({ idxClient: index("idx_projects_client").on(t.clientId) }));

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  jsonlPath: text("jsonl_path").notNull().unique(),
  startedAt: optTs("started_at"),
  endedAt: optTs("ended_at"),
  messageCount: integer("message_count").notNull().default(0),
  totalTokensInput: integer("total_tokens_input").notNull().default(0),
  totalTokensOutput: integer("total_tokens_output").notNull().default(0),
  totalTokensCacheRead: integer("total_tokens_cache_read").notNull().default(0),
  totalTokensCacheCreation: integer("total_tokens_cache_creation").notNull().default(0),
  totalCostUsd: real("total_cost_usd").notNull().default(0),
  lastProcessedOffset: integer("last_processed_offset").notNull().default(0),
  lastProcessedAt: optTs("last_processed_at"),
}, (t) => ({ idxProject: index("idx_sessions_project").on(t.projectId) }));

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id),
  projectId: text("project_id").notNull().references(() => projects.id),
  clientId: text("client_id").references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  status: text("status", { enum: ["open", "paused", "closed"] }).notNull().default("open"),
  startedAt: ts("started_at"),
  endedAt: optTs("ended_at"),
  firstMessageUuid: text("first_message_uuid"),
  lastMessageUuid: text("last_message_uuid"),
  tokensInput: integer("tokens_input").notNull().default(0),
  tokensOutput: integer("tokens_output").notNull().default(0),
  tokensCacheRead: integer("tokens_cache_read").notNull().default(0),
  tokensCacheCreation: integer("tokens_cache_creation").notNull().default(0),
  primaryModel: text("primary_model"),
  modelsUsed: text("models_used"),
  timeInputSeconds: real("time_input_seconds").notNull().default(0),
  timeProcessingOutputSeconds: real("time_processing_output_seconds").notNull().default(0),
  timeReadingSeconds: real("time_reading_seconds").notNull().default(0),
  timeTotalSeconds: real("time_total_seconds").notNull().default(0),
  humanHoursEstimate: real("human_hours_estimate"),
  humanHoursSource: text("human_hours_source", { enum: ["haiku", "manual", "none"] }).notNull().default("none"),
  humanHoursReasoning: text("human_hours_reasoning"),
  billableHours: real("billable_hours"),
  billableHoursLocked: bool("billable_hours_locked"),
  costUsd: real("cost_usd").notNull().default(0),
  isBackfilled: bool("is_backfilled"),
  refinedByHaiku: bool("refined_by_haiku"),
  confidence: real("confidence").notNull().default(1),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
}, (t) => ({
  idxProjectStarted: index("idx_tasks_project_started").on(t.projectId, t.startedAt),
  idxClientStarted: index("idx_tasks_client_started").on(t.clientId, t.startedAt),
  idxStatus: index("idx_tasks_status").on(t.status),
  idxStarted: index("idx_tasks_started").on(t.startedAt),
  idxSession: index("idx_tasks_session").on(t.sessionId),
}));

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"),
  createdAt: ts("created_at"),
});

export const taskTags = sqliteTable("task_tags", {
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.taskId, t.tagId] }),
  idxTag: index("idx_task_tags_tag").on(t.tagId),
}));

export const manualEvents = sqliteTable("manual_events", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => clients.id),
  projectId: text("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  kind: text("kind", { enum: ["meeting", "call", "review", "other"] }).notNull().default("other"),
  startAt: ts("start_at"),
  durationMinutes: integer("duration_minutes").notNull(),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
}, (t) => ({
  idxClientStart: index("idx_events_client_start").on(t.clientId, t.startAt),
  idxProjectStart: index("idx_events_project_start").on(t.projectId, t.startAt),
}));

export const modelPricing = sqliteTable("model_pricing", {
  id: text("id").primaryKey(),
  model: text("model").notNull(),
  inputPerMtok: real("input_per_mtok").notNull(),
  outputPerMtok: real("output_per_mtok").notNull(),
  cacheReadPerMtok: real("cache_read_per_mtok").notNull(),
  cacheCreationPerMtok: real("cache_creation_per_mtok").notNull(),
  validFrom: ts("valid_from"),
  validUntil: optTs("valid_until"),
  source: text("source").notNull().default("manual"),
}, (t) => ({ idxModelFrom: index("idx_pricing_model_from").on(t.model, t.validFrom) }));

export const currencyRates = sqliteTable("currency_rates", {
  date: text("date").primaryKey(),
  usdBrl: real("usd_brl").notNull(),
  source: text("source").notNull(),
  fetchedAt: ts("fetched_at"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: ts("updated_at"),
});

export const daemonRuns = sqliteTable("daemon_runs", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  startedAt: ts("started_at"),
  endedAt: optTs("ended_at"),
  filesScanned: integer("files_scanned").notNull().default(0),
  filesProcessed: integer("files_processed").notNull().default(0),
  tasksCreated: integer("tasks_created").notNull().default(0),
  tasksUpdated: integer("tasks_updated").notNull().default(0),
  errors: text("errors"),
  ok: bool("ok", true),
}, (t) => ({ idxStarted: index("idx_daemon_runs_started").on(t.startedAt) }));

export const devs = sqliteTable("devs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  githubHandle: text("github_handle"),
  active: bool("active", true),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  devId: text("dev_id").references(() => devs.id),
  title: text("title").notNull(),
  description: text("description"),
  targetAt: optTs("target_at"),
  progressPercent: integer("progress_percent").notNull().default(0),
  status: text("status").notNull().default("open"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  scope: text("scope", { enum: ["global", "project", "client", "task", "dev"] }).notNull(),
  scopeRef: text("scope_ref"),
  body: text("body").notNull(),
  pinned: bool("pinned"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});
