-- Opportunistically prune only quota fingerprints inactive for at least 24 hours.
-- This table contains no orders or inventory; the bounded delete runs in the
-- same isolated Cauce RPC and never targets an active 10-minute quota window.
begin;

create index if not exists cauce_checkout_rate_limits_window_started_idx
  on public.cauce_checkout_rate_limits (window_started);

create or replace function public.cauce_reservation_rate_limit(
  p_client_hash text,
  p_request_hash text,
  p_max_attempts integer,
  p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  current_window timestamptz;
  current_hashes text[];
begin
  if coalesce(p_client_hash,'') !~ '^[a-f0-9]{64}$'
    or coalesce(p_request_hash,'') !~ '^[a-f0-9]{64}$'
    or p_max_attempts not between 1 and 20
    or p_window_seconds not between 60 and 3600 then
    raise exception 'Invalid Cauce rate limit input' using errcode='22023';
  end if;

  with stale_rows as (
    select ctid
    from public.cauce_checkout_rate_limits
    where window_started < now() - interval '24 hours'
    order by window_started
    limit 250
  )
  delete from public.cauce_checkout_rate_limits as limits
  using stale_rows
  where limits.ctid = stale_rows.ctid;

  insert into public.cauce_checkout_rate_limits(client_hash,window_started,request_hashes)
    values(p_client_hash,now(),array[p_request_hash])
    on conflict(client_hash) do nothing;

  select window_started,request_hashes into current_window,current_hashes
    from public.cauce_checkout_rate_limits where client_hash=p_client_hash for update;

  if current_window <= now() - pg_catalog.make_interval(secs => p_window_seconds) then
    update public.cauce_checkout_rate_limits set window_started=now(),
      request_hashes=array[p_request_hash] where client_hash=p_client_hash;
    return true;
  end if;

  if p_request_hash = any(current_hashes) then return true; end if;
  if pg_catalog.cardinality(current_hashes) >= p_max_attempts then return false; end if;

  update public.cauce_checkout_rate_limits set request_hashes=array_append(current_hashes,p_request_hash)
    where client_hash=p_client_hash;
  return true;
end;
$$;

commit;
