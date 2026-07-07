-- Fix : le trigger anti-override company_id côté client bloquait aussi
-- les UPDATE effectués par le trigger de dispatch (attribution société).
-- On autorise l'écriture si on est déjà dans un contexte de trigger imbriqué.

create or replace function prevent_client_company_override()
returns trigger
language plpgsql
security definer
as $$
declare
  v_actor_role user_role;
begin
  -- Si on est appelé depuis un autre trigger (par ex. dispatch), on laisse passer.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  select role into v_actor_role from profiles where id = auth.uid();

  if tg_op = 'INSERT'
     and v_actor_role = 'client'
     and new.company_id is not null
  then
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
