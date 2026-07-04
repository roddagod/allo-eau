-- =============================================================================
-- Plateforme Eau Libreville — Auto-dispatch de la société par zone
--
-- Flux :
--   1. Client soumet une commande sans société.
--   2. Trigger AFTER INSERT : propose automatiquement la meilleure société.
--   3. La société valide (accept) ou refuse.
--   4. Si refus : la société est ajoutée à la liste d'exclusion et la commande
--      est re-dispatchée automatiquement à la suivante.
--   5. Le back-office peut override manuellement à tout moment.
-- =============================================================================

-- Le client soumet sans société : elle est attribuée par le trigger de dispatch.
alter table orders alter column company_id drop not null;
alter table orders add column auto_dispatched_at    timestamptz;
alter table orders add column refused_company_ids   uuid[] not null default '{}';

-- File "à attribuer manuellement" du back-office
create index orders_awaiting_dispatch_idx on orders (created_at)
  where company_id is null and order_status = 'pending';

-- Nombre de tentatives (garde-fou anti-boucle infinie de refus)
alter table orders add column dispatch_attempts int not null default 0;

-- -----------------------------------------------------------------------------
-- Score : préférer les sociétés actives avec le meilleur délai moyen,
-- puis le meilleur taux de réussite, puis les plus expérimentées.
-- Exclusion : sociétés déjà refusées pour cette commande.
-- -----------------------------------------------------------------------------
create or replace function find_best_company_for_zone(
  p_zone_id uuid,
  p_exclude uuid[] default '{}'
)
  returns uuid
  language sql
  stable
  security definer
as $$
  select c.id
  from companies c
  join company_zones cz on cz.company_id = c.id
  where cz.zone_id = p_zone_id
    and c.status = 'active'
    and c.dispatch_mode in ('auto', 'manual')  -- 'manual' reste éligible : la société valide manuellement
    and not (c.id = any(p_exclude))
  order by
    coalesce(c.average_delay_minutes, 2147483647) asc,
    coalesce(c.success_rate, 0) desc,
    c.orders_count desc,
    c.created_at asc
  limit 1;
$$;

comment on function find_best_company_for_zone(uuid, uuid[]) is
  'Retourne l''ID de la meilleure société éligible pour la zone, hors sociétés exclues, ou NULL.';

-- -----------------------------------------------------------------------------
-- dispatch_order — attribue une société.
-- Modes :
--   * p_forced_company_id NULL, order.company_id NULL → auto (via score)
--   * p_forced_company_id NULL, order.company_id set  → no-op (idempotent)
--   * p_forced_company_id set                          → manuel/override (back-office)
-- Journalise l'action.
-- -----------------------------------------------------------------------------
create or replace function dispatch_order(
  p_order_id uuid,
  p_forced_company_id uuid default null,
  p_actor uuid default null
)
  returns uuid
  language plpgsql
  security definer
as $$
declare
  v_zone_id           uuid;
  v_current_company   uuid;
  v_refused           uuid[];
  v_assigned          uuid;
  v_mode              dispatch_mode;
begin
  select zone_id, company_id, refused_company_ids
    into v_zone_id, v_current_company, v_refused
    from orders
   where id = p_order_id;

  if v_zone_id is null then
    return null;
  end if;

  if p_forced_company_id is not null then
    -- Override manuel (back-office)
    v_assigned := p_forced_company_id;
    v_mode := case when v_current_company is null then 'manual' else 'override' end;
  else
    -- Idempotence : ne retouche pas ce qui est déjà attribué
    if v_current_company is not null then
      return v_current_company;
    end if;
    v_assigned := find_best_company_for_zone(v_zone_id, v_refused);
    v_mode := 'auto';
  end if;

  if v_assigned is null then
    -- Aucune société éligible : la commande reste awaiting_dispatch
    return null;
  end if;

  update orders
     set company_id         = v_assigned,
         auto_dispatched_at = case when v_mode = 'auto' then now() else auto_dispatched_at end,
         dispatched_by      = v_mode,
         dispatch_attempts  = dispatch_attempts + 1
   where id = p_order_id;

  insert into logs (user_id, role, action, module, description, order_id, company_id, metadata)
  values (
    p_actor,
    (select role from profiles where id = p_actor),
    case when v_mode = 'auto' then 'order.dispatch.auto' else 'order.dispatch.manual' end,
    'orders',
    format('Commande attribuée (%s) à %s', v_mode, v_assigned),
    p_order_id,
    v_assigned,
    jsonb_build_object(
      'mode', v_mode,
      'previous_company_id', v_current_company,
      'excluded_count', coalesce(array_length(v_refused, 1), 0)
    )
  );

  return v_assigned;
end $$;

comment on function dispatch_order(uuid, uuid, uuid) is
  'Attribue une société à une commande (auto par score, ou manuellement par le back-office).';

-- -----------------------------------------------------------------------------
-- Trigger AFTER INSERT : première attribution automatique
-- -----------------------------------------------------------------------------
create or replace function on_order_insert_dispatch() returns trigger
  language plpgsql
  security definer
as $$
begin
  if new.company_id is null then
    perform dispatch_order(new.id, null, new.created_by_user_id);
  end if;
  return null;
end $$;

create trigger orders_after_insert_dispatch
  after insert on orders
  for each row execute function on_order_insert_dispatch();

-- -----------------------------------------------------------------------------
-- Trigger AFTER UPDATE : cascade sur refus
-- Quand la société transitionne à 'refused' → ajoute à la liste d'exclusion,
-- efface company_id, remet 'pending' et retente un dispatch.
-- Garde-fou : max 10 tentatives.
-- -----------------------------------------------------------------------------
create or replace function on_order_refused_redispatch() returns trigger
  language plpgsql
  security definer
as $$
declare
  v_refused_company uuid;
begin
  if new.order_status = 'refused'
     and old.order_status is distinct from 'refused'
     and new.company_id is not null
     and new.dispatch_attempts < 10
  then
    v_refused_company := new.company_id;

    update orders
       set refused_company_ids = array_append(refused_company_ids, v_refused_company),
           company_id          = null,
           order_status        = 'pending'
     where id = new.id;

    -- Retente : soit trouve une autre société, soit laisse en awaiting_dispatch
    perform dispatch_order(new.id, null, null);
  end if;

  return null;
end $$;

create trigger orders_after_refuse_redispatch
  after update of order_status on orders
  for each row execute function on_order_refused_redispatch();

-- -----------------------------------------------------------------------------
-- Garde-fou : le client ne peut pas cibler une société à la création
-- ni la modifier après. Seul le back-office peut override.
-- -----------------------------------------------------------------------------
create or replace function prevent_client_company_override() returns trigger
  language plpgsql
  security definer
as $$
declare
  v_actor_role user_role;
begin
  select role into v_actor_role from profiles where id = auth.uid();

  if tg_op = 'INSERT'
     and v_actor_role = 'client'
     and new.company_id is not null
  then
    -- Silencieusement ignoré : le trigger de dispatch fera son travail.
    new.company_id := null;
  end if;

  if tg_op = 'UPDATE'
     and v_actor_role = 'client'
     and new.company_id is distinct from old.company_id
  then
    raise exception 'Un client ne peut pas modifier la société attribuée';
  end if;

  return new;
end $$;

create trigger orders_prevent_client_company_override
  before insert or update of company_id on orders
  for each row execute function prevent_client_company_override();
