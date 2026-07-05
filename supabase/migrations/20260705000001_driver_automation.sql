-- =============================================================================
-- Allô Eau — Automatisation driver (prise en charge fluide)
-- =============================================================================

-- 1) Trigger : quand une commande est ACCEPTÉE et affectée à un livreur,
--    le livreur passe automatiquement à 'on_delivery' et la commande à
--    'driver_assigned' (skip du "slot_confirmed" pour la démo fluide).
create or replace function on_order_accepted_auto_assign_driver()
  returns trigger
  language plpgsql
  security definer
as $$
declare
  v_default_driver uuid;
begin
  -- Ne s'active qu'à la transition vers 'accepted'
  if new.order_status = 'accepted' and old.order_status is distinct from 'accepted' then
    -- Si la commande a déjà un driver_id, on n'écrase pas
    if new.driver_id is null and new.company_id is not null then
      -- Round-robin simplifié : le driver de la société ayant la charge la plus faible,
      -- disponible ou déjà en livraison.
      select d.id
        into v_default_driver
        from drivers d
       where d.company_id = new.company_id
         and d.status in ('available', 'on_delivery')
       order by (
         select count(*) from orders o
          where o.driver_id = d.id
            and o.order_status in ('driver_assigned', 'driver_en_route', 'arrived_nearby')
       ) asc,
       d.created_at asc
       limit 1;

      if v_default_driver is not null then
        new.driver_id := v_default_driver;
        new.order_status := 'driver_assigned';

        -- Passe le driver en on_delivery
        update drivers set status = 'on_delivery' where id = v_default_driver;

        -- Log
        insert into logs (user_id, role, action, module, description, order_id, company_id, metadata)
        values (
          null, 'admin',
          'order.auto_assign_driver',
          'orders',
          format('Auto-affectation à AE-%s', (select reference from drivers where id = v_default_driver)),
          new.id,
          new.company_id,
          jsonb_build_object('driver_id', v_default_driver)
        );
      end if;
    end if;
  end if;
  return new;
end $$;

create trigger orders_before_update_auto_assign
  before update of order_status on orders
  for each row execute function on_order_accepted_auto_assign_driver();

-- 2) Fonction : détection auto "arrived_nearby" quand le livreur est à
--    moins de 100 m du delivery_point. Utilisée par un cron pg_cron toutes
--    les minutes qui checke les commandes 'driver_en_route'.
create or replace function auto_arrived_nearby() returns void
  language plpgsql
  security definer
as $$
begin
  update orders o
     set order_status = 'arrived_nearby'
    from drivers d
   where o.order_status = 'driver_en_route'
     and o.driver_id = d.id
     and o.delivery_point is not null
     and d.current_location is not null
     and d.location_updated_at > now() - interval '3 minutes'
     and st_distance(o.delivery_point, d.current_location) < 100;
end $$;

-- 3) Cron chaque minute pour l'auto-arrived
do $$
begin
  perform cron.unschedule('auto-arrived-nearby')
  where exists (select 1 from cron.job where jobname = 'auto-arrived-nearby');
exception when others then null;
end $$;

select cron.schedule(
  'auto-arrived-nearby',
  '* * * * *',
  $$select auto_arrived_nearby()$$
);
