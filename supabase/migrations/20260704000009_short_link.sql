-- =============================================================================
-- Plateforme Allô Eau — Short link tracking (allo-eau.ga/s/xxxxxxx)
-- =============================================================================

alter table orders add column short_code text unique;
create index orders_short_code_idx on orders (short_code);

-- Charset lisible : pas de 0/O/l/1/I qui prêtent à confusion
create or replace function generate_order_short_code() returns trigger
  language plpgsql as $$
declare
  chars     text := 'abcdefghjkmnpqrstuvwxyz23456789';
  code      text;
  i         int;
  attempt   int := 0;
begin
  if new.short_code is null or new.short_code = '' then
    loop
      code := '';
      for i in 1..7 loop
        code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
      end loop;
      exit when not exists (select 1 from orders where short_code = code);
      attempt := attempt + 1;
      exit when attempt > 5;
    end loop;
    new.short_code := code;
  end if;
  return new;
end $$;

create trigger orders_generate_short_code
  before insert on orders
  for each row execute function generate_order_short_code();

-- Backfill des commandes déjà en base (sans short_code)
update orders o
   set short_code = sub.code
  from (
    select id,
           lower(substr(md5(id::text || random()::text), 1, 7)) as code
      from orders where short_code is null
  ) sub
 where o.id = sub.id;
