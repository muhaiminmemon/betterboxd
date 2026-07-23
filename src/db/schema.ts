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
  // who may comment on their reviews: anyone | friends | off
  commentPermission: text("comment_permission").notNull().default("friends"),
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
  castNames: jsonb("cast_names").$type<string[]>(),
  keywords: jsonb("keywords").$type<string[]>(),
  popularity: doublePrecision("popularity"),
  voteCount: integer("vote_count"),
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
    spoiler: boolean("spoiler").notNull().default(false),
    private: boolean("private").notNull().default(false),
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

/** Mutual friendship, one row per pair; ids stored low/high so the pair is unique. */
export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userLowId: uuid("user_low_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userHighId: uuid("user_high_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("friendship_pair_uq").on(t.userLowId, t.userHighId)],
);

/** Pending friend requests; accepting creates the mutual friendship. */
export const friendRequests = pgTable(
  "friend_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromId: uuid("from_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toId: uuid("to_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("friend_request_uq").on(t.fromId, t.toId)],
);

/** Shareable invite links; accepting one creates a mutual friendship. */
export const invites = pgTable("invites", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-user recommendation feedback: seen (watched but never logged) or not interested. */
export const userFilmFlags = pgTable(
  "user_film_flags",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    filmId: uuid("film_id")
      .notNull()
      .references(() => films.id),
    // seen | not_interested
    flag: text("flag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.filmId, t.flag] })],
);

/** Outcome tracking per pair, per film: shown, saved, dismissed, seen. */
export const recEvents = pgTable(
  "rec_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pairKey: text("pair_key").notNull(),
    filmId: uuid("film_id")
      .notNull()
      .references(() => films.id),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    event: text("event").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rec_events_pair_idx").on(t.pairKey, t.event)],
);

export const lists = pgTable("lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  // set for the auto-created shared list of a friend pair
  pairKey: text("pair_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listMembers = pgTable(
  "list_members",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // owner | editor | viewer
    role: text("role").notNull().default("viewer"),
  },
  (t) => [primaryKey({ columns: [t.listId, t.userId] })],
);

export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    filmId: uuid("film_id")
      .notNull()
      .references(() => films.id),
    addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }),
    position: doublePrecision("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("list_items_uq").on(t.listId, t.filmId)],
);

/** Comments on reviews (diary entries that have review text). */
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => diaryEntries.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_entry_idx").on(t.entryId)],
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // user | review | comment
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Film = typeof films.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
