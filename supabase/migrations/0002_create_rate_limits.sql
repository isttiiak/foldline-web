-- Rate limits: fixed-window hit counters for server actions and route handlers.
--
-- Not user-owned: a bucket is a policy name plus a subject (a user id or a hashed
-- IP address, never a raw IP). Like provider_cache, RLS is on with NO policies and
-- anon/authenticated have no grants, so only the server (secret key) can use it.
-- Windows must be at most one day long: rows older than a day are swept away.

create table public.rate_limits (
  bucket text not null check (char_length(bucket) between 1 and 200),
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (bucket, window_start)
);

comment on table public.rate_limits is
  'Fixed-window rate limit counters. Server-only; bucket = policy:subject (user id or hashed IP).';

create index rate_limits_window_start_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from anon, authenticated;

-- Count one hit for a bucket and say whether it is still within the limit.
-- Atomic: concurrent calls serialise on the (bucket, window_start) row.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit (limit %, window %s)', p_limit, p_window_seconds
      using errcode = '22023';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window_start, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Housekeeping: this bucket's finished windows now, everyone's stale rows now and then.
  delete from public.rate_limits
    where bucket = p_bucket and window_start < v_window_start;
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return query select
    v_hits <= p_limit,
    greatest(p_limit - v_hits, 0),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
