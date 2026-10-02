-- Temporary encrypted display relay. No class lists or response records belong here.
begin;
create schema if not exists display_private;
revoke all on schema display_private from public;
grant usage on schema display_private to anon, authenticated;
create table if not exists display_private.sessions (
 id uuid primary key,
 reader_hash bytea not null,
 pairing_hash bytea,
 writer_hash bytea,
 ciphertext text,
 sequence bigint not null default 0,
 active boolean not null default false,
 expires_at timestamptz not null default (now() + interval '2 hours'),
 updated_at timestamptz,
 display_seen_at timestamptz
);
alter table display_private.sessions enable row level security;
revoke all on display_private.sessions from public, anon, authenticated;
create index if not exists display_sessions_expiry on display_private.sessions(expires_at);
-- Token-gated privileged functions are kept in a non-exposed schema.
-- The public RPC wrappers are SECURITY INVOKER. No account is required.
create or replace function display_private.create_session(p_id uuid,p_reader text,p_pairing text) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare expiry timestamptz;
begin
 if p_reader is null or p_reader !~ '^[a-f0-9]{64}$' or p_pairing is null or p_pairing !~ '^[a-f0-9]{64}$' or p_reader=p_pairing then raise exception 'Invalid pairing'; end if;
 delete from display_private.sessions where expires_at < now();
 insert into display_private.sessions(id,reader_hash,pairing_hash) values(p_id,extensions.digest(p_reader,'sha256'),extensions.digest(p_pairing,'sha256')) returning expires_at into expiry;
 return expiry;
end; $$;
create or replace function display_private.claim_session(p_id uuid,p_pairing text,p_writer text,p_ciphertext text) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare expiry timestamptz;
begin
 if p_writer is null or p_writer !~ '^[a-f0-9]{64}$' or p_pairing is null or p_pairing !~ '^[a-f0-9]{64}$' or p_writer=p_pairing or p_ciphertext is null or length(p_ciphertext) not between 24 and 4096 then raise exception 'Invalid pairing'; end if;
 update display_private.sessions set writer_hash=extensions.digest(p_writer,'sha256'),pairing_hash=null,ciphertext=p_ciphertext,updated_at=now(),sequence=1
 where id=p_id and pairing_hash=extensions.digest(p_pairing,'sha256') and writer_hash is null and expires_at > now() returning expires_at into expiry;
 if expiry is null then raise exception 'Pairing unavailable'; end if;
 return expiry;
