-- One-time email recovery links for private Client Rooms.
create table if not exists public.room_recovery_tokens (
  token_hash text primary key check (char_length(token_hash) = 64),
  room_id uuid not null references public.client_rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists room_recovery_tokens_room_idx
on public.room_recovery_tokens (room_id);

create index if not exists room_recovery_tokens_expiry_idx
on public.room_recovery_tokens (expires_at);

alter table public.room_recovery_tokens enable row level security;

revoke all on table public.room_recovery_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.room_recovery_tokens to service_role;

-- Atomically consume a one-time recovery token and rotate the Client Room link.
create or replace function public.redeem_room_recovery_token(
  p_recovery_token_hash text,
  p_room_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recovered_room_id uuid;
  recovered_enquiry_id bigint;
begin
  if char_length(p_recovery_token_hash) <> 64
    or char_length(p_room_token_hash) <> 64 then
    return false;
  end if;

  select recovery.room_id, room.enquiry_id
  into recovered_room_id, recovered_enquiry_id
  from public.room_recovery_tokens as recovery
  join public.client_rooms as room on room.id = recovery.room_id
  where recovery.token_hash = p_recovery_token_hash
    and recovery.used_at is null
    and recovery.expires_at > now()
    and room.archived = false
  for update of recovery, room;

  if recovered_room_id is null then
    return false;
  end if;

  update public.room_recovery_tokens
  set used_at = now()
  where token_hash = p_recovery_token_hash;

  update public.client_rooms
  set token_hash = p_room_token_hash, updated_at = now()
  where id = recovered_room_id;

  if recovered_enquiry_id is not null then
    update public.enquiries
    set website_notification_token_hash = null
    where id = recovered_enquiry_id;
  end if;

  delete from public.room_recovery_tokens
  where room_id = recovered_room_id;

  return true;
end;
$$;

revoke all on function public.redeem_room_recovery_token(text, text)
from public, anon, authenticated;
grant execute on function public.redeem_room_recovery_token(text, text)
to service_role;
