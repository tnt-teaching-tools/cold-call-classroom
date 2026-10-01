-- Run in your Supabase SQL Editor. No API secrets belong in the website.
begin;
grant usage on schema public to anon, authenticated;
create table if not exists public.review_moderators (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.review_moderators enable row level security;
revoke all on public.review_moderators from anon, authenticated;
create or replace function public.is_review_moderator() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.review_moderators where user_id = auth.uid());
$$;
revoke all on function public.is_review_moderator() from public;
grant execute on function public.is_review_moderator() to anon, authenticated;
create table if not exists public.site_reviews (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 display_name text not null check(char_length(display_name) between 1 and 60),
 rating integer not null check(rating between 1 and 5),
 comment text not null check(char_length(comment) between 5 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','hidden'))
);
alter table public.site_reviews enable row level security;
revoke all on public.site_reviews from anon, authenticated;
grant select on public.site_reviews to anon, authenticated;
grant update(status), delete on public.site_reviews to authenticated;
drop policy if exists reviews_read on public.site_reviews;
create policy reviews_read on public.site_reviews for select to anon, authenticated using(status = 'approved' or public.is_review_moderator());
drop policy if exists reviews_moderate on public.site_reviews;
create policy reviews_moderate on public.site_reviews for update to authenticated using(public.is_review_moderator()) with check(public.is_review_moderator());
drop policy if exists reviews_delete on public.site_reviews;
create policy reviews_delete on public.site_reviews for delete to authenticated using(public.is_review_moderator());
-- Inserts go through this function: callers cannot set approval status or creation dates.
create or replace function public.submit_site_review(p_rating integer, p_comment text, p_name text default 'Teacher') returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_rating is null or p_rating < 1 or p_rating > 5 or p_comment is null or char_length(trim(p_comment)) not between 5 and 2000 or p_name is null or char_length(trim(p_name)) not between 1 and 60 then
  raise exception 'Please check the rating, name and comment.';
 end if;
 insert into public.site_reviews(display_name, rating, comment) values(trim(p_name),p_rating,trim(p_comment));
end;
$$;
revoke all on function public.submit_site_review(integer,text,text) from public;
grant execute on function public.submit_site_review(integer,text,text) to anon, authenticated;
alter table public.site_reviews add column if not exists country text check(country is null or country ~ '^[A-Z]{2}$');
create or replace function public.submit_site_review_with_country(p_rating integer, p_comment text, p_name text, p_country text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if p_rating is null or p_rating not between 1 and 5 or p_comment is null or char_length(trim(p_comment)) not between 5 and 2000 or p_name is null or char_length(trim(p_name)) not between 1 and 60 or (p_country is not null and p_country !~ '^[A-Z]{2}$') then
  raise exception 'Please check the rating, name, country and comment.';
 end if;
 insert into public.site_reviews(display_name,rating,comment,country,status) values(trim(p_name),p_rating,trim(p_comment),p_country,'pending');
end;
$$;
revoke all on function public.submit_site_review_with_country(integer,text,text,text) from public;
grant execute on function public.submit_site_review_with_country(integer,text,text,text) to anon, authenticated;
commit;
-- AFTER creating your confirmed admin user, run this separately:
-- insert into public.review_moderators(user_id)
-- select id from auth.users where lower(email) = 'tntteachingandlearning@gmail.com' and email_confirmed_at is not null
-- on conflict do nothing;
