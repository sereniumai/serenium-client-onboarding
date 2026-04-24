-- ============================================================================
-- Serenium — invitation RPCs
-- ============================================================================
-- Two security-definer functions:
--   get_invitation_by_token(token)  — anon-accessible invitation lookup
--   accept_invitation(token)        — authenticated, creates membership
-- Both bypass RLS safely because they scope reads to the specific token.
-- ============================================================================

create or replace function public.get_invitation_by_token(invite_token text)
returns table (
  id uuid,
  organization_id uuid,
  organization_name text,
  email text,
  full_name text,
  role member_role,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
security definer set search_path = public
as $$
  select
    i.id, i.organization_id, o.business_name, i.email, i.full_name, i.role,
    i.expires_at, i.accepted_at
  from invitations i
  join organizations o on o.id = i.organization_id
  where i.token = invite_token
  limit 1;
$$;

grant execute on function public.get_invitation_by_token(text) to anon, authenticated;

create or replace function public.accept_invitation(invite_token text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  inv invitations%rowtype;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into inv from invitations where token = invite_token;
  if not found then
    raise exception 'Invalid invitation token' using errcode = '22023';
  end if;
  if inv.accepted_at is not null then
    raise exception 'Invitation already accepted' using errcode = '22023';
  end if;
  if inv.expires_at < now() then
    raise exception 'Invitation expired' using errcode = '22023';
  end if;

  insert into organization_members (organization_id, user_id, role, invited_at, accepted_at)
  values (inv.organization_id, current_user_id, inv.role, inv.created_at, now())
  on conflict (organization_id, user_id) do update set accepted_at = excluded.accepted_at;

  update invitations set accepted_at = now() where id = inv.id;

  return jsonb_build_object(
    'organization_id', inv.organization_id,
    'role', inv.role
  );
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;
