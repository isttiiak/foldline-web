# Changelog

All notable changes to Foldline. Versions follow [SemVer](https://semver.org); while the
version is `0.x`, anything may still change. Each release is an annotated git tag
(`vX.Y.Z`) with `package.json` at the same version.

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
