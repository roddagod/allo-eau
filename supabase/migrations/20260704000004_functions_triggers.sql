-- =============================================================================
-- Plateforme Eau Libreville — Fonctions et triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Générique: updated_at automatique
-- -----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger set_updated_at_zones     before update on zones     for each row execute function set_updated_at();
create trigger set_updated_at_companies before update on companies for each row execute function set_updated_at();
create trigger set_updated_at_profiles  before update on profiles  for each row execute function set_updated_at();
create trigger set_updated_at_drivers   before update on drivers   for each row execute function set_updated_at();
create trigger set_updated_at_orders    before update on orders    for each row execute function set_updated_at();
create trigger set_updated_at_payments  before update on payments  for each row execute function set_updated_at();
create trigger set_updated_at_routes    before update on routes    for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Création automatique du profil quand un compte Supabase Auth est créé
-- -----------------------------------------------------------------------------
create or replace function handle_new_auth_user() returns trigger
  language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- Anti-escalade de rôle: seuls admin/super_admin peuvent modifier role/company_id
-- -----------------------------------------------------------------------------
create or replace function prevent_role_escalation() returns trigger
  language plpgsql security definer as $$
declare
  actor_role user_role;
begin
  select role into actor_role from profiles where id = auth.uid();

  if (new.role is distinct from old.role
      or new.company_id is distinct from old.company_id
      or new.status is distinct from old.status
      or new.supervisor_zone_ids is distinct from old.supervisor_zone_ids)
     and coalesce(actor_role, 'client') not in ('admin','super_admin')
  then
    raise exception 'Seul un admin peut modifier role, company_id, status ou supervisor_zone_ids';
  end if;

  return new;
end $$;

create trigger profiles_prevent_escalation
  before update on profiles
  for each row execute function prevent_role_escalation();

-- -----------------------------------------------------------------------------
-- Calcul auto du centroid d'une zone à partir de sa géométrie
-- -----------------------------------------------------------------------------
create or replace function set_zone_centroid() returns trigger language plpgsql as $$
begin
  if new.geometry is not null then
    new.centroid = st_centroid(new.geometry::geometry)::geography;
  end if;
  return new;
end $$;

create trigger zones_set_centroid
  before insert or update of geometry on zones
  for each row execute function set_zone_centroid();

-- -----------------------------------------------------------------------------
-- À l'insertion d'une nouvelle version tarifaire :
--   1. Clore automatiquement la version précédente
--   2. Journaliser (action sensible)
-- -----------------------------------------------------------------------------
create or replace function on_price_version_insert() returns trigger
  language plpgsql security definer as $$
declare
  v_volume int;
begin
  -- Clore la version courante précédente
  update price_versions
     set valid_to = new.valid_from
   where tier_id = new.tier_id
     and id <> new.id
     and valid_to is null
     and valid_from < new.valid_from;

  select volume_liters into v_volume from price_tiers where id = new.tier_id;

  -- Log action sensible
  insert into logs (user_id, role, action, module, description, target_id, is_sensitive, metadata)
  select
    new.created_by,
    (select role from profiles where id = new.created_by),
    'price.update',
    'prices',
    format('Nouveau tarif %s L à %s FCFA', v_volume, new.price_fcfa),
    new.id,
    true,
    jsonb_build_object(
      'tier_id', new.tier_id,
      'volume_liters', v_volume,
      'price_fcfa', new.price_fcfa,
      'valid_from', new.valid_from,
      'reason', new.reason,
      'reference_doc', new.reference_doc
    );
  return new;
end $$;

create trigger price_versions_after_insert
  after insert on price_versions
  for each row execute function on_price_version_insert();

-- -----------------------------------------------------------------------------
-- Génération de la référence commande (EPL-YYYY-NNNNNN)
-- -----------------------------------------------------------------------------
create sequence if not exists orders_reference_seq;

create or replace function generate_order_reference() returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := format(
      'EPL-%s-%s',
      to_char(now(), 'YYYY'),
      lpad(nextval('orders_reference_seq')::text, 6, '0')
    );
  end if;
  return new;
end $$;

create trigger orders_generate_reference
  before insert on orders
  for each row execute function generate_order_reference();

-- -----------------------------------------------------------------------------
-- Snapshot immutable du prix + total à la création commande
-- -----------------------------------------------------------------------------
create or replace function snapshot_order_price() returns trigger
  language plpgsql security definer as $$
declare
  v_version_id uuid;
  v_price      int;
begin
  -- Si fourni explicitement (import, seed), on ne recalcule pas
  if new.price_version_id is not null and new.unit_price_fcfa > 0 then
    new.total_amount_fcfa := new.unit_price_fcfa * new.quantity;
    return new;
  end if;

  select pv.id, pv.price_fcfa
    into v_version_id, v_price
    from price_versions pv
    join price_tiers pt on pt.id = pv.tier_id
   where pt.volume_liters = new.volume_liters
     and pt.active
     and pv.valid_from <= now()
     and (pv.valid_to is null or pv.valid_to > now())
   order by pv.valid_from desc
   limit 1;

  if v_version_id is null then
    raise exception 'Aucun tarif actif pour le palier % L', new.volume_liters;
  end if;

  new.price_version_id  := v_version_id;
  new.unit_price_fcfa   := v_price;
  new.total_amount_fcfa := v_price * new.quantity;
  return new;
end $$;

create trigger orders_snapshot_price
  before insert on orders
  for each row execute function snapshot_order_price();

-- -----------------------------------------------------------------------------
-- Snapshot immutable des infos client à la création commande
-- -----------------------------------------------------------------------------
create or replace function snapshot_order_client() returns trigger
  language plpgsql security definer as $$
begin
  if new.client_id is not null
     and (new.client_snapshot is null or new.client_snapshot = '{}'::jsonb)
  then
    select jsonb_build_object(
      'first_name', p.first_name,
      'last_name',  p.last_name,
      'phone',      p.phone,
      'email',      p.email
    ) into new.client_snapshot
    from profiles p
    where p.id = new.client_id;
  end if;
  return new;
end $$;

create trigger orders_snapshot_client
  before insert on orders
  for each row execute function snapshot_order_client();

-- -----------------------------------------------------------------------------
-- Helper: détection auto de la zone à partir d'un point GPS
-- Retourne l'ID du plus petit polygone contenant le point.
-- -----------------------------------------------------------------------------
create or replace function detect_zone_from_point(point geography)
  returns uuid language sql stable as $$
  select id from zones
  where geometry is not null
    and status = 'active'
    and st_contains(geometry::geometry, point::geometry)
  order by st_area(geometry) asc
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- Purge quotidienne de l'historique GPS (> 30 jours)
-- -----------------------------------------------------------------------------
create or replace function purge_old_position_history() returns void language sql as $$
  delete from driver_position_history where recorded_at < now() - interval '30 days';
$$;

-- Planification pg_cron (03:00 UTC quotidien)
-- NB: nécessite l'activation de pg_cron côté Supabase. Idempotent grâce au unschedule.
do $$
begin
  perform cron.unschedule('purge-position-history')
  where exists (select 1 from cron.job where jobname = 'purge-position-history');
exception when others then null;
end $$;

select cron.schedule(
  'purge-position-history',
  '0 3 * * *',
  $$select purge_old_position_history()$$
);
