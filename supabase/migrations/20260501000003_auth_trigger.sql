-- ============================================================================
-- Serenium — create a `profiles` row automatically on signup
-- ============================================================================
-- Supabase Auth stores users in auth.users. Our app reads profile data from the
-- `profiles` table. This trigger creates a matching row at signup time using
-- metadata passed into `signUp()` (e.g. `{ data: { full_name: '...' } }`).
--
-- Every new user is created with role = 'client'. Promote admins manually:
--   update profiles set role = 'admin' where email = 'contact@sereniumai.com';
-- ============================================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'client'
  );
  return new;
end;
$$;

-- Drop first in case of re-runs during dev.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
