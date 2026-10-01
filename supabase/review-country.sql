-- Add optional teacher country; existing reviews and clients keep working.
begin;
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
