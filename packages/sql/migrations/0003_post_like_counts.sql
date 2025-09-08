begin;
alter table public.posts add column if not exists likes_count integer not null default 0;
create or replace function public.inc_likes_count() returns trigger as $$
begin
  update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  return new;
end;
$$ language plpgsql;
create or replace function public.dec_likes_count() returns trigger as $$
begin
  update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  return old;
end;
$$ language plpgsql;
drop trigger if exists trg_inc_likes_count on public.post_likes;
create trigger trg_inc_likes_count after insert on public.post_likes for each row execute function public.inc_likes_count();
drop trigger if exists trg_dec_likes_count on public.post_likes;
create trigger trg_dec_likes_count after delete on public.post_likes for each row execute function public.dec_likes_count();
update public.posts p set likes_count = sub.c from (select post_id, count(*)::int as c from public.post_likes group by post_id) sub where p.id = sub.post_id;
update public.posts set likes_count = 0 where likes_count is null;
commit;
