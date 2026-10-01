-- Sample library for a test account (dev project only, never prod).
--
-- Paste into Supabase Dashboard -> SQL Editor -> Run, after migrations 0003 and 0004.
-- It finds the one account whose email starts with the prefix below and gives it 12
-- books (6 English, 6 Bangla) with authors, editions, reads in every state and progress.
-- Safe to run again: it first removes only the rows it created before (marked
-- {"sample": true} in provider_ids). Change the prefix to seed another test account.

do $seed$
declare
  v_prefix constant text := 'izhaaannn@';
  v_user uuid;
  v_matches integer;
  v_book jsonb;
  v_author_json jsonb;
  v_edition_json jsonb;
  v_read_json jsonb;
  v_progress jsonb;
  v_work uuid;
  v_author uuid;
  v_edition uuid;
  v_read uuid;
  v_editions uuid[];
  v_position smallint;
  v_books constant jsonb := $books$
[
  {
    "title": "The Odyssey",
    "original_title": "Ὀδύσσεια",
    "original_language": "grc",
    "description": "Odysseus spends ten years finding his way home from Troy, while at home his wife and son hold their ground.",
    "authors": [
      {"name": "Homer", "sort_name": "Homer"},
      {"name": "Robert Fagles", "sort_name": "Fagles, Robert", "role": "translator"}
    ],
    "editions": [
      {"format": "paperback", "isbn_13": "9780140268867", "isbn_10": "0140268863",
       "publisher": "Penguin Classics", "published_date": "1999", "page_count": 560,
       "language": "en", "cover_url": "https://covers.openlibrary.org/b/isbn/9780140268867-L.jpg"}
    ],
    "reads": [
      {"edition": 0, "state": "reading", "started_days_ago": 12,
       "progress": [
         {"days_ago": 10, "unit": "pages", "value": 120, "fraction": 0.214, "source": "manual"},
         {"days_ago": 2, "unit": "pages", "value": 212, "fraction": 0.379, "source": "manual"}
       ]}
    ]
  },
  {
    "title": "Pride and Prejudice",
    "original_language": "en",
    "description": "Elizabeth Bennet and Mr Darcy misjudge each other, and slowly learn better.",
    "authors": [{"name": "Jane Austen", "sort_name": "Austen, Jane"}],
    "editions": [
      {"format": "paperback", "isbn_13": "9780141439518", "publisher": "Penguin Classics",
       "published_date": "2002", "page_count": 480, "language": "en",
       "cover_url": "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg"}
    ],
    "reads": [
      {"edition": 0, "state": "finished", "started_days_ago": 120, "finished_days_ago": 95,
       "rating": 9, "reflection": "Sharper and funnier than I remembered. Mr Bennet steals every scene.",
       "progress": [
         {"days_ago": 110, "unit": "pages", "value": 150, "fraction": 0.3125, "source": "manual"},
         {"days_ago": 95, "unit": "pages", "value": 480, "fraction": 1, "source": "manual"}
       ]}
    ]
  },
  {
    "title": "The Hobbit",
    "subtitle": "or There and Back Again",
    "original_language": "en",
    "description": "Bilbo Baggins leaves his comfortable hole for an adventure with thirteen dwarves and a wizard.",
    "series_name": "Middle-earth",
    "series_position": 1,
    "authors": [{"name": "J. R. R. Tolkien", "sort_name": "Tolkien, J. R. R."}],
    "editions": [
      {"format": "hardcover", "isbn_13": "9780547928227", "publisher": "Houghton Mifflin Harcourt",
       "published_date": "2012", "page_count": 300, "language": "en",
       "cover_url": "https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg"},
      {"format": "ebook", "publisher": "HarperCollins", "published_date": "2009", "language": "en"}
    ],
    "reads": [
      {"edition": 0, "state": "finished", "started_days_ago": 800, "finished_days_ago": 780, "rating": 10},
      {"edition": 1, "state": "reading", "started_days_ago": 5,
       "progress": [
         {"days_ago": 3, "unit": "percent", "value": 18, "fraction": 0.18, "source": "kindle", "device": "Kindle Paperwhite"},
         {"days_ago": 0, "unit": "percent", "value": 35, "fraction": 0.35, "source": "kindle", "device": "Kindle Paperwhite"}
       ]}
    ]
  },
  {
    "title": "Sapiens",
    "subtitle": "A Brief History of Humankind",
    "original_title": "קיצור תולדות האנושות",
    "original_language": "he",
    "description": "A sweeping look at how one species of human came to shape the whole planet.",
    "authors": [
      {"name": "Yuval Noah Harari", "sort_name": "Harari, Yuval Noah"},
      {"name": "Derek Perkins", "sort_name": "Perkins, Derek", "role": "narrator"}
    ],
    "editions": [
      {"format": "audiobook", "publisher": "HarperAudio", "published_date": "2015",
       "duration_minutes": 917, "language": "en"},
      {"format": "hardcover", "isbn_13": "9780062316097", "publisher": "Harper",
       "published_date": "2015", "page_count": 464, "language": "en",
       "cover_url": "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg"}
    ],
    "reads": [
      {"edition": 0, "state": "resting", "started_days_ago": 60,
       "progress": [
         {"days_ago": 55, "unit": "minutes", "value": 140, "fraction": 0.153, "source": "audiobookshelf", "device": "Phone"},
         {"days_ago": 41, "unit": "minutes", "value": 310, "fraction": 0.338, "source": "audiobookshelf", "device": "Phone"}
       ]}
    ]
  },
  {
    "title": "Atomic Habits",
    "original_language": "en",
    "description": "Small, steady changes and how they add up.",
    "authors": [{"name": "James Clear", "sort_name": "Clear, James"}],
    "editions": [
      {"format": "hardcover", "isbn_13": "9780735211292", "publisher": "Avery",
       "published_date": "2018", "page_count": 320, "language": "en",
       "cover_url": "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg"}
    ],
    "reads": [
      {"edition": 0, "state": "dnf", "started_days_ago": 40, "stopped_days_ago": 30,
       "reflection": "Not for me right now, and that is fine.",
       "progress": [
         {"days_ago": 32, "unit": "pages", "value": 85, "fraction": 0.266, "source": "manual"}
       ]}
    ]
  },
  {
    "title": "The Little Prince",
    "original_title": "Le Petit Prince",
    "original_language": "fr",
    "description": "A pilot stranded in the desert meets a small traveller from a very small planet.",
    "authors": [
      {"name": "Antoine de Saint-Exupéry", "sort_name": "Saint-Exupéry, Antoine de"},
      {"name": "Richard Howard", "sort_name": "Howard, Richard", "role": "translator"}
    ],
    "editions": [
      {"format": "paperback", "isbn_13": "9780156012195", "publisher": "Harcourt",
       "published_date": "2000", "page_count": 96, "language": "en",
       "cover_url": "https://covers.openlibrary.org/b/isbn/9780156012195-L.jpg"}
    ],
    "reads": [{"edition": 0, "state": "planned"}]
  },
  {
    "title": "পথের পাঁচালী",
    "original_language": "bn",
    "description": "নিশ্চিন্দিপুর গ্রামে অপু আর দুর্গার শৈশব, অভাব আর বিস্ময়ের গল্প।",
    "authors": [{"name": "বিভূতিভূষণ বন্দ্যোপাধ্যায়"}],
    "editions": [
      {"format": "paperback", "publisher": "মিত্র ও ঘোষ", "published_date": "১৯২৯",
       "page_count": 336, "language": "bn"}
    ],
    "reads": [
      {"edition": 0, "state": "reading", "started_days_ago": 20,
       "progress": [
         {"days_ago": 18, "unit": "pages", "value": 60, "fraction": 0.179, "source": "manual"},
         {"days_ago": 3, "unit": "pages", "value": 140, "fraction": 0.417, "source": "manual"}
       ]}
    ]
  },
  {
    "title": "গীতাঞ্জলি",
    "original_language": "bn",
    "description": "রবীন্দ্রনাথ ঠাকুরের গান ও কবিতার সংকলন।",
    "authors": [{"name": "রবীন্দ্রনাথ ঠাকুর"}],
    "editions": [
      {"format": "ebook", "published_date": "১৯১০", "language": "bn"}
    ],
    "reads": [
      {"edition": 0, "state": "finished", "started_days_ago": 70, "finished_days_ago": 50,
       "rating": 10, "reflection": "প্রতিটি কবিতা যেন একটি নীরব প্রার্থনা।",
       "progress": [
         {"days_ago": 60, "unit": "percent", "value": 50, "fraction": 0.5, "source": "manual"},
         {"days_ago": 50, "unit": "percent", "value": 100, "fraction": 1, "source": "manual"}
       ]}
    ]
  },
  {
    "title": "দেবদাস",
    "original_language": "bn",
    "description": "দেবদাস আর পার্বতীর অপূর্ণ ভালোবাসার গল্প।",
    "authors": [{"name": "শরৎচন্দ্র চট্টোপাধ্যায়"}],
    "editions": [
      {"format": "paperback", "published_date": "১৯১৭", "page_count": 120, "language": "bn"}
    ],
    "reads": [
      {"edition": 0, "state": "finished", "started_days_ago": 200, "finished_days_ago": 190, "rating": 7}
    ]
  },
  {
    "title": "লালসালু",
    "original_language": "bn",
    "description": "মজিদ নামের এক মানুষ আর একটি গ্রামের বিশ্বাসের গল্প।",
    "authors": [{"name": "সৈয়দ ওয়ালীউল্লাহ"}],
    "editions": [
      {"format": "paperback", "published_date": "১৯৪৮", "page_count": 104, "language": "bn"}
    ],
    "reads": [{"edition": 0, "state": "planned"}]
  },
  {
    "title": "হাজার বছর ধরে",
    "original_language": "bn",
    "description": "একটি গ্রাম, তার মানুষ আর বয়ে চলা জীবনের ছবি।",
    "authors": [{"name": "জহির রায়হান"}],
    "editions": [
      {"format": "paperback", "published_date": "১৯৬৪", "page_count": 128, "language": "bn"}
    ],
    "reads": [
      {"edition": 0, "state": "resting", "started_days_ago": 35,
       "progress": [
         {"days_ago": 30, "unit": "pages", "value": 45, "fraction": 0.352, "source": "manual"}
       ]}
    ]
  },
  {
    "title": "আমার বন্ধু রাশেদ",
    "original_language": "bn",
    "description": "মুক্তিযুদ্ধের সময় এক কিশোর আর তার বন্ধুর গল্প।",
    "authors": [{"name": "মুহম্মদ জাফর ইকবাল"}],
    "editions": [
      {"format": "audiobook", "duration_minutes": 240, "language": "bn"}
    ],
    "reads": [
      {"edition": 0, "state": "reading", "started_days_ago": 4,
       "progress": [
         {"days_ago": 1, "unit": "minutes", "value": 95, "fraction": 0.396, "source": "manual", "device": "Phone"}
       ]}
    ]
  }
]
$books$;
begin
  select count(*) into v_matches from auth.users where email ilike v_prefix || '%';
  if v_matches <> 1 then
    raise exception 'Expected exactly one account with an email starting "%", found %',
      v_prefix, v_matches;
  end if;
  select id into v_user from auth.users where email ilike v_prefix || '%';

  -- Remove an earlier sample (cascades to editions, credits, reads and progress).
  delete from public.works w
    where w.user_id = v_user
      and exists (
        select 1 from public.editions e
        where e.work_id = w.id and e.provider_ids ? 'sample'
      );
  delete from public.authors a
    where a.user_id = v_user
      and a.provider_ids ? 'sample'
      and not exists (select 1 from public.work_authors wa where wa.author_id = a.id);

  for v_book in select value from jsonb_array_elements(v_books) loop
    insert into public.works (
      user_id, title, subtitle, original_title, original_language, description,
      series_name, series_position
    )
    values (
      v_user, v_book ->> 'title', v_book ->> 'subtitle', v_book ->> 'original_title',
      v_book ->> 'original_language', v_book ->> 'description',
      v_book ->> 'series_name', (v_book ->> 'series_position')::numeric
    )
    returning id into v_work;

    v_position := 0;
    for v_author_json in select value from jsonb_array_elements(v_book -> 'authors') loop
      select id into v_author from public.authors
        where user_id = v_user and name = v_author_json ->> 'name'
        limit 1;
      if v_author is null then
        insert into public.authors (user_id, name, sort_name, provider_ids)
        values (v_user, v_author_json ->> 'name', v_author_json ->> 'sort_name',
                '{"sample": true}')
        returning id into v_author;
      end if;
      insert into public.work_authors (user_id, work_id, author_id, role, position)
      values (
        v_user, v_work, v_author,
        coalesce(v_author_json ->> 'role', 'author')::public.work_author_role, v_position
      );
      v_position := v_position + 1;
    end loop;

    v_editions := '{}';
    for v_edition_json in select value from jsonb_array_elements(v_book -> 'editions') loop
      insert into public.editions (
        user_id, work_id, format, isbn_10, isbn_13, publisher, published_date,
        page_count, duration_minutes, language, cover_url, provider_ids
      )
      values (
        v_user, v_work, (v_edition_json ->> 'format')::public.edition_format,
        v_edition_json ->> 'isbn_10', v_edition_json ->> 'isbn_13',
        v_edition_json ->> 'publisher', v_edition_json ->> 'published_date',
        (v_edition_json ->> 'page_count')::integer,
        (v_edition_json ->> 'duration_minutes')::integer,
        v_edition_json ->> 'language', v_edition_json ->> 'cover_url', '{"sample": true}'
      )
      returning id into v_edition;
      v_editions := v_editions || v_edition;
    end loop;

    for v_read_json in
      select value from jsonb_array_elements(coalesce(v_book -> 'reads', '[]'))
    loop
      insert into public.reads (
        user_id, work_id, edition_id, state, started_on, finished_on, stopped_on,
        rating, reflection
      )
      values (
        v_user, v_work, v_editions[(v_read_json ->> 'edition')::integer + 1],
        (v_read_json ->> 'state')::public.read_state,
        current_date - (v_read_json ->> 'started_days_ago')::integer,
        current_date - (v_read_json ->> 'finished_days_ago')::integer,
        current_date - (v_read_json ->> 'stopped_days_ago')::integer,
        (v_read_json ->> 'rating')::smallint, v_read_json ->> 'reflection'
      )
      returning id into v_read;

      for v_progress in
        select value from jsonb_array_elements(coalesce(v_read_json -> 'progress', '[]'))
      loop
        insert into public.progress_events (
          user_id, read_id, occurred_at, unit, value, fraction, source, device
        )
        values (
          v_user, v_read,
          now() - make_interval(days => (v_progress ->> 'days_ago')::integer, hours => 2),
          (v_progress ->> 'unit')::public.progress_unit,
          (v_progress ->> 'value')::numeric, (v_progress ->> 'fraction')::numeric,
          (v_progress ->> 'source')::public.progress_source, v_progress ->> 'device'
        );
      end loop;
    end loop;
  end loop;

  raise notice 'Sample library ready: % works, % editions, % reads, % progress entries',
    (select count(*) from public.works where user_id = v_user),
    (select count(*) from public.editions where user_id = v_user),
    (select count(*) from public.reads where user_id = v_user),
    (select count(*) from public.progress_events where user_id = v_user);
end
$seed$;
