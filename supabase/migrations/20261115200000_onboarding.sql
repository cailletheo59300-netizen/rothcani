-- Onboarding : assistant de démarrage + liste « Premiers pas ».
alter table public.profiles add column onboarded_at timestamptz;
alter table public.profiles add column checklist_hidden boolean not null default false;

create or replace function public.onboarding_progress()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'has_location', exists(select 1 from public.locations where user_id = (select auth.uid())),
    'has_lot', exists(select 1 from public.lots where user_id = (select auth.uid())),
    'has_item_photo', exists(select 1 from public.items where user_id = (select auth.uid()) and cardinality(photos) > 0),
    'has_online', exists(select 1 from public.items where user_id = (select auth.uid()) and listed_at is not null),
    'has_sale', exists(select 1 from public.sales where user_id = (select auth.uid()))
  );
$$;
revoke execute on function public.onboarding_progress() from public, anon;
grant execute on function public.onboarding_progress() to authenticated;
