-- Cauce-only persistent guest reservation quota. Apply only to the isolated
-- cauce-commerce-lab database; never apply to La Mediterránea's historic project.
begin;

do $$
begin
  if to_regclass('public.cauce_orders') is null or to_regclass('public.cauce_inventory') is null then
    raise exception 'Cauce isolated schema is required; refusing this migration';
  end if;
end $$;

create table public.cauce_checkout_rate_limits (
  client_hash text primary key check (client_hash ~ '^[a-f0-9]{64}$'),
  window_started timestamptz not null,
  request_hashes text[] not null default '{}'
);
alter table public.cauce_checkout_rate_limits enable row level security;
revoke all on public.cauce_checkout_rate_limits from public, anon, authenticated, service_role;

create function public.cauce_reservation_rate_limit(
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

revoke all on function public.cauce_reservation_rate_limit(text,text,integer,integer)
  from public,anon,authenticated;
grant execute on function public.cauce_reservation_rate_limit(text,text,integer,integer)
  to service_role;
commit;
