-- =============================================================================
-- Plateforme Eau Libreville — Vues métier
-- =============================================================================

-- -----------------------------------------------------------------------------
-- current_prices : tarifs actuellement en vigueur (lecture publique)
-- -----------------------------------------------------------------------------
create or replace view current_prices as
select
  pt.id             as tier_id,
  pt.volume_liters,
  pt.label,
  pt.display_order,
  pv.id             as version_id,
  pv.price_fcfa,
  pv.valid_from,
  pv.reason,
  pv.reference_doc
from price_tiers pt
join price_versions pv on pv.tier_id = pt.id
where pt.active
  and pv.valid_from <= now()
  and (pv.valid_to is null or pv.valid_to > now())
order by pt.display_order;

comment on view current_prices is 'Tarifs officiels en vigueur — lecture publique via RLS.';

-- -----------------------------------------------------------------------------
-- public_companies : fiche société côté client (cdc §4.3, §5.4)
-- -----------------------------------------------------------------------------
create or replace view public_companies as
select
  c.id,
  c.commercial_name,
  c.operator_type,
  c.address,
  c.phone,
  c.email,
  c.logo_url,
  c.opening_hours,
  c.average_delay_minutes,
  c.success_rate,
  c.orders_count,
  coalesce(array_agg(cz.zone_id) filter (where cz.zone_id is not null), '{}') as zone_ids
from companies c
left join company_zones cz on cz.company_id = c.id
where c.status = 'active'
group by c.id;

-- -----------------------------------------------------------------------------
-- available_companies_by_zone : sociétés disponibles par zone client (cdc §4.2/§4.3)
-- -----------------------------------------------------------------------------
create or replace view available_companies_by_zone as
select
  cz.zone_id,
  c.id                       as company_id,
  c.commercial_name,
  c.operator_type,
  c.logo_url,
  c.average_delay_minutes,
  c.success_rate,
  c.orders_count,
  c.opening_hours
from companies c
join company_zones cz on cz.company_id = c.id
where c.status = 'active';

-- -----------------------------------------------------------------------------
-- driver_performance : indicateurs livreur (admin, supervision)
-- -----------------------------------------------------------------------------
create or replace view driver_performance as
select
  d.id                                                       as driver_id,
  d.company_id,
  count(o.id) filter (where o.order_status = 'delivered')    as delivered_count,
  count(o.id) filter (where o.order_status = 'cancelled')    as cancelled_count,
  count(o.id) filter (where o.order_status = 'incident')     as incident_count,
  avg(extract(epoch from (o.actual_delivered_at - o.created_at))/60)
    filter (where o.order_status = 'delivered')              as avg_delivery_minutes,
  max(o.actual_delivered_at)                                 as last_delivered_at
from drivers d
left join orders o on o.driver_id = d.id
group by d.id, d.company_id;

-- -----------------------------------------------------------------------------
-- company_daily_kpi : indicateurs société du jour (dashboard cdc §5.2)
-- -----------------------------------------------------------------------------
create or replace view company_daily_kpi as
select
  o.company_id,
  current_date                                                              as day,
  count(*)                                                                  as total_orders,
  count(*) filter (where o.order_status = 'pending')                        as pending_orders,
  count(*) filter (where o.order_status = 'accepted')                       as accepted_orders,
  count(*) filter (where o.order_status = 'driver_en_route')                as in_delivery_orders,
  count(*) filter (where o.order_status = 'delivered')                      as delivered_orders,
  count(*) filter (where o.order_status = 'cancelled')                      as cancelled_orders,
  count(*) filter (where o.order_status = 'incident')                       as incident_orders,
  sum(o.total_amount_fcfa) filter (where o.order_status = 'delivered')      as revenue_fcfa
from orders o
where o.created_at >= date_trunc('day', now())
group by o.company_id;

-- -----------------------------------------------------------------------------
-- uncovered_zones : zones sans société active (cdc §8.3)
-- -----------------------------------------------------------------------------
create or replace view uncovered_zones as
select z.id, z.name, z.sector, z.status
from zones z
where z.status = 'active'
  and not exists (
    select 1
    from company_zones cz
    join companies c on c.id = cz.company_id
    where cz.zone_id = z.id and c.status = 'active'
  );
