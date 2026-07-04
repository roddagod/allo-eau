-- =============================================================================
-- Plateforme Eau Libreville — Row Level Security
-- Politique par rôle. Toutes les tables métier ont la RLS activée.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers (security definer — s'exécutent avec les droits du propriétaire)
-- -----------------------------------------------------------------------------
create or replace function auth_role() returns user_role
  language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_company_id() returns uuid
  language sql stable security definer as $$
  select company_id from profiles where id = auth.uid();
$$;

create or replace function auth_supervisor_zones() returns uuid[]
  language sql stable security definer as $$
  select supervisor_zone_ids from profiles where id = auth.uid();
$$;

create or replace function is_admin() returns boolean
  language sql stable security definer as $$
  select coalesce(
    (select role in ('admin','super_admin') from profiles where id = auth.uid()),
    false
  );
$$;

create or replace function is_super_admin() returns boolean
  language sql stable security definer as $$
  select coalesce(
    (select role = 'super_admin' from profiles where id = auth.uid()),
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- Activation RLS
-- -----------------------------------------------------------------------------
alter table zones                      enable row level security;
alter table companies                  enable row level security;
alter table company_zones              enable row level security;
alter table profiles                   enable row level security;
alter table drivers                    enable row level security;
alter table driver_position_history    enable row level security;
alter table price_tiers                enable row level security;
alter table price_versions             enable row level security;
alter table orders                     enable row level security;
alter table routes                     enable row level security;
alter table payments                   enable row level security;
alter table notifications              enable row level security;
alter table logs                       enable row level security;

-- =============================================================================
-- ZONES : lecture publique des actives, admin gère
-- =============================================================================
create policy zones_public_read on zones for select
  using (status = 'active' or is_admin());

create policy zones_admin_write on zones for all
  using (is_admin()) with check (is_admin());

-- =============================================================================
-- COMPANIES : lecture large sur actives, super admin gère, owner édite la sienne
-- =============================================================================
create policy companies_read on companies for select
  using (status = 'active' or is_admin() or auth_company_id() = id);

create policy companies_super_admin_write on companies for all
  using (is_super_admin()) with check (is_super_admin());

create policy companies_owner_update on companies for update
  using (auth_role() = 'company_owner' and auth_company_id() = id)
  with check (auth_role() = 'company_owner' and auth_company_id() = id);

-- =============================================================================
-- COMPANY_ZONES : lecture publique, admin/owner écrivent
-- =============================================================================
create policy company_zones_public_read on company_zones for select using (true);

create policy company_zones_admin_write on company_zones for all
  using (is_admin()) with check (is_admin());

create policy company_zones_owner_write on company_zones for all
  using (auth_role() = 'company_owner' and auth_company_id() = company_id)
  with check (auth_role() = 'company_owner' and auth_company_id() = company_id);

-- =============================================================================
-- PROFILES : self, admin, société pour ses membres
-- Le trigger prevent_role_escalation() empêche l'auto-élévation.
-- =============================================================================
create policy profiles_read_self on profiles for select using (id = auth.uid());

create policy profiles_read_admin on profiles for select using (is_admin());

create policy profiles_read_company_members on profiles for select using (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() is not null
  and auth_company_id() = company_id
);

create policy profiles_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on profiles for all
  using (is_admin()) with check (is_admin());

-- =============================================================================
-- DRIVERS
-- =============================================================================
create policy drivers_read_self on drivers for select using (id = auth.uid());

create policy drivers_read_company on drivers for select using (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
);

create policy drivers_read_supervisor on drivers for select using (
  auth_role() = 'supervisor'
  and primary_zone_id = any (auth_supervisor_zones())
);

create policy drivers_read_admin on drivers for select using (is_admin());

-- Livreur peut mettre à jour son propre statut / position
create policy drivers_update_self on drivers for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Société gère ses livreurs
create policy drivers_write_company on drivers for all
  using (auth_role() = 'company_owner' and auth_company_id() = company_id)
  with check (auth_role() = 'company_owner' and auth_company_id() = company_id);

create policy drivers_admin_all on drivers for all
  using (is_admin()) with check (is_admin());

-- =============================================================================
-- DRIVER_POSITION_HISTORY
-- Livreur écrit sa position, admin lit, société lit ses livreurs
-- =============================================================================
create policy dph_insert_self on driver_position_history for insert
  with check (driver_id = auth.uid());

create policy dph_read_self on driver_position_history for select
  using (driver_id = auth.uid());

create policy dph_read_company on driver_position_history for select using (
  auth_role() in ('company_owner','company_operator')
  and driver_id in (select id from drivers where company_id = auth_company_id())
);

create policy dph_read_admin on driver_position_history for select using (is_admin());

-- =============================================================================
-- PRICE_TIERS : lecture publique, super admin gère
-- =============================================================================
create policy price_tiers_public_read on price_tiers for select
  using (active or is_admin());

create policy price_tiers_super_admin_write on price_tiers for all
  using (is_super_admin()) with check (is_super_admin());

-- =============================================================================
-- PRICE_VERSIONS : lecture publique des versions courantes, historique = admin
-- Insertion réservée super admin. Pas d'update/delete (immutable).
-- =============================================================================
create policy price_versions_public_current on price_versions for select using (
  valid_from <= now() and (valid_to is null or valid_to > now())
);

create policy price_versions_admin_read_all on price_versions for select
  using (is_admin());

create policy price_versions_super_admin_insert on price_versions for insert
  with check (is_super_admin());

-- =============================================================================
-- ORDERS : parcours de rôles
-- =============================================================================
create policy orders_read_client on orders for select
  using (client_id = auth.uid());

create policy orders_read_company on orders for select using (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
);

create policy orders_read_driver on orders for select using (
  auth_role() = 'driver' and driver_id = auth.uid()
);

create policy orders_read_supervisor on orders for select using (
  auth_role() = 'supervisor'
  and zone_id = any (auth_supervisor_zones())
);

create policy orders_read_admin on orders for select using (is_admin());

-- Création: client pour lui-même, call-center au nom d'un client
create policy orders_insert_client on orders for insert
  with check (auth_role() = 'client' and client_id = auth.uid());

create policy orders_insert_call_center on orders for insert
  with check (auth_role() = 'call_center' and created_by_user_id = auth.uid());

create policy orders_insert_admin on orders for insert
  with check (is_admin());

-- Update : société pour ses commandes, livreur pour ses assignations, admin, client (cancel)
create policy orders_update_company on orders for update using (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
) with check (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
);

create policy orders_update_driver on orders for update using (
  auth_role() = 'driver' and driver_id = auth.uid()
) with check (
  auth_role() = 'driver' and driver_id = auth.uid()
);

create policy orders_update_admin on orders for update using (is_admin()) with check (is_admin());

-- Client peut annuler tant que non-affectée
create policy orders_cancel_client on orders for update using (
  client_id = auth.uid() and order_status in ('pending','accepted')
) with check (
  client_id = auth.uid()
);

-- =============================================================================
-- ROUTES
-- =============================================================================
create policy routes_read_driver on routes for select using (
  auth_role() = 'driver' and driver_id = auth.uid()
);

create policy routes_read_company on routes for select using (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
);

create policy routes_read_admin on routes for select using (is_admin());

create policy routes_write_company on routes for all using (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
) with check (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
);

create policy routes_write_admin on routes for all
  using (is_admin()) with check (is_admin());

-- =============================================================================
-- PAYMENTS
-- =============================================================================
create policy payments_read_client on payments for select using (
  order_id in (select id from orders where client_id = auth.uid())
);

create policy payments_read_company on payments for select using (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
);

create policy payments_read_admin on payments for select using (is_admin());

create policy payments_write_company on payments for all using (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
) with check (
  auth_role() in ('company_owner','company_operator')
  and auth_company_id() = company_id
);

create policy payments_write_admin on payments for all
  using (is_admin()) with check (is_admin());

-- =============================================================================
-- NOTIFICATIONS : chacun voit et marque les siennes ; admin peut tout
-- =============================================================================
create policy notifications_read_self on notifications for select
  using (user_id = auth.uid());

create policy notifications_update_self on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_admin_all on notifications for all
  using (is_admin()) with check (is_admin());

-- =============================================================================
-- LOGS : super admin voit tout, admin voit non sensibles, user voit ses actions
-- Insertion réservée au service_role (via triggers security definer). Aucun update.
-- =============================================================================
create policy logs_read_super_admin on logs for select using (is_super_admin());

create policy logs_read_admin_non_sensitive on logs for select using (
  auth_role() = 'admin' and not is_sensitive
);

create policy logs_read_own on logs for select using (
  user_id = auth.uid() and not is_sensitive
);