end; $$;
create or replace function display_private.read_session(p_id uuid,p_reader text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 update display_private.sessions set display_seen_at=now()
 where id=p_id and reader_hash=extensions.digest(p_reader,'sha256') and expires_at>now()
 returning jsonb_build_object('ciphertext',ciphertext,'sequence',sequence,'active',active,'expires_at',expires_at,'updated_at',updated_at) into result;
 if result is null then raise exception 'Display unavailable'; end if;
 return result;
end; $$;
create or replace function display_private.activate_session(p_id uuid,p_reader text) returns void
language plpgsql security definer set search_path='' as $$
begin
 update display_private.sessions set active=true where id=p_id and reader_hash=extensions.digest(p_reader,'sha256') and writer_hash is not null and expires_at>now();
 if not found then raise exception 'Pairing unavailable'; end if;
end; $$;
create or replace function display_private.write_session(p_id uuid,p_writer text,p_ciphertext text,p_sequence bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_ciphertext is null or length(p_ciphertext) not between 24 and 4096 or p_sequence is null or p_sequence<2 then raise exception 'Invalid display update'; end if;
 update display_private.sessions set ciphertext=p_ciphertext,sequence=p_sequence,updated_at=now()
 where id=p_id and writer_hash=extensions.digest(p_writer,'sha256') and active and expires_at>now() and sequence<p_sequence;
 if not found then raise exception 'Display unavailable'; end if;
end; $$;
create or replace function display_private.session_status(p_id uuid,p_writer text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_build_object('active',active,'expires_at',expires_at,'display_seen_at',display_seen_at) into result from display_private.sessions
 where id=p_id and writer_hash=extensions.digest(p_writer,'sha256') and expires_at>now();
 if result is null then raise exception 'Display unavailable'; end if;
 return result;
end; $$;
create or replace function display_private.close_session(p_id uuid,p_token text) returns void
language plpgsql security definer set search_path='' as $$
begin
 delete from display_private.sessions where id=p_id and (reader_hash=extensions.digest(p_token,'sha256') or writer_hash=extensions.digest(p_token,'sha256'));
 if not found then raise exception 'Display unavailable'; end if;
end; $$;
revoke all on function display_private.create_session(uuid,text,text) from public;
grant execute on function display_private.create_session(uuid,text,text) to anon, authenticated;
create or replace function public.display_create_session(p_id uuid,p_reader text,p_pairing text) returns timestamptz language sql security invoker set search_path='' as $$ select display_private.create_session(p_id,p_reader,p_pairing); $$;
revoke all on function public.display_create_session(uuid,text,text) from public;
grant execute on function public.display_create_session(uuid,text,text) to anon, authenticated;
revoke all on function display_private.claim_session(uuid,text,text,text) from public;
grant execute on function display_private.claim_session(uuid,text,text,text) to anon, authenticated;
create or replace function public.display_claim_session(p_id uuid,p_pairing text,p_writer text,p_ciphertext text) returns timestamptz language sql security invoker set search_path='' as $$ select display_private.claim_session(p_id,p_pairing,p_writer,p_ciphertext); $$;
revoke all on function public.display_claim_session(uuid,text,text,text) from public;
grant execute on function public.display_claim_session(uuid,text,text,text) to anon, authenticated;
revoke all on function display_private.read_session(uuid,text) from public;
grant execute on function display_private.read_session(uuid,text) to anon, authenticated;
create or replace function public.display_read_session(p_id uuid,p_reader text) returns jsonb language sql security invoker set search_path='' as $$ select display_private.read_session(p_id,p_reader); $$;
revoke all on function public.display_read_session(uuid,text) from public;
grant execute on function public.display_read_session(uuid,text) to anon, authenticated;
revoke all on function display_private.activate_session(uuid,text) from public;
grant execute on function display_private.activate_session(uuid,text) to anon, authenticated;
create or replace function public.display_activate_session(p_id uuid,p_reader text) returns void language sql security invoker set search_path='' as $$ select display_private.activate_session(p_id,p_reader); $$;
revoke all on function public.display_activate_session(uuid,text) from public;
grant execute on function public.display_activate_session(uuid,text) to anon, authenticated;
revoke all on function display_private.write_session(uuid,text,text,bigint) from public;
grant execute on function display_private.write_session(uuid,text,text,bigint) to anon, authenticated;
create or replace function public.display_write_session(p_id uuid,p_writer text,p_ciphertext text,p_sequence bigint) returns void language sql security invoker set search_path='' as $$ select display_private.write_session(p_id,p_writer,p_ciphertext,p_sequence); $$;
revoke all on function public.display_write_session(uuid,text,text,bigint) from public;
grant execute on function public.display_write_session(uuid,text,text,bigint) to anon, authenticated;
revoke all on function display_private.session_status(uuid,text) from public;
grant execute on function display_private.session_status(uuid,text) to anon, authenticated;
create or replace function public.display_session_status(p_id uuid,p_writer text) returns jsonb language sql security invoker set search_path='' as $$ select display_private.session_status(p_id,p_writer); $$;
revoke all on function public.display_session_status(uuid,text) from public;
grant execute on function public.display_session_status(uuid,text) to anon, authenticated;
revoke all on function display_private.close_session(uuid,text) from public;
grant execute on function display_private.close_session(uuid,text) to anon, authenticated;
create or replace function public.display_close_session(p_id uuid,p_token text) returns void language sql security invoker set search_path='' as $$ select display_private.close_session(p_id,p_token); $$;
revoke all on function public.display_close_session(uuid,text) from public;
grant execute on function public.display_close_session(uuid,text) to anon, authenticated;
commit;

-- Expired encrypted sessions are purged at most fifteen minutes after expiry.
create extension if not exists pg_cron;
select cron.schedule('cold-call-display-expiry','*/15 * * * *', $$delete from display_private.sessions where expires_at < now()$$);
