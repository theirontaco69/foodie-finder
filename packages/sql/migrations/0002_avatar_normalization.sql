begin;

alter table public.profiles
  alter column avatar_url type text using avatar_url::text;

update public.profiles
set avatar_url = regexp_replace(avatar_url, '^https?://[^/]+/storage/v1/object/public/', '', 'i')
where avatar_url ~* '^https?://';

update public.profiles
set avatar_url = regexp_replace(avatar_url, '^public/', '', 'i')
where avatar_url ~* '^public/';

update public.profiles
set avatar_url = regexp_replace(avatar_url, '^media/avatars/', 'avatars/', 'i')
where avatar_url ~* '^media/avatars/';

update public.profiles
set avatar_url = replace(avatar_url, '<YOUR-USER-ID>', id::text)
where avatar_url like '%<YOUR-USER-ID>%';

alter table public.profiles
  add column if not exists avatar_version integer not null default 1;

create or replace function public.bump_avatar_version() returns trigger as $$
begin
  if new.avatar_url is distinct from old.avatar_url then
    new.avatar_version := coalesce(old.avatar_version, 1) + 1;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bump_avatar_version on public.profiles;
create trigger trg_bump_avatar_version
before update of avatar_url on public.profiles
for each row execute function public.bump_avatar_version();

alter table public.profiles
  drop constraint if exists profiles_avatar_url_no_http;

alter table public.profiles
  add constraint profiles_avatar_url_no_http
  check (avatar_url is null or avatar_url !~* '^https?://');

commit;
