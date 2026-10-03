-- Two small optional notes on an edition:
--   cover_design  the id of a designed (SVG) cover, e.g. 'dusk'. The app picks one at random
--                 when a book is added and lets the reader change it. Null means "use the
--                 stable default for this title".
--   bought_from   where the reader got this copy: a shop link or an address, free text.
-- Both are private to the owner like the rest of editions (RLS from 0003 already covers them).

alter table public.editions
  add column cover_design text check (char_length(cover_design) between 1 and 40),
  add column bought_from text check (char_length(bought_from) <= 500);

comment on column public.editions.cover_design is
  'Id of the designed SVG cover shown when there is no photo or catalogue cover.';
comment on column public.editions.bought_from is
  'Where the reader got this copy (a link or an address), free text.';
