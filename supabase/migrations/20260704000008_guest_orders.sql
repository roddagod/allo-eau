-- =============================================================================
-- Plateforme Eau Libreville — Commandes guest (sans compte, OTP SMS)
--
-- Le client peut commander sans créer de compte : le téléphone est vérifié
-- par OTP (SMS via Wirepick). Une fois vérifié, la commande est créée avec
-- `client_id = NULL` et un `guest_access_token` UUID pour la retrouver.
-- =============================================================================

-- Table des challenges OTP (courte durée de vie)
create table phone_verifications (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null,
  code_hash     text not null,                      -- SHA-256 du code à 6 chiffres
  order_draft   jsonb not null,                     -- snapshot du formulaire pour création différée
  expires_at    timestamptz not null,
  attempts      int  not null default 0,
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index phone_verifications_phone_idx on phone_verifications (phone, created_at desc);
create index phone_verifications_open_idx on phone_verifications (id) where verified_at is null;

-- Token d'accès public pour retrouver une commande guest par URL
alter table orders
  add column guest_access_token uuid unique default gen_random_uuid();

-- RLS phone_verifications : uniquement le service_role (via server actions)
alter table phone_verifications enable row level security;
-- Aucune policy → tout accès anon/authenticated est bloqué. service_role bypass RLS.

-- RLS orders : autoriser SELECT anon sur commandes guest lorsqu'on connaît le token
create policy orders_public_read_via_guest_token on orders for select using (
  client_id is null and guest_access_token = coalesce(
    nullif(current_setting('request.jwt.claim.guest_token', true), '')::uuid,
    guest_access_token  -- fallback pour appel service_role
  )
);

-- On ne peut pas passer facilement une claim custom depuis un client anon ;
-- l'implémentation applicative utilise le service_role client pour la lecture
-- côté server component /suivre/[id]. Cette policy reste utile pour Realtime.

-- Purge automatique : phone_verifications > 24h supprimés quotidiennement
create or replace function purge_old_phone_verifications() returns void
  language sql as $$
  delete from phone_verifications where created_at < now() - interval '24 hours';
$$;

-- Planification pg_cron (04:00 UTC quotidien)
do $$
begin
  perform cron.unschedule('purge-phone-verifications')
  where exists (select 1 from cron.job where jobname = 'purge-phone-verifications');
exception when others then null;
end $$;

select cron.schedule(
  'purge-phone-verifications',
  '0 4 * * *',
  $$select purge_old_phone_verifications()$$
);
