-- Statistiques calculées en base (pas de limite de 1000 lignes côté API).
create or replace function public.dashboard_stats(month_start date, dormant_before timestamptz)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with me as (select (select auth.uid()) as uid),
  costs as (select item_id, cost from public.item_costs where user_id = (select uid from me)),
  it as (select i.id, i.status, i.listed_at, coalesce(c.cost,0) cost from public.items i left join costs c on c.item_id = i.id where i.user_id = (select uid from me)),
  sm as (select s.*, coalesce(c.cost,0) cost from public.sales s left join costs c on c.item_id = s.item_id where s.user_id = (select uid from me) and s.sold_on >= month_start),
  sa as (select s.sold_on, i.listed_at from public.sales s join public.items i on i.id = s.item_id where s.user_id = (select uid from me) and i.listed_at is not null)
  select jsonb_build_object(
    'counts', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from it group by status) x), '{}'::jsonb),
    'items_total', (select count(*) from it),
    'stock_value', coalesce((select sum(cost) from it where status in ('arrivage','tri','preparation','photos','pret','en_ligne')), 0),
    'month_sales', (select count(*) from sm),
    'month_revenue', coalesce((select sum(sale_price) from sm), 0),
    'month_profit', coalesce((select sum(sale_price - cost - packaging_fee - shipping_fee - platform_fee) from sm), 0),
    'avg_days_to_sell', (select round(avg(greatest(0, sold_on - listed_at::date)))::int from sa),
    'dormant_count', (select count(*) from it where status = 'en_ligne' and listed_at < dormant_before)
  );
$$;

create or replace function public.lot_stats()
returns table (lot_id uuid, items bigint, sold bigint, invested numeric, recovered numeric)
language sql stable security invoker set search_path = '' as $$
  select l.id,
    (select count(*) from public.items i where i.lot_id = l.id),
    (select count(*) from public.sales s join public.items i on i.id = s.item_id where i.lot_id = l.id),
    l.price + l.shipping_cost,
    coalesce((select sum(s.sale_price - s.packaging_fee - s.shipping_fee - s.platform_fee) from public.sales s join public.items i on i.id = s.item_id where i.lot_id = l.id), 0)
  from public.lots l where l.user_id = (select auth.uid());
$$;

create or replace function public.supplier_stats()
returns table (supplier_id uuid, lots bigint, items bigint, sold bigint, invested numeric, recovered numeric)
language sql stable security invoker set search_path = '' as $$
  select sp.id,
    count(distinct ls.lot_id),
    coalesce(sum(ls.items),0)::bigint,
    coalesce(sum(ls.sold),0)::bigint,
    coalesce(sum(ls.invested),0),
    coalesce(sum(ls.recovered),0)
  from public.suppliers sp
  left join public.lots l on l.supplier_id = sp.id
  left join public.lot_stats() ls on ls.lot_id = l.id
  where sp.user_id = (select auth.uid())
  group by sp.id;
$$;

revoke execute on function public.dashboard_stats(date, timestamptz), public.lot_stats(), public.supplier_stats() from public, anon;
grant execute on function public.dashboard_stats(date, timestamptz), public.lot_stats(), public.supplier_stats() to authenticated;
