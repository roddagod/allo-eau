-- =============================================================================
-- Plateforme Eau Libreville — Tables fondamentales
-- Zones, sociétés, profils utilisateurs, livreurs, tarification versionnée
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ZONES (quartiers du Grand Libreville)
-- Sources : OSM Gabon + tracé manuel côté admin
-- -----------------------------------------------------------------------------
create table zones (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  sector         text,                                        -- Nord/Centre/Est/Sud
  geometry       geography(MultiPolygon, 4326),               -- polygone quartier
  centroid       geography(Point, 4326),                      -- auto-calculé
  status         zone_status not null default 'draft',
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index zones_geometry_gix on zones using gist (geometry);
create index zones_centroid_gix on zones using gist (centroid);
create index zones_status_idx on zones (status);

comment on table zones is 'Quartiers du Grand Libreville. Geometry NULL = quartier à tracer.';

-- -----------------------------------------------------------------------------
-- SOCIÉTÉS (opérateurs privés + militaires + municipaux)
-- -----------------------------------------------------------------------------
create table companies (
  id                                uuid primary key default gen_random_uuid(),
  commercial_name                   text not null,
  legal_name                        text,
  rccm                              text,                        -- ou identifiant admin
  operator_type                     company_operator_type not null default 'private',
  address                           text,
  manager_name                      text,
  phone                             text,
  email                             text,
  logo_url                          text,
  opening_hours                     jsonb not null default '{}'::jsonb,
  average_delay_minutes             int,
  status                            company_status not null default 'pending_validation',
  documents                         jsonb not null default '[]'::jsonb,  -- refs Supabase Storage
  dispatch_mode                     dispatch_mode not null default 'manual',
  max_concurrent_orders_per_driver  int not null default 3,
  success_rate                      numeric(5,2),
  orders_count                      int not null default 0,
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);
create index companies_status_idx on companies (status);
create index companies_operator_type_idx on companies (operator_type);

comment on column companies.operator_type is 'private = société privée, military = Génie/Sapeurs/Garde républicaine, municipal = collectivité';

-- -----------------------------------------------------------------------------
-- COMPANY_ZONES (M2M — zones couvertes par une société)
-- -----------------------------------------------------------------------------
create table company_zones (
  company_id  uuid not null references companies(id) on delete cascade,
  zone_id     uuid not null references zones(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (company_id, zone_id)
);
create index company_zones_zone_idx on company_zones (zone_id);

-- -----------------------------------------------------------------------------
-- PROFILES (extension de auth.users, tous rôles confondus)
-- -----------------------------------------------------------------------------
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  user_role not null default 'client',
  first_name            text,
  last_name             text,
  phone                 text,
  email                 text,
  status                text not null default 'active',        -- active|suspended|deactivated
  -- Champs client
  primary_zone_id       uuid references zones(id),
  detailed_address      text,
  delivery_landmark     text,
  driver_instructions   text,
  -- Champs rôle société/livreur
  company_id            uuid references companies(id),
  -- Champs superviseur
  supervisor_zone_ids   uuid[] not null default '{}',
  -- Timestamps
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  last_login_at         timestamptz
);
create index profiles_role_idx on profiles (role);
create index profiles_company_idx on profiles (company_id);
create index profiles_primary_zone_idx on profiles (primary_zone_id);

-- -----------------------------------------------------------------------------
-- DRIVERS (spécialisation de profile avec état géo)
-- -----------------------------------------------------------------------------
create table drivers (
  id                        uuid primary key references profiles(id) on delete cascade,
  company_id                uuid not null references companies(id),
  current_location          geography(Point, 4326),
  location_source           location_source,
  location_updated_at       timestamptz,
  primary_zone_id           uuid references zones(id),
  status                    driver_status not null default 'off_duty',
  max_concurrent_orders     int not null default 3,
  current_route_id          uuid,                            -- FK ajoutée après création de routes
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index drivers_company_idx on drivers (company_id);
create index drivers_location_gix on drivers using gist (current_location);
create index drivers_status_idx on drivers (status);

-- -----------------------------------------------------------------------------
-- DRIVER_POSITION_HISTORY (auto-purgée après 30 jours)
-- -----------------------------------------------------------------------------
create table driver_position_history (
  id             bigserial primary key,
  driver_id      uuid not null references drivers(id) on delete cascade,
  location       geography(Point, 4326) not null,
  accuracy_m     int,
  recorded_at    timestamptz not null default now()
);
create index dph_driver_time_idx on driver_position_history (driver_id, recorded_at desc);
create index dph_recorded_at_idx on driver_position_history (recorded_at);

-- -----------------------------------------------------------------------------
-- PRICE_TIERS (paliers de volume) — stables dans le temps
-- -----------------------------------------------------------------------------
create table price_tiers (
  id             uuid primary key default gen_random_uuid(),
  volume_liters  int not null unique,
  label          text not null,
  display_order  int not null,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- PRICE_VERSIONS (SCD Type 2 — historique tarifaire effectif)
-- Impossible d'avoir 2 versions actives pour un même palier au même instant.
-- -----------------------------------------------------------------------------
create table price_versions (
  id             uuid primary key default gen_random_uuid(),
  tier_id        uuid not null references price_tiers(id),
  price_fcfa     int  not null check (price_fcfa >= 0),
  valid_from     timestamptz not null,
  valid_to       timestamptz,
  reason         text not null,                             -- décret, note ministérielle…
  reference_doc  text,                                      -- URL/référence
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  constraint price_versions_no_overlap exclude using gist (
    tier_id with =,
    tstzrange(valid_from, valid_to, '[)') with &&
  )
);
create index price_versions_tier_valid_idx on price_versions (tier_id, valid_from desc);

comment on table price_versions is 'Historique tarifaire versionné. Une commande référence toujours la version en vigueur à sa création (snapshot).';
