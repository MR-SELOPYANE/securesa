
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('officer','supervisor','admin');

-- PROFILES
create table public.profiles (
  id uuid primary key,
  full_name text not null check (char_length(full_name) between 2 and 80),
  badge text not null unique check (badge ~ '^[A-Z]{2,4}-[0-9]{3,6}$'),
  rank text not null check (char_length(rank) between 2 and 60),
  station text not null check (char_length(station) between 2 and 80),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_active(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and approved)
$$;

create or replace function public.is_supervisor(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active(_user_id) and (public.has_role(_user_id,'supervisor') or public.has_role(_user_id,'admin'))
$$;

create policy "own or supervisor reads profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_supervisor(auth.uid()));
create policy "own or supervisor reads roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_supervisor(auth.uid()));

-- SETTINGS
create table public.settings (
  id int primary key default 1 check (id = 1),
  retention_days int not null default 90 check (retention_days between 7 and 3650),
  info_officer_name text not null default 'Information Officer (to be appointed)',
  info_officer_email text not null default 'privacy@example.gov.za',
  info_officer_phone text not null default '+27 00 000 0000',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);
grant select on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "active users read settings" on public.settings for select to authenticated using (public.is_active(auth.uid()));

-- AUDIT LOG (append-only, hash-chained)
create table public.audit_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_badge text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  prev_hash text not null,
  hash text not null
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "supervisors read audit" on public.audit_log for select to authenticated using (public.is_supervisor(auth.uid()));

create or replace function public.audit_payload(r public.audit_log)
returns text language sql immutable set search_path = public as $$
  select concat_ws('|', r.id::text, floor(extract(epoch from r.created_at)*1000000)::bigint::text,
    coalesce(r.actor_id::text,''), coalesce(r.actor_badge,''), r.action, coalesce(r.entity,''),
    coalesce(r.entity_id,''), r.details::text)
$$;

create or replace function public.audit_chain_trg()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare p text;
begin
  perform pg_advisory_xact_lock(424242);
  select hash into p from public.audit_log order by id desc limit 1;
  new.prev_hash := coalesce(p, repeat('0',64));
  new.hash := encode(extensions.digest(new.prev_hash || public.audit_payload(new), 'sha256'), 'hex');
  return new;
end $$;
create trigger audit_chain before insert on public.audit_log for each row execute function public.audit_chain_trg();

create or replace function public.audit_block_change()
returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end $$;
create trigger audit_no_update before update or delete on public.audit_log for each row execute function public.audit_block_change();

create or replace function public.write_audit(_action text, _entity text, _entity_id text, _details jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare b text;
begin
  select badge into b from public.profiles where id = auth.uid();
  insert into public.audit_log(actor_id, actor_badge, action, entity, entity_id, details)
  values (auth.uid(), coalesce(b,'SYSTEM'), _action, _entity, _entity_id, coalesce(_details,'{}'::jsonb));
end $$;
revoke execute on function public.write_audit(text,text,text,jsonb) from public, anon, authenticated;

-- client-callable logging, restricted action names
create or replace function public.log_event(_action text, _entity text default null, _entity_id text default null, _details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _action not in ('auth.sign_in','auth.sign_out','auth.idle_timeout','export.scans','export.incidents','export.audit',
     'view.history','view.audit','inspection.disposition','lockdown.lifted','popia.notice_shown') then
    raise exception 'action not allowed';
  end if;
  if _action like 'export.%' and not public.is_supervisor(auth.uid()) then raise exception 'supervisor only'; end if;
  if length(coalesce(_details::text,'')) > 4000 then raise exception 'details too large'; end if;
  perform public.write_audit(_action, _entity, _entity_id, _details);
end $$;
grant execute on function public.log_event(text,text,text,jsonb) to authenticated;

create or replace function public.verify_audit_chain()
returns table(ok boolean, checked bigint, broken_id bigint)
language plpgsql stable security definer set search_path = public, extensions as $$
declare r public.audit_log; prev text := repeat('0',64); n bigint := 0;
begin
  if not public.is_supervisor(auth.uid()) then raise exception 'supervisor only'; end if;
  for r in select * from public.audit_log order by id loop
    n := n + 1;
    if r.prev_hash <> prev or r.hash <> encode(extensions.digest(r.prev_hash || public.audit_payload(r),'sha256'),'hex') then
      return query select false, n, r.id; return;
    end if;
    prev := r.hash;
  end loop;
  return query select true, n, null::bigint;
end $$;
grant execute on function public.verify_audit_chain() to authenticated;

-- PROFILE REGISTRATION (first user bootstraps as admin)
create or replace function public.register_profile(_full_name text, _badge text, _rank text, _station text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare first boolean; p public.profiles;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    select * into p from public.profiles where id = auth.uid(); return p;
  end if;
  perform pg_advisory_xact_lock(4243);
  first := not exists (select 1 from public.profiles);
  insert into public.profiles(id, full_name, badge, rank, station, approved)
  values (auth.uid(), trim(_full_name), upper(trim(_badge)), trim(_rank), trim(_station), first)
  returning * into p;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'officer');
  if first then insert into public.user_roles(user_id, role) values (auth.uid(), 'admin'); end if;
  perform public.write_audit('officer.registered','profile',auth.uid()::text, jsonb_build_object('badge',p.badge,'bootstrap_admin',first));
  return p;
end $$;
grant execute on function public.register_profile(text,text,text,text) to authenticated;

create or replace function public.admin_set_officer(_user_id uuid, _approved boolean, _role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_active(auth.uid()) and public.has_role(auth.uid(),'admin')) then raise exception 'admin only'; end if;
  if _user_id = auth.uid() and not _approved then raise exception 'cannot suspend yourself'; end if;
  update public.profiles set approved = _approved where id = _user_id;
  delete from public.user_roles where user_id = _user_id and role in ('supervisor','admin');
  if _role in ('supervisor','admin') then insert into public.user_roles(user_id, role) values (_user_id, _role) on conflict do nothing; end if;
  if _role = 'admin' then insert into public.user_roles(user_id, role) values (_user_id, 'supervisor') on conflict do nothing; end if;
  perform public.write_audit('officer.updated','profile',_user_id::text, jsonb_build_object('approved',_approved,'role',_role));
end $$;
grant execute on function public.admin_set_officer(uuid,boolean,public.app_role) to authenticated;

create or replace function public.admin_update_settings(_retention int, _name text, _email text, _phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_active(auth.uid()) and public.has_role(auth.uid(),'admin')) then raise exception 'admin only'; end if;
  update public.settings set retention_days=_retention, info_officer_name=trim(_name), info_officer_email=trim(_email),
    info_officer_phone=trim(_phone), updated_at=now() where id=1;
  perform public.write_audit('settings.updated','settings','1', jsonb_build_object('retention_days',_retention));
end $$;
grant execute on function public.admin_update_settings(int,text,text,text) to authenticated;

-- SCANS
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  officer_id uuid not null default auth.uid(),
  officer_badge text not null default '',
  subject_name text not null check (char_length(subject_name) between 1 and 120),
  nationality text not null check (char_length(nationality) between 1 and 80),
  doc_masked text not null check (char_length(doc_masked) between 1 and 40),
  outcome text not null check (outcome in ('granted','denied')),
  reason text not null check (char_length(reason) <= 200),
  station text not null check (char_length(station) between 1 and 80),
  match_score numeric(5,1) check (match_score between 0 and 100),
  category text check (char_length(category) <= 60),
  lawful_purpose text not null default 'Immigration Act 13 of 2002 — port-of-entry admission control'
);
grant select, insert on public.scans to authenticated;
grant all on public.scans to service_role;
alter table public.scans enable row level security;
create policy "active officers insert scans" on public.scans for insert to authenticated
  with check (public.is_active(auth.uid()) and officer_id = auth.uid());
create policy "station or supervisor reads scans" on public.scans for select to authenticated
  using (public.is_supervisor(auth.uid()) or (public.is_active(auth.uid()) and station = (select station from public.profiles where id = auth.uid())));

create or replace function public.mask_doc(_d text) returns text language sql immutable as $$
  select case when length(_d) <= 7 then repeat('*', greatest(length(_d)-2,0)) || right(_d,2)
    else left(_d,4) || repeat('*', length(_d)-7) || right(_d,3) end
$$;

create or replace function public.scans_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.officer_id := auth.uid();
  new.officer_badge := (select badge from public.profiles where id = auth.uid());
  new.created_at := now();
  new.doc_masked := public.mask_doc(new.doc_masked);
  new.lawful_purpose := 'Immigration Act 13 of 2002 — port-of-entry admission control';
  return new;
end $$;
create trigger scans_stamp before insert on public.scans for each row execute function public.scans_stamp();

create or replace function public.scans_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.write_audit('scan.'||new.outcome,'scan',new.id::text, jsonb_build_object('station',new.station,'doc',new.doc_masked,'score',new.match_score));
  return null;
end $$;
create trigger scans_audit after insert on public.scans for each row execute function public.scans_audit();

-- INCIDENTS
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  officer_id uuid not null default auth.uid(),
  officer_badge text not null default '',
  contact_id text not null check (char_length(contact_id) <= 40),
  zone text not null check (char_length(zone) <= 80),
  threat text not null check (threat in ('suspect','hostile')),
  label text not null check (char_length(label) <= 120),
  stage text not null default 'detected' check (stage in ('detected','confirmed','dispatched','resolved')),
  dispatched boolean not null default false
);
grant select, insert on public.incidents to authenticated;
grant all on public.incidents to service_role;
alter table public.incidents enable row level security;
create policy "active officers insert incidents" on public.incidents for insert to authenticated
  with check (public.is_active(auth.uid()) and officer_id = auth.uid());
create policy "active officers read incidents" on public.incidents for select to authenticated using (public.is_active(auth.uid()));

create table public.incident_events (
  id bigserial primary key,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  stage text not null,
  by_badge text not null,
  created_at timestamptz not null default now()
);
grant select on public.incident_events to authenticated;
grant all on public.incident_events to service_role;
alter table public.incident_events enable row level security;
create policy "active officers read events" on public.incident_events for select to authenticated using (public.is_active(auth.uid()));

create or replace function public.incidents_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.officer_id := auth.uid();
  new.officer_badge := (select badge from public.profiles where id = auth.uid());
  new.created_at := now(); new.stage := 'detected'; new.dispatched := false;
  return new;
end $$;
create trigger incidents_stamp before insert on public.incidents for each row execute function public.incidents_stamp();

create or replace function public.incidents_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.incident_events(incident_id, stage, by_badge) values (new.id, 'detected', new.officer_badge);
  perform public.write_audit('incident.detected','incident',new.id::text, jsonb_build_object('contact',new.contact_id,'zone',new.zone));
  return null;
end $$;
create trigger incidents_after after insert on public.incidents for each row execute function public.incidents_after();

create or replace function public.advance_incident(_id uuid, _stage text)
returns void language plpgsql security definer set search_path = public as $$
declare cur text; b text; ord text[] := array['detected','confirmed','dispatched','resolved'];
begin
  if not public.is_active(auth.uid()) then raise exception 'not authorised'; end if;
  select stage into cur from public.incidents where id = _id for update;
  if cur is null then raise exception 'not found'; end if;
  if array_position(ord,_stage) is null or array_position(ord,_stage) <= array_position(ord,cur) then
    raise exception 'stage can only move forward';
  end if;
  select badge into b from public.profiles where id = auth.uid();
  update public.incidents set stage=_stage, dispatched = dispatched or _stage in ('dispatched','resolved') where id=_id;
  insert into public.incident_events(incident_id, stage, by_badge) values (_id, _stage, b);
  perform public.write_audit('incident.'||_stage,'incident',_id::text,'{}'::jsonb);
end $$;
grant execute on function public.advance_incident(uuid,text) to authenticated;

-- BREACH REPORTS
create table public.breach_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reporter_id uuid not null default auth.uid(),
  severity text not null check (severity in ('low','medium','high','critical')),
  description text not null check (char_length(description) between 10 and 2000)
);
grant select, insert on public.breach_reports to authenticated;
grant all on public.breach_reports to service_role;
alter table public.breach_reports enable row level security;
create policy "active users report breaches" on public.breach_reports for insert to authenticated
  with check (public.is_active(auth.uid()) and reporter_id = auth.uid());
create policy "supervisors read breaches" on public.breach_reports for select to authenticated using (public.is_supervisor(auth.uid()));
create or replace function public.breach_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.write_audit('popia.breach_reported','breach',new.id::text, jsonb_build_object('severity',new.severity)); return null; end $$;
create trigger breach_audit after insert on public.breach_reports for each row execute function public.breach_audit();

-- DATA SUBJECT REQUESTS
create or replace function public.dsr_lookup(_query text, _reason text)
returns setof public.scans language plpgsql security definer set search_path = public as $$
begin
  if not public.is_supervisor(auth.uid()) then raise exception 'supervisor only'; end if;
  if char_length(trim(_reason)) < 5 or char_length(trim(_query)) < 2 then raise exception 'query and reason required'; end if;
  perform public.write_audit('popia.dsr_lookup','scan',null, jsonb_build_object('query',left(_query,80),'reason',left(_reason,300)));
  return query select * from public.scans where subject_name ilike '%'||_query||'%' or doc_masked ilike '%'||_query||'%' order by created_at desc limit 200;
end $$;
grant execute on function public.dsr_lookup(text,text) to authenticated;

create or replace function public.dsr_correct(_id uuid, _name text, _nationality text, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare old public.scans;
begin
  if not public.is_supervisor(auth.uid()) then raise exception 'supervisor only'; end if;
  if char_length(trim(_reason)) < 5 then raise exception 'reason required'; end if;
  select * into old from public.scans where id=_id;
  if old.id is null then raise exception 'not found'; end if;
  update public.scans set subject_name=left(trim(_name),120), nationality=left(trim(_nationality),80) where id=_id;
  perform public.write_audit('popia.dsr_correction','scan',_id::text, jsonb_build_object('from',jsonb_build_object('name',old.subject_name,'nat',old.nationality),'to',jsonb_build_object('name',_name,'nat',_nationality),'reason',left(_reason,300)));
end $$;
grant execute on function public.dsr_correct(uuid,text,text,text) to authenticated;

-- RETENTION
create or replace function public.purge_expired()
returns jsonb language plpgsql security definer set search_path = public as $$
declare d int; s int; i int;
begin
  if not (public.is_active(auth.uid()) and public.has_role(auth.uid(),'admin')) then raise exception 'admin only'; end if;
  select retention_days into d from public.settings where id=1;
  delete from public.scans where created_at < now() - make_interval(days => d); get diagnostics s = row_count;
  delete from public.incidents where stage='resolved' and created_at < now() - make_interval(days => d); get diagnostics i = row_count;
  perform public.write_audit('popia.retention_purge','retention',null, jsonb_build_object('days',d,'scans',s,'incidents',i));
  return jsonb_build_object('scans',s,'incidents',i,'days',d);
end $$;
grant execute on function public.purge_expired() to authenticated;

create or replace function public.retention_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d int;
begin
  if not public.is_supervisor(auth.uid()) then raise exception 'supervisor only'; end if;
  select retention_days into d from public.settings where id=1;
  return jsonb_build_object('days',d,
    'expired_scans',(select count(*) from public.scans where created_at < now() - make_interval(days=>d)),
    'expired_incidents',(select count(*) from public.incidents where stage='resolved' and created_at < now() - make_interval(days=>d)));
end $$;
grant execute on function public.retention_status() to authenticated;

alter publication supabase_realtime add table public.scans;
alter publication supabase_realtime add table public.incidents;
