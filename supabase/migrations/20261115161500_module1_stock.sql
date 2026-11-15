-- Module 1 : stock et marges
-- Appliquée au projet Supabase « saas-revendeurs » le 15/11/2026.

create type item_status as enum ('arrivage','tri','preparation','photos','pret','en_ligne','vendu','expedie','ecarte');
create type cost_mode as enum ('egal','prorata','manuel');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_packaging_fee numeric(10,2) not null default 0,
  default_shipping_fee numeric(10,2) not null default 0,
  default_platform_fee numeric(10,2) not null default 0,
  dormant_days int not null default 30,
  created_at timestamptz not null default now()
);

create table public.sales_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  platform text not null default 'Vinted',
  color text not null default '#14b8a6',
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text,
  contact text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchased_on date not null default current_date,
  price numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  cost_mode cost_mode not null default 'egal',
  notes text,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ref_number int not null,
  title text not null,
  brand text,
  category text,
  size text,
  condition text,
  color text,
  lot_id uuid references public.lots(id) on delete set null,
  manual_cost numeric(10,2),
  listed_price numeric(10,2),
  floor_price numeric(10,2),
  status item_status not null default 'arrivage',
  location_id uuid references public.locations(id) on delete set null,
  sales_account_id uuid references public.sales_accounts(id) on delete set null,
  photos text[] not null default '{}',
  notes text,
  listed_at timestamptz,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, ref_number)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null unique references public.items(id) on delete cascade,
  sold_on date not null default current_date,
  sale_price numeric(10,2) not null,
  packaging_fee numeric(10,2) not null default 0,
  shipping_fee numeric(10,2) not null default 0,
  platform_fee numeric(10,2) not null default 0,
  sales_account_id uuid references public.sales_accounts(id) on delete set null,
  buyer text,
  created_at timestamptz not null default now()
);

create table public.item_status_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  status item_status not null,
  changed_at timestamptz not null default now()
);

create index on public.items (user_id, status);
create index on public.items (lot_id);
create index on public.items (location_id);
create index on public.items (sales_account_id);
create index on public.lots (user_id);
create index on public.lots (supplier_id);
create index on public.sales (user_id, sold_on);
create index on public.sales (sales_account_id);
create index on public.item_status_history (item_id);
create index on public.item_status_history (user_id);
create index on public.sales_accounts (user_id);
create index on public.suppliers (user_id);
create index on public.locations (user_id);

-- Référence courte par utilisateur (A-0001…) + historique des statuts
create or replace function public.items_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.ref_number is null or new.ref_number = 0 then
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    select coalesce(max(ref_number),0)+1 into new.ref_number from public.items where user_id = new.user_id;
  end if;
  if new.status = 'en_ligne' and new.listed_at is null then new.listed_at := now(); end if;
  return new;
end $$;
create trigger items_bi before insert on public.items for each row execute function public.items_before_insert();

create or replace function public.items_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    if new.status = 'en_ligne' and new.listed_at is null then new.listed_at := now(); end if;
  end if;
  return new;
end $$;
create trigger items_bu before update on public.items for each row execute function public.items_before_update();

create or replace function public.items_after_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.item_status_history(user_id,item_id,status) values (new.user_id,new.id,new.status);
  end if;
  return new;
end $$;
create trigger items_ai after insert or update of status on public.items for each row execute function public.items_after_status();

-- À l'inscription : profil + un premier compte de vente
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name) values (new.id, split_part(new.email,'@',1));
  insert into public.sales_accounts(user_id, name) values (new.id, 'Mon compte Vinted');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Coût d'achat de chaque article (répartition du coût du lot)
create or replace view public.item_costs with (security_invoker = true) as
select i.id as item_id, i.user_id,
  coalesce(i.manual_cost,
    case
      when l.id is null then 0
      when l.cost_mode = 'egal' then (l.price + l.shipping_cost) / nullif(count(*) over (partition by l.id),0)
      when l.cost_mode = 'prorata' then (l.price + l.shipping_cost) * coalesce(i.listed_price,0) / nullif(sum(coalesce(i.listed_price,0)) over (partition by l.id),0)
      else 0
    end, 0)::numeric(10,2) as cost
from public.items i left join public.lots l on l.id = i.lot_id;

-- Cloisonnement : chaque utilisateur ne voit que ses lignes
alter table public.profiles enable row level security;
alter table public.sales_accounts enable row level security;
alter table public.suppliers enable row level security;
alter table public.locations enable row level security;
alter table public.lots enable row level security;
alter table public.items enable row level security;
alter table public.sales enable row level security;
alter table public.item_status_history enable row level security;

create policy own_profile on public.profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy own_rows on public.sales_accounts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on public.suppliers for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on public.locations for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on public.lots for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on public.items for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on public.sales for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on public.item_status_history for select to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.items_after_status() from public, anon, authenticated;
revoke execute on function public.items_before_insert() from public, anon, authenticated;

-- Photos : bucket privé, un dossier par utilisateur
insert into storage.buckets (id, name, public) values ('item-photos','item-photos', false);
create policy photos_select on storage.objects for select to authenticated using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_insert on storage.objects for insert to authenticated with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_delete on storage.objects for delete to authenticated using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
