# Changelog

All notable changes to Foldline. Versions follow [SemVer](https://semver.org); while the
version is `0.x`, anything may still change. Each release is an annotated git tag
(`vX.Y.Z`) with `package.json` at the same version.

## v0.9.1 (2026-10-15)

Checked on the smallest current iPhone screen (iPhone SE, 375 x 667).

### Fixed

- The time zone picker on your profile was squashed to a thin strip on phones.
- Small cover thumbnails (the editions list) now scale their title and author instead of overlapping.
- The installed iPhone app no longer draws under the status bar.

### Changed

- A little more room for content on phones (narrower side margins in the app).
- Larger tap areas for the Privacy and Terms links in the footer.
- A new end-to-end check keeps every app page, sheet and menu inside an iPhone SE screen, with no form
  field small enough to make iOS zoom in.

### Database migrations

None.

## v0.9.0 (2026-10-15)

Foldline as an app, with or without a connection.

### Added

- Install Foldline on your phone or computer: it opens in its own window from the home screen or
  dock. Settings has a "Use Foldline as an app" card with the steps for your browser.
- Works offline: pages you opened recently stay readable, and anything else shows a calm offline
  page instead of an error.
- Log progress without a connection. It is kept on your device and added by itself once you are back
  online (in the background on Chrome and Android), never twice. A small note tells you what is waiting.
- Share a book from another app (a shop page, Open Library, a message with an ISBN) straight into
  Foldline: Add book opens with it already in the search box.

### Changed

- Signing out clears what this device kept for you (cached pages and anything waiting to be sent),
  so the next person on a shared device sees nothing.

### Database migrations

None.

### Road to v1.0.0

Phase 5 is done. Still to come before v1.0.0: the reading rhythm view (Phase 3), the management
phase with imports and the full export (Phase 4), and the license decision (see `docs/ROADMAP.md`).

## v0.8.0 (2026-10-15)

Goals, only if you want them.

### Added

- Opt-in reading goals: books finished or pages read over a year, a month or dates you pick. Set as many
  as you like, or none at all. Progress is shown plainly, never as "behind".
- Pages goals count the pages you log in that time, and finishing a book counts the rest of it.
- A warm moment, once, when you reach a goal. Fold a goal away or remove it any time.
- A small card with your current goals on the library page, and Goals in the sidebar and search palette.

### Database migrations

- `0007_reading_goals.sql`: the `reading_goals` table (private to each reader).

## v0.7.0 (2026-10-03)

A quiet page about your own reading.

### Added

- Stats: how many books are on your shelf and in each state, books finished per year and over the last
  twelve months, pages and listening time, formats and languages, a typical time to finish, your rating
  average and the authors you finished most. Only you can see it, and it never scores you.
- Hide your stats whenever you like. While hidden nothing is calculated and the link disappears.
- Stats in the sidebar and in the search palette.

### Database migrations

None.

## v0.6.0 (2026-10-03)

Calmer covers, a search box that behaves, and a note for where a book came from.

### Added

- Ten designed, softly coloured covers for books with no photo or catalogue cover. One is picked
  at random when you add a book; shuffle or choose another while adding, or later in the edition
  sheet. Your own photo always comes first.
- "Where I got it" on every edition: a shop link or an address, only visible to you.
- A new favicon and home-screen icon drawn from the fold mark.
- Typing an ISBN no catalogue knows now carries the number into "Add it by hand".

### Changed

- The reading-state label sits under the title on shelf cards instead of covering the cover.
- Covers use calm, low-saturation colours instead of bright gradients.

### Fixed

- Typing in the library search could delete the letters just typed.

### Database migrations

- `0006_cover_design_and_source.sql`: two optional columns on `editions` (`cover_design`, `bought_from`).
  Run it before using this version.

## v0.5.0 (2026-10-03)

A warm moment for finishing, a gentle one for putting a book down.

### Added

- Finishing a book opens a short, animated moment with an optional rating and a few words for
  future you. Setting a book down opens a quiet one with an optional note. Both are skippable,
  and nothing is saved unless you ask.

### Fixed

- A reflection saved elsewhere now shows up in the read editor without a reload.

### Database migrations

None.

## v0.4.0 (2026-10-01)

Reach anything from the keyboard.

### Added

- Command palette: press ⌘K (Ctrl+K elsewhere) or tap Search to find a book, add one, jump to
  a page, or log progress without leaving where you are. Works with Bangla titles.

### Database migrations

None.

## v0.3.0 (2026-10-01)

Find your books: search, filter and sort the shelf.

### Added

- Search the library by title or author (Bangla too).
- Filter by reading state (with counts) and by format; sort by recently added, title,
  author, recently finished or rating. The view lives in the page address, so back and
  bookmarks work.
- "Show more books" after the first 60, and a kind message when nothing matches.

### Database migrations

None.

## v0.2.0 (2026-10-01)

Every book now has its own page: fix its details, keep several editions, track each read
and log progress in whatever unit the book speaks.

### Added

- Book page (`/app/books/<id>`), opened from the shelf: cover, authors, series, details,
  description and editions.
- Edit a book's and an edition's details by hand; edited fields are locked against the
  catalogues and can be unlocked again. Refresh an edition from the catalogues by ISBN.
- Editions: add another (format, ISBN, pages or minutes), edit, remove, and give each its
  own cover photo.
- Reads: want to read, reading, resting, finished or didn't finish, with dates; a rating
  in half stars; a few words for future you; read a book again and keep earlier reads.
- Progress in pages, percent, location, minutes or chapter, with a calm history.
- Remove a book with all its reads, progress and cover photos.

### Fixed

- Reads created at the same moment (such as the dev sample library) now agree on which
  one is current, on the shelf and on the book page.

### Database migrations

None.

## v0.1.0 (2026-10-01)

The first usable build: sign in, set up a private profile, add books in English or Bangla
and see them on your shelf. Not yet deployed (Vercel and the prod project come next).

### Added

- Google sign-in, protected `/app`, and a welcoming login page; open sign-up.
- Public landing page with an animated book, features, how it works and FAQ; privacy
  policy and terms in plain language; SEO basics (metadata, Open Graph image, sitemap,
  robots, JSON-LD, `llms.txt`).
- Motion system that honours `prefers-reduced-motion`; dark, warm theme.
- Settings: download all your data as JSON, and delete your account (with its photos and
  covers).
- Rate limits for sign-in, export, deletion, profile changes, book lookups and adding books.
- Core library schema (works, authors, editions, reads, progress) with row-level security
  and same-owner references.
- Book lookup from Open Library and Google Books, cached, with field locks so your own
  edits are never overwritten.
- Private profile page: Google photo or your own, name, bio, timezone, favourite formats
  and genres.
- Add a book: search by title or author, paste an ISBN or a link, or add it by hand (with
  your own cover photo); choose where it goes on your shelf.
- A simple shelf on `/app` with covers (or generated warm covers), state and progress.
- Dev-only sample library script for test accounts.

### Database migrations

Run in order in the Supabase SQL Editor (see `docs/MIGRATIONS.md`):
`0001_create_profiles`, `0002_create_rate_limits`, `0003_create_library`,
`0004_profile_details`, `0005_book_covers`.
