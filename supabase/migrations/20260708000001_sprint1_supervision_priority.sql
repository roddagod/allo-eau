-- =====================================================================
-- Sprint 1 — Adaptation retour ministère
--
--   1. Statut « livreur supervisé »
--      Certains livreurs (étrangers, non lettrés, sans smartphone) ne peuvent
--      pas utiliser la PWA. Un « gestionnaire de territoire » met à jour les
--      statuts à leur place.
--
--   2. Rôle applicatif « gestionnaire de territoire »
--      On réutilise le rôle `supervisor` déjà présent dans user_role, en lui
--      donnant les droits d'écriture sur les commandes de ses livreurs
--      supervisés.
--
--   3. Priorité de commande
--      Certaines commandes doivent passer devant : hôpitaux, écoles,
--      populations vulnérables, incidents en cours.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Colonne drivers.supervision_mode
-- ---------------------------------------------------------------------

do $$ begin
  create type supervision_mode as enum ('autonomous', 'supervised');
exception when duplicate_object then null;
end $$;

alter table drivers
  add column if not exists supervision_mode supervision_mode not null default 'autonomous';

alter table drivers
  add column if not exists territory_manager_id uuid
  references profiles(id) on delete set null;

create index if not exists drivers_manager_idx on drivers(territory_manager_id)
  where territory_manager_id is not null;

comment on column drivers.supervision_mode is
  'autonomous : utilise la PWA lui-même. supervised : un gestionnaire de territoire met à jour ses statuts pour lui.';
comment on column drivers.territory_manager_id is
  'Profil du gestionnaire de territoire responsable de ce livreur (si supervised).';

-- ---------------------------------------------------------------------
-- 2) Priorité de commande
-- ---------------------------------------------------------------------

do $$ begin
  create type order_priority as enum ('normal', 'high', 'critical');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type priority_reason as enum (
    'hospital',      -- établissement de santé
    'school',        -- établissement scolaire
    'vulnerable',    -- population vulnérable (personnes âgées, handicapées)
    'incident',      -- suite à un incident opérationnel
    'ministerial',   -- demande ministérielle
    'other'
  );
exception when duplicate_object then null;
end $$;

alter table orders
  add column if not exists priority order_priority not null default 'normal';

alter table orders
  add column if not exists priority_reason priority_reason;

create index if not exists orders_priority_idx on orders(priority)
  where priority in ('high', 'critical');

comment on column orders.priority is
  'Priorité de traitement. Les critical passent devant tout, les high avant les normales.';
comment on column orders.priority_reason is
  'Justification requise pour toute commande priority != normal.';

-- ---------------------------------------------------------------------
-- 3) RLS — le gestionnaire de territoire voit et met à jour les
--    commandes de SES livreurs supervisés
-- ---------------------------------------------------------------------

-- Fonction utilitaire : liste des livreurs qu'un gestionnaire supervise
create or replace function drivers_supervised_by(p_manager uuid)
returns setof uuid
language sql
stable
security definer
as $$
  select id from drivers
   where territory_manager_id = p_manager
     and supervision_mode = 'supervised'
$$;

-- Policy SELECT — un supervisor voit les commandes de ses livreurs supervisés
drop policy if exists orders_read_territory_manager on orders;
create policy orders_read_territory_manager on orders
  for select
  using (
    auth_role() = 'supervisor'
    and driver_id in (select drivers_supervised_by(auth.uid()))
  );

-- Policy UPDATE — un supervisor peut mettre à jour ces mêmes commandes
--   (mise à jour de statut, pas de company/driver_id)
drop policy if exists orders_update_territory_manager on orders;
create policy orders_update_territory_manager on orders
  for update
  using (
    auth_role() = 'supervisor'
    and driver_id in (select drivers_supervised_by(auth.uid()))
  )
  with check (
    auth_role() = 'supervisor'
    and driver_id in (select drivers_supervised_by(auth.uid()))
  );

-- ---------------------------------------------------------------------
-- 4) Trigger : si le driver est supervised, on empêche l'écriture directe
--    du statut par le driver lui-même (protection croisée avec RLS)
-- ---------------------------------------------------------------------

create or replace function prevent_supervised_driver_status_write()
returns trigger
language plpgsql
security definer
as $$
declare
  v_mode supervision_mode;
begin
  -- On ne bloque que sur UPDATE (les INSERT viennent de sources tierces)
  if tg_op != 'UPDATE' then
    return new;
  end if;

  -- Statut inchangé ? OK
  if new.order_status is not distinct from old.order_status then
    return new;
  end if;

  -- Si l'acteur est un driver et que ce driver est supervised → refus
  if auth_role() = 'driver'
     and auth.uid() = new.driver_id
  then
    select supervision_mode into v_mode
      from drivers where id = new.driver_id;
    if v_mode = 'supervised' then
      raise exception 'Ce livreur est en mode supervisé : ses statuts doivent être mis à jour par son gestionnaire de territoire.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists orders_before_update_prevent_supervised_write on orders;
create trigger orders_before_update_prevent_supervised_write
  before update on orders
  for each row execute function prevent_supervised_driver_status_write();

-- ---------------------------------------------------------------------
-- 5) Adaptation dispatch — les critical passent devant
-- ---------------------------------------------------------------------

-- Les commandes prioritaires sont poussées en tête de la file du Centre d'Op.
-- On expose une vue triée pour l'UI Centre d'Op.
create or replace view orders_prioritized as
  select o.*,
         case o.priority
           when 'critical' then 0
           when 'high'     then 1
           else 2
         end as priority_rank
    from orders o
   where o.order_status not in ('delivered', 'cancelled');

commit;
