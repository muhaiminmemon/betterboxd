import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  timestamp,
  date,
  jsonb,
  doublePrecision,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  bio: text("bio"),
  // public | friends | private
  privacy: text("privacy").notNull().default("public"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const films = pgTable("films", {
  id: uuid("id").primaryKey().defaultRandom(),
  tmdbId: integer("tmdb_id").unique(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  year: integer("year"),
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  director: text("director"),
  runtime: integer("runtime"),
  genres: jsonb("genres").$type<string[]>(),
  overview: text("overview"),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per viewing. Historical ratings never change; a film's current
 * rating is derived from the most recent *rated* entry.
 * `rating` is stored in tenths: 10..100 for 1.0..10.0. Null = watched, no rating.
 */
export const diaryEntries = pgTable(
  "diary_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    filmId: uuid("film_id")
      .notNull()
      .references(() => films.id),
    watchedOn: date("watched_on"),
    rating: smallint("rating"),
    review: text("review"),
    rewatch: boolean("rewatch").notNull().default(false),
    importId: uuid("import_id"),
    // idempotency key for imported rows; null for manual entries
    sourceKey: text("source_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("diary_source_key_uq").on(t.userId, t.sourceKey),
    index("diary_user_film_idx").on(t.userId, t.filmId),
  ],
);

export const imports = pgTable("imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  filenames: jsonb("filenames").$type<string[]>(),
  // previewed | committed | undone
  status: text("status").notNull().default("previewed"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  committedAt: timestamp("committed_at", { withTimezone: true }),
});

/** Manual secondary order among films tied on the same rating. */
export const libraryOrder = pgTable(
  "library_order",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    filmId: uuid("film_id")
      .notNull()
      .references(() => films.id),
    sortKey: doublePrecision("sort_key").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.filmId] })],
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    filmId: uuid("film_id")
      .notNull()
      .references(() => films.id),
    // capture reason: who recommended it or where you saw it
    source: text("source"),
    importId: uuid("import_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("watchlist_user_film_uq").on(t.userId, t.filmId)],
);

export type User = typeof users.$inferSelect;
export type Film = typeof films.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
