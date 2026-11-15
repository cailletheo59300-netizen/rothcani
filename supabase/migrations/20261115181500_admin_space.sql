-- Espace administrateur : rôles « owner » (tout) et « marketing » (chiffres globaux).
-- Pour ajouter l'associé : insert into public.app_admins(email, role) values ('son-email@exemple.fr', 'marketing');

create table public.app_admins (
  email text primary key check (email = lower(email)),
  role text not null check (role in ('owner','marketing')),
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
-- aucune policy : table accessible uniquement via les fonctions ci-dessous

create or replace function public.admin_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.app_admins where email = lower(coalesce(auth.jwt()->>'email',''));
$$;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r text := public.admin_role();
begin
  if r is null then raise exception 'not_admin' using errcode = '42501'; end if;
  return jsonb_build_object(
    'role', r,
    'users_total', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'users_with_items', (select count(distinct user_id) from public.items),
    'items_total', (select count(*) from public.items),
    'items_7d', (select count(*) from public.items where created_at > now() - interval '7 days'),
    'sales_total', (select count(*) from public.sales),
    'sales_30d', (select count(*) from public.sales where created_at > now() - interval '30 days'),
    'lots_total', (select count(*) from public.lots),
    'signups_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', coalesce(c.n,0)) order by d), '[]'::jsonb)
      from generate_series(current_date - 29, current_date, interval '1 day') d
      left join (select created_at::date as day, count(*) n from auth.users group by 1) c on c.day = d::date
    ),
    'items_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', coalesce(c.n,0)) order by d), '[]'::jsonb)
      from generate_series(current_date - 29, current_date, interval '1 day') d
      left join (select created_at::date as day, count(*) n from public.items group by 1) c on c.day = d::date
    )
  );
end $$;

create or replace function public.admin_users()
returns table (email text, created_at timestamptz, last_sign_in_at timestamptz, items bigint, sales bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.admin_role() is distinct from 'owner' then raise exception 'not_owner' using errcode = '42501'; end if;
  return query
    select u.email::text, u.created_at, u.last_sign_in_at,
      (select count(*) from public.items i where i.user_id = u.id),
      (select count(*) from public.sales s where s.user_id = u.id)
    from auth.users u order by u.created_at desc limit 500;
end $$;

revoke execute on function public.admin_role(), public.admin_overview(), public.admin_users() from public, anon;
grant execute on function public.admin_role(), public.admin_overview(), public.admin_users() to authenticated;
-- Le premier administrateur (owner) a été ajouté directement en base, par e-mail.
