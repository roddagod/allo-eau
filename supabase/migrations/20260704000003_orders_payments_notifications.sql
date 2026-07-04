-- =============================================================================
-- Plateforme Eau Libreville — Opérations, paiements, notifications, logs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ROUTES (tournées livreur)
-- -----------------------------------------------------------------------------
create table routes (
  id                  uuid primary key default gen_random_uuid(),
  driver_id           uuid not null references drivers(id),
  company_id          uuid not null references companies(id),
  status              route_status not null default 'planned',
  planned_at          timestamptz not null default now(),
  started_at          timestamptz,
  completed_at        timestamptz,
  total_distance_m    int,
  total_duration_s    int,
  optimized_by        text check (optimized_by in ('nearest_neighbor','2opt','manual','ors','auto')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index routes_driver_idx on routes (driver_id);
create index routes_company_status_idx on routes (company_id, status);

-- FK circulaire drivers -> routes maintenant que routes existe
alter table drivers
  add constraint drivers_current_route_fk
  foreign key (current_route_id) references routes(id) on delete set null;

-- -----------------------------------------------------------------------------
-- ORDERS (commandes)
-- Prix + client snapshot immutables à la création.
-- -----------------------------------------------------------------------------
create table orders (
  id                       uuid primary key default gen_random_uuid(),
  reference                text unique,                             -- EPL-YYYY-NNNNNN (auto)
  client_id                uuid references profiles(id) on delete set null,
  client_snapshot          jsonb not null default '{}'::jsonb,      -- auto-rempli
  created_by_user_id       uuid references auth.users(id),          -- call-center possible
  company_id               uuid not null references companies(id),
  driver_id                uuid references drivers(id),
  zone_id                  uuid not null references zones(id),
  address                  text not null,
  delivery_landmark        text,
  delivery_point           geography(Point, 4326),
  volume_liters            int not null,
  quantity                 int not null check (quantity > 0),
  -- Snapshot prix (auto par trigger)
  price_version_id         uuid references price_versions(id),
  unit_price_fcfa          int not null default 0,
  total_amount_fcfa        int not null default 0,
  -- Paiement
  payment_method           payment_method not null,
  payment_status           payment_status not null default 'pending',
  -- Cycle
  order_status             order_status not null default 'pending',
  preferred_delivery_date  date,
  preferred_delivery_time  time,
  delivery_slot            tstzrange,
  -- Dispatch / tournée
  dispatched_by            dispatch_mode,
  route_id                 uuid references routes(id),
  route_sequence           int,
  estimated_arrival_at     timestamptz,
  actual_delivered_at      timestamptz,
  -- Contexte
  client_instructions      text,
  refusal_reason           text,
  incident_type            text,
  incident_details         text,
  -- Timestamps
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index orders_client_idx on orders (client_id, created_at desc);
create index orders_company_status_idx on orders (company_id, order_status);
create index orders_driver_idx on orders (driver_id) where driver_id is not null;
create index orders_zone_idx on orders (zone_id);
create index orders_route_idx on orders (route_id, route_sequence);
create index orders_status_created_idx on orders (order_status, created_at desc);
create index orders_delivery_point_gix on orders using gist (delivery_point);

comment on column orders.client_snapshot is 'Copie figée des infos client à la création — préserve intégrité si compte supprimé.';
comment on column orders.price_version_id is 'Version tarifaire appliquée. Traçabilité intégrale du prix payé.';

-- -----------------------------------------------------------------------------
-- PAYMENTS
-- -----------------------------------------------------------------------------
create table payments (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references orders(id),
  company_id             uuid not null references companies(id),
  amount_fcfa            int not null check (amount_fcfa >= 0),
  method                 payment_method not null,
  status                 payment_status not null default 'pending',
  transaction_reference  text,
  provider_response      jsonb,
  confirmed_at           timestamptz,
  refunded_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index payments_order_idx on payments (order_id);
create index payments_company_status_idx on payments (company_id, status);
create index payments_method_status_idx on payments (method, status);

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS
-- -----------------------------------------------------------------------------
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  order_id     uuid references orders(id) on delete set null,
  title        text not null,
  message      text not null,
  type         notification_type not null,
  read         boolean not null default false,
  read_at      timestamptz,
  action_url   text,
  created_at   timestamptz not null default now()
);
create index notifications_user_read_idx on notifications (user_id, read, created_at desc);
create index notifications_order_idx on notifications (order_id);

-- -----------------------------------------------------------------------------
-- LOGS (audit trail — cdc §7.1 supervisor + §9 super admin sensibles)
-- -----------------------------------------------------------------------------
create table logs (
  id            bigserial primary key,
  user_id       uuid references profiles(id),
  role          user_role,
  action        text not null,               -- 'order.accept', 'price.update', 'company.suspend', ...
  module        text not null,               -- 'orders', 'companies', 'prices', 'zones', 'auth', ...
  description   text,
  zone_id       uuid references zones(id),
  company_id    uuid references companies(id),
  order_id      uuid references orders(id),
  target_id     uuid,                         -- cible générique (log, user, etc.)
  metadata      jsonb not null default '{}'::jsonb,
  ip_address    inet,
  user_agent    text,
  is_sensitive  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index logs_user_time_idx on logs (user_id, created_at desc);
create index logs_module_time_idx on logs (module, created_at desc);
create index logs_sensitive_idx on logs (created_at desc) where is_sensitive;
create index logs_zone_idx on logs (zone_id, created_at desc) where zone_id is not null;
create index logs_company_idx on logs (company_id, created_at desc) where company_id is not null;

comment on column logs.is_sensitive is 'Actions sensibles cdc §9 : création admin, suspension société, modification tarifaire, export financier, suppression utilisateur, modification zone, changement de rôle, consultation logs sensibles.';
