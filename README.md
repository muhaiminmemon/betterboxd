# Betterboxd

A film diary with ratings that mean something. Log what you watch, rate it on a
1.0–10.0 scale in tenths, keep your rewatch history honest, and (soon) find
something to watch with a friend.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS 4
- PostgreSQL via Drizzle ORM (`pg_trgm` for fuzzy title search)
- TMDB for all film metadata
- No ML, no embeddings, no AI APIs — recommendations (Alpha 2) are metadata scoring only

## Running locally

```sh
npm install
cp .env.example .env.local   # fill in DATABASE_URL and TMDB_API_KEY
docker compose up -d          # local Postgres, or use Supabase/Neon/Railway
npm run db:push               # enables pg_trgm + pushes the schema
npm run dev
```

Get a free TMDB API key at https://www.themoviedb.org/settings/api.

## Design system

Chrome is deliberately quiet — film posters are the color.

| Token | Hex | Role |
|---|---|---|
| carbon | `#141417` | page background |
| tray | `#1C1C21` | raised surfaces |
| seam | `#2A2A31` | borders |
| paper | `#ECEAE6` | primary text (and ratings — no accent on numbers) |
| ash | `#9A9AA3` | secondary text |
| beam | `#8FAECC` | interactive state only: focus, selection |

Type: Space Grotesk for display and numerals (always tabular — decimals align
down a column), IBM Plex Sans for body.

## Data model

```
films          one row per film, keyed to TMDB
diary_entries  one row per viewing; rating in tenths (10..100) or null
```

A film's **current rating** is the most recent *rated* entry. An unrated later
viewing never erases the last actual rating:

```
2023 → 8.2 · 2024 → watched, no rating · current: 8.2
```

Ties on rating keep a manual order (`library_order`), set by drag-to-reorder.

## Letterboxd import

Stars × 2 (`4★ → 8.0`). Upload `diary.csv`, `ratings.csv`, `watched.csv`, or
`watchlist.csv`. The importer previews everything, lets you correct unmatched
titles, is idempotent (re-importing never duplicates), and can be undone.

## Roadmap

- **Alpha 0 — done:** auth, import with preview/correction/undo, ranked library
  with drag-to-reorder ties, rating dial, rewatch timeline, public profiles,
  diary, watchlist with capture reason, full export
- **Alpha 1:** richer logging, reviews with spoiler labels
- **Alpha 2:** mutual friends, "What should we watch?" (metadata scoring,
  conservative pair combination, no visible fit scores)
- **Phase 3:** friends feed, comments, collaborative lists, blocking/reporting

Film data from [TMDB](https://www.themoviedb.org). This product uses the TMDB
API but is not endorsed or certified by TMDB.
