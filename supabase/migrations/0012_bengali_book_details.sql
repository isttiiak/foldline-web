-- Two optional details for books typed in by hand (mostly Bengali books the catalogues lack):
--   works.title_romanized       the title spelled in Latin letters, e.g. 'Adarsha Hindu Hotel'
--                               for a Bangla-script title. Search will use it later.
--   editions.edition_statement  the edition or printing as the book prints it, free text,
--                               e.g. '3rd printing, February 2023'.
-- Both are private to the owner like the rest of works and editions (RLS from 0003 covers them).

alter table public.works
  add column title_romanized text check (char_length(title_romanized) <= 1000);

alter table public.editions
  add column edition_statement text check (char_length(edition_statement) <= 200);

comment on column public.works.title_romanized is
  'The title spelled in Latin letters (for a title in another script), free text.';
comment on column public.editions.edition_statement is
  'The edition or printing as printed in the book, free text.';
