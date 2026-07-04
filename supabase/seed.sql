-- =============================================================================
-- Plateforme Eau Libreville — Seed initial
-- Contexte : état d'urgence hydrique Grand Libreville (décret 2026-07-01)
-- Source tarif 1 000 L = 3 000 FCFA :
--   https://gabonactu.com/blog/2026/07/01/urgence-hydrique-larmee-requisitionnee-pour-distribuer-de-leau-dans-le-grand-libreville/
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Paliers de volume (cdc §3)
-- -----------------------------------------------------------------------------
insert into price_tiers (volume_liters, label, display_order) values
  (100,  '100 litres',       1),
  (200,  '200 litres',       2),
  (500,  '500 litres',       3),
  (1000, '1 m³ (1 000 L)',   4)
on conflict (volume_liters) do nothing;

-- -----------------------------------------------------------------------------
-- Version tarifaire d'urgence
-- 1 000 L à 3 000 FCFA confirmé par le décret. Les autres paliers reprennent
-- les valeurs du cdc v1.1 — À FAIRE VALIDER par le ministère.
-- -----------------------------------------------------------------------------
insert into price_versions (tier_id, price_fcfa, valid_from, reason, reference_doc)
select id, 400, '2026-07-01 00:00:00+00',
  'Tarif cdc v1.1 palier 100 L — à valider par le ministère dans le cadre du décret d''urgence.',
  'https://gabonactu.com/blog/2026/07/01/urgence-hydrique-larmee-requisitionnee-pour-distribuer-de-leau-dans-le-grand-libreville/'
from price_tiers where volume_liters = 100;

insert into price_versions (tier_id, price_fcfa, valid_from, reason, reference_doc)
select id, 800, '2026-07-01 00:00:00+00',
  'Tarif cdc v1.1 palier 200 L — à valider par le ministère dans le cadre du décret d''urgence.',
  'https://gabonactu.com/blog/2026/07/01/urgence-hydrique-larmee-requisitionnee-pour-distribuer-de-leau-dans-le-grand-libreville/'
from price_tiers where volume_liters = 200;

insert into price_versions (tier_id, price_fcfa, valid_from, reason, reference_doc)
select id, 2000, '2026-07-01 00:00:00+00',
  'Tarif cdc v1.1 palier 500 L — à valider par le ministère dans le cadre du décret d''urgence.',
  'https://gabonactu.com/blog/2026/07/01/urgence-hydrique-larmee-requisitionnee-pour-distribuer-de-leau-dans-le-grand-libreville/'
from price_tiers where volume_liters = 500;

insert into price_versions (tier_id, price_fcfa, valid_from, reason, reference_doc)
select id, 3000, '2026-07-01 00:00:00+00',
  'Décret urgence hydrique — cuve de 1 000 L réglementée à 3 000 FCFA (contre 10 000 FCFA auparavant).',
  'https://gabonactu.com/blog/2026/07/01/urgence-hydrique-larmee-requisitionnee-pour-distribuer-de-leau-dans-le-grand-libreville/'
from price_tiers where volume_liters = 1000;

-- -----------------------------------------------------------------------------
-- Quartiers du Grand Libreville
-- Statut 'draft' : passera à 'active' quand la géométrie sera importée
-- depuis OSM ou tracée manuellement par un admin.
-- -----------------------------------------------------------------------------
insert into zones (name, sector, status) values
  ('Angondjé',      'Nord',   'draft'),
  ('Akanda',        'Nord',   'draft'),
  ('Okala',         'Nord',   'draft'),
  ('Avorbam',       'Nord',   'draft'),
  ('Alibandeng',    'Nord',   'draft'),
  ('Centre-ville',  'Centre', 'draft'),
  ('Louis',         'Centre', 'draft'),
  ('Charbonnages',  'Centre', 'draft'),
  ('Glass',         'Centre', 'draft'),
  ('Akébé',         'Centre', 'draft'),  -- ajout contexte urgence hydrique
  ('Nzeng-Ayong',   'Est',    'draft'),
  ('PK5',           'Est',    'draft'),
  ('PK6',           'Est',    'draft'),
  ('PK7',           'Est',    'draft'),
  ('PK8',           'Est',    'draft'),
  ('PK9',           'Est',    'draft'),
  ('PK10',          'Est',    'draft'),
  ('Bikélé',        'Est',    'draft'),  -- ajout contexte urgence hydrique
  ('Owendo',        'Sud',    'draft'),
  ('Mindoubé',      'Sud',    'draft'),
  ('Lalala',        'Sud',    'draft')
on conflict (name) do nothing;

-- -----------------------------------------------------------------------------
-- Opérateurs pré-provisionnés (contexte urgence hydrique)
-- Statut 'pending_validation' : à activer par un super admin.
-- -----------------------------------------------------------------------------
insert into companies (commercial_name, legal_name, operator_type, status, dispatch_mode) values
  ('Génie Militaire',      'Forces de Défense et de Sécurité — Génie Militaire', 'military', 'pending_validation', 'manual'),
  ('Sapeurs-Pompiers',     'Forces de Défense et de Sécurité — Brigade Nationale des Sapeurs-Pompiers', 'military', 'pending_validation', 'manual'),
  ('Garde Républicaine',   'Forces de Défense et de Sécurité — Garde Républicaine', 'military', 'pending_validation', 'manual')
on conflict do nothing;
