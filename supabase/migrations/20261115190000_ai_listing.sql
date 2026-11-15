-- Annonces générées par IA : description de l'article + suivi des coûts IA.
alter table public.items add column description text;

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10,5) not null default 0,
  created_at timestamptz not null default now()
);
create index on public.ai_usage (user_id, created_at);
create index on public.ai_usage (item_id);
alter table public.ai_usage enable row level security;
create policy own_rows_select on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
create policy own_rows_insert on public.ai_usage for insert to authenticated with check (user_id = (select auth.uid()));

-- admin_overview() : ajout de ai_calls_30d et ai_cost_30d (voir la version appliquée en base).
