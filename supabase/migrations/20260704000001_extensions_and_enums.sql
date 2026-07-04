-- =============================================================================
-- Plateforme Eau Libreville — Extensions et types énumérés
-- =============================================================================

create extension if not exists postgis;
create extension if not exists btree_gist;    -- EXCLUDE constraints sur ranges temporels
create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists pg_cron;       -- jobs planifiés (purge positions, etc.)

-- Rôles utilisateurs (cdc §2 + call-center ajouté)
create type user_role as enum (
  'client',
  'company_owner',
  'company_operator',
  'call_center',
  'driver',
  'supervisor',
  'admin',
  'super_admin'
);

-- Statuts société (cdc §5.1)
create type company_status as enum (
  'pending_validation',
  'active',
  'suspended',
  'rejected',
  'deactivated'
);

-- Type d'opérateur (privé, militaire pour urgence hydrique, municipal)
create type company_operator_type as enum (
  'private',
  'military',
  'municipal'
);

-- Mode de dispatch (manuel / auto / override)
create type dispatch_mode as enum (
  'manual',
  'auto',
  'override'
);

-- Statut zone
create type zone_status as enum (
  'active',
  'inactive',
  'draft'
);

-- Statut livreur
create type driver_status as enum (
  'off_duty',
  'available',
  'on_delivery',
  'suspended'
);

-- Origine de la position GPS (réelle, simulée, saisie manuelle)
create type location_source as enum (
  'gps',
  'simulated',
  'manual'
);

-- Cycle de vie commande (cdc §12.3 + états intermédiaires)
create type order_status as enum (
  'pending',            -- transmise
  'accepted',           -- acceptée par société
  'refused',            -- refusée par société
  'slot_confirmed',     -- créneau confirmé
  'driver_assigned',    -- livreur affecté
  'driver_en_route',    -- livreur en route
  'arrived_nearby',     -- arrivé à proximité
  'delivered',          -- livrée
  'cancelled',          -- annulée
  'incident'            -- incident signalé
);

-- Moyens de paiement (cdc §4.5)
create type payment_method as enum (
  'cash',
  'airtel_money',
  'moov_money',
  'clickpay'
);

-- Statuts de paiement (cdc §4.5)
create type payment_status as enum (
  'pending',
  'confirmed',
  'failed',
  'refunded',
  'to_verify'           -- cash uniquement
);

-- Statut tournée
create type route_status as enum (
  'planned',
  'in_progress',
  'completed',
  'cancelled'
);

-- Types de notifications (cdc §4.6, §12.4)
create type notification_type as enum (
  'order_transmitted',
  'order_accepted',
  'order_refused',
  'slot_confirmed',
  'driver_assigned',
  'driver_en_route',
  'driver_arrived',
  'delivered',
  'incident',
  'cancelled',
  'payment_confirmed',
  'system'
);
