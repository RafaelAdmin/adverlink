-- Gate deal chat until the channel owner accepts the order.
-- Does not change RLS policies. Idempotent. Review before applying.
-- Not applied on production from this change set.

create or replace function public.protect_deal_chat_until_accepted()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_accepted_at timestamp with time zone;
begin
  select status, accepted_at
    into v_status, v_accepted_at
  from public.ad_requests
  where id = new.deal_id;

  if not found then
    raise exception 'Deal not found';
  end if;

  if v_status in ('new', 'rejected')
     or (v_status = 'cancelled' and v_accepted_at is null)
  then
    raise exception 'Chat is available after the channel owner accepts the order';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_deal_chat_until_accepted_trigger on public.messages;
create trigger protect_deal_chat_until_accepted_trigger
  before insert on public.messages
  for each row execute function public.protect_deal_chat_until_accepted();
