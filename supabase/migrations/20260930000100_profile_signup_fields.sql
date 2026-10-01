begin;
-- Only bounded, non-authoritative profile fields may come from signup metadata.
-- Roles and account status continue to use server-controlled defaults.
create or replace function private.bootstrap_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, contact_phone) values (
    new.id,
    left(btrim(coalesce(new.raw_user_meta_data->>'display_name', '')), 120),
    nullif(left(btrim(coalesce(new.raw_user_meta_data->>'contact_phone', '')), 32), '')
  );
  return new;
end;
$$;
revoke all on function private.bootstrap_profile() from public, anon, authenticated;
commit;
