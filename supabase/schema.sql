-- Smart Campus — Phase 1 & 2 schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type app_role as enum (
    'STUDENT', 'FACULTY', 'HOD', 'ADMIN', 'BUS_DRIVER', 'CANTEEN_STAFF', 'ALUMNI'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('PRESENT', 'ABSENT', 'LATE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fee_type as enum ('TUITION', 'BUS', 'LIBRARY', 'OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fee_status as enum ('PAID', 'PENDING', 'OVERDUE');
exception when duplicate_object then null; end $$;

-- ============================================================
-- CORE IDENTITY
-- ============================================================

-- One row per authenticated user (mirrors auth.users, adds app data).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique
);

create table if not exists students (
  id uuid primary key references profiles(id) on delete cascade,
  department_id uuid references departments(id),
  roll_number text not null unique,
  year int not null,
  section text not null,
  admission_year int not null
);

create table if not exists faculty (
  id uuid primary key references profiles(id) on delete cascade,
  department_id uuid references departments(id),
  designation text
);

-- Secure QR identity: random opaque token, never personal data.
create table if not exists qr_identities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade unique,
  code text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACADEMICS
-- ============================================================

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  department_id uuid references departments(id),
  semester int not null
);

-- Which faculty teaches which subject, to which section, in which year.
create table if not exists faculty_subjects (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  section text not null,
  academic_year text not null,
  unique (faculty_id, subject_id, section, academic_year)
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  academic_year text not null,
  unique (student_id, subject_id, academic_year)
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  faculty_id uuid not null references faculty(id),
  date date not null,
  status attendance_status not null,
  created_at timestamptz not null default now(),
  unique (student_id, subject_id, date)
);

create table if not exists late_logs (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendance(id) on delete cascade,
  reason text not null,
  faculty_id uuid not null references faculty(id),
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  faculty_id uuid not null references faculty(id),
  unit text,
  topic text not null,
  academic_year text not null,
  section text not null,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists timetable (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  section text not null,
  academic_year text not null,
  day_of_week int not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  subject_id uuid not null references subjects(id),
  faculty_id uuid not null references faculty(id),
  room text
);

-- ============================================================
-- FEES
-- ============================================================

create table if not exists fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  fee_type fee_type not null,
  amount numeric(10, 2) not null,
  due_date date not null,
  academic_year text not null
);

create table if not exists fee_transactions (
  id uuid primary key default gen_random_uuid(),
  fee_id uuid not null references fees(id) on delete cascade,
  amount_paid numeric(10, 2) not null,
  paid_at timestamptz not null default now(),
  method text not null default 'MANUAL',
  status fee_status not null default 'PAID'
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_attendance_student on attendance(student_id);
create index if not exists idx_attendance_subject_date on attendance(subject_id, date);
create index if not exists idx_notes_subject on notes(subject_id);
create index if not exists idx_timetable_dept_section on timetable(department_id, section);
create index if not exists idx_fees_student on fees(student_id);
create index if not exists idx_students_department on students(department_id);

-- ============================================================
-- HELPER FUNCTIONS (used inside RLS policies)
-- ============================================================
create or replace function auth_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_faculty_for_subject(p_subject_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from faculty_subjects
    where subject_id = p_subject_id and faculty_id = auth.uid()
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table departments enable row level security;
alter table students enable row level security;
alter table faculty enable row level security;
alter table qr_identities enable row level security;
alter table subjects enable row level security;
alter table faculty_subjects enable row level security;
alter table enrollments enable row level security;
alter table attendance enable row level security;
alter table late_logs enable row level security;
alter table notes enable row level security;
alter table timetable enable row level security;
alter table fees enable row level security;
alter table fee_transactions enable row level security;

-- profiles: everyone can read their own; admins/HOD/faculty read all;
-- everyone can read FACULTY profiles (campus faculty directory, and so
-- students can see who teaches their classes on timetables/rosters).
drop policy if exists "profiles_select_own_or_staff" on profiles;
create policy "profiles_select_own_or_staff" on profiles for select
  using (
    id = auth.uid()
    or auth_role() in ('ADMIN', 'HOD', 'FACULTY')
    or role = 'FACULTY'
  );

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid());

-- A user may update their own row (e.g. full_name), but never their own
-- role/id/email through a normal session — that would be a privilege
-- escalation. auth.role() is NULL for direct SQL (the Supabase SQL
-- Editor, used today to promote admins) and 'service_role' for admin-API
-- calls, so only ordinary 'authenticated' sessions are restricted here.
create or replace function prevent_role_self_escalation() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated'
    and (new.role <> old.role or new.id <> old.id or new.email <> old.email)
  then
    raise exception 'Cannot modify role, id, or email directly';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_restrict_update on profiles;
create trigger profiles_restrict_update
  before update on profiles
  for each row execute function prevent_role_self_escalation();

-- departments / subjects: readable by any authenticated user.
drop policy if exists "departments_select_all" on departments;
create policy "departments_select_all" on departments for select using (true);

drop policy if exists "subjects_select_all" on subjects;
create policy "subjects_select_all" on subjects for select using (true);

drop policy if exists "faculty_subjects_select_all" on faculty_subjects;
create policy "faculty_subjects_select_all" on faculty_subjects for select using (true);

-- faculty_subjects: a faculty member may assign themself to teach a class.
-- (Stand-in for a future admin/HOD timetable-assignment UI.)
drop policy if exists "faculty_subjects_insert_own" on faculty_subjects;
create policy "faculty_subjects_insert_own" on faculty_subjects for insert
  with check (faculty_id = auth.uid() and auth_role() = 'FACULTY');

drop policy if exists "faculty_subjects_delete_own" on faculty_subjects;
create policy "faculty_subjects_delete_own" on faculty_subjects for delete
  using (faculty_id = auth.uid() and auth_role() = 'FACULTY');

-- students: student sees own row; staff sees all.
drop policy if exists "students_select" on students;
create policy "students_select" on students for select
  using (id = auth.uid() or auth_role() in ('ADMIN', 'HOD', 'FACULTY'));

drop policy if exists "faculty_select" on faculty;
create policy "faculty_select" on faculty for select using (true);

-- students/faculty: a user may create their own extended-profile row once,
-- right after signup (role must already match, set by the signup trigger).
drop policy if exists "students_insert_own" on students;
create policy "students_insert_own" on students for insert
  with check (id = auth.uid() and auth_role() = 'STUDENT');

drop policy if exists "faculty_insert_own" on faculty;
create policy "faculty_insert_own" on faculty for insert
  with check (id = auth.uid() and auth_role() = 'FACULTY');

-- qr_identities: only the owner (or staff, for verification) can read.
drop policy if exists "qr_select_own_or_staff" on qr_identities;
create policy "qr_select_own_or_staff" on qr_identities for select
  using (
    profile_id = auth.uid()
    or auth_role() in ('ADMIN', 'HOD', 'FACULTY', 'BUS_DRIVER', 'CANTEEN_STAFF')
  );

-- enrollments: student sees own; staff sees all.
drop policy if exists "enrollments_select" on enrollments;
create policy "enrollments_select" on enrollments for select
  using (student_id = auth.uid() or auth_role() in ('ADMIN', 'HOD', 'FACULTY'));

-- enrollments: a student may enroll themself in a subject (e.g. auto-enrolled
-- into their department's subjects at signup).
drop policy if exists "enrollments_insert_own" on enrollments;
create policy "enrollments_insert_own" on enrollments for insert
  with check (student_id = auth.uid() and auth_role() = 'STUDENT');

-- attendance: student reads own records; faculty reads/writes for their subjects; admin/HOD read all.
drop policy if exists "attendance_select" on attendance;
create policy "attendance_select" on attendance for select
  using (
    student_id = auth.uid()
    or auth_role() in ('ADMIN', 'HOD')
    or is_faculty_for_subject(subject_id)
  );

drop policy if exists "attendance_insert_faculty" on attendance;
create policy "attendance_insert_faculty" on attendance for insert
  with check (auth_role() = 'FACULTY' and is_faculty_for_subject(subject_id));

drop policy if exists "attendance_update_faculty" on attendance;
create policy "attendance_update_faculty" on attendance for update
  using (auth_role() = 'FACULTY' and is_faculty_for_subject(subject_id));

-- late_logs: same visibility as attendance.
drop policy if exists "late_logs_select" on late_logs;
create policy "late_logs_select" on late_logs for select
  using (
    auth_role() in ('ADMIN', 'HOD', 'FACULTY')
    or exists (select 1 from attendance a where a.id = attendance_id and a.student_id = auth.uid())
  );

drop policy if exists "late_logs_insert_faculty" on late_logs;
create policy "late_logs_insert_faculty" on late_logs for insert
  with check (auth_role() = 'FACULTY');

-- notes: enrolled students + staff can read; faculty can insert for their own subjects.
drop policy if exists "notes_select" on notes;
create policy "notes_select" on notes for select
  using (
    auth_role() in ('ADMIN', 'HOD', 'FACULTY')
    or exists (
      select 1 from enrollments e
      where e.subject_id = notes.subject_id and e.student_id = auth.uid()
    )
  );

drop policy if exists "notes_insert_faculty" on notes;
create policy "notes_insert_faculty" on notes for insert
  with check (auth_role() = 'FACULTY' and is_faculty_for_subject(subject_id));

-- timetable: readable by any authenticated user; writes restricted to admin/HOD.
drop policy if exists "timetable_select_all" on timetable;
create policy "timetable_select_all" on timetable for select using (true);

drop policy if exists "timetable_write_admin" on timetable;
create policy "timetable_write_admin" on timetable for all
  using (auth_role() in ('ADMIN', 'HOD'))
  with check (auth_role() in ('ADMIN', 'HOD'));

-- fees: student reads own; admin manages all.
drop policy if exists "fees_select" on fees;
create policy "fees_select" on fees for select
  using (student_id = auth.uid() or auth_role() in ('ADMIN', 'HOD'));

drop policy if exists "fees_write_admin" on fees;
create policy "fees_write_admin" on fees for all
  using (auth_role() = 'ADMIN')
  with check (auth_role() = 'ADMIN');

drop policy if exists "fee_transactions_select" on fee_transactions;
create policy "fee_transactions_select" on fee_transactions for select
  using (
    auth_role() in ('ADMIN', 'HOD')
    or exists (select 1 from fees f where f.id = fee_id and f.student_id = auth.uid())
  );

drop policy if exists "fee_transactions_write_admin" on fee_transactions;
create policy "fee_transactions_write_admin" on fee_transactions for all
  using (auth_role() = 'ADMIN')
  with check (auth_role() = 'ADMIN');

-- ============================================================
-- AUTO-CREATE profile + qr_identity on signup
-- ============================================================
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'STUDENT'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  );
  insert into qr_identities (profile_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- STORAGE: notes bucket
-- Private bucket — downloads are served through an API route that
-- checks the `notes` table's RLS before generating a signed URL, so no
-- public SELECT policy on storage.objects is needed.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('notes', 'notes', false)
on conflict (id) do nothing;

drop policy if exists "notes_bucket_insert_faculty" on storage.objects;
create policy "notes_bucket_insert_faculty" on storage.objects for insert
  with check (bucket_id = 'notes' and auth_role() = 'FACULTY');

-- ============================================================
-- PHASE 4: Events, Announcements, Canteen, Lost & Found, Chat
-- ============================================================

do $$ begin
  create type announcement_category as enum ('EXAM', 'PLACEMENT', 'NEWS', 'GENERAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type canteen_order_status as enum ('PLACED', 'PREPARING', 'READY', 'COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lost_found_type as enum ('LOST', 'FOUND');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lost_found_status as enum ('OPEN', 'RESOLVED');
exception when duplicate_object then null; end $$;

-- ---------- Events & Announcements ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  event_time time,
  location text,
  organizer text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category announcement_category not null default 'GENERAL',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table events enable row level security;
alter table announcements enable row level security;

drop policy if exists "events_select_all" on events;
create policy "events_select_all" on events for select using (true);

drop policy if exists "events_write_staff" on events;
create policy "events_write_staff" on events for all
  using (auth_role() in ('ADMIN', 'HOD'))
  with check (auth_role() in ('ADMIN', 'HOD'));

drop policy if exists "announcements_select_all" on announcements;
create policy "announcements_select_all" on announcements for select using (true);

drop policy if exists "announcements_write_staff" on announcements;
create policy "announcements_write_staff" on announcements for all
  using (auth_role() in ('ADMIN', 'HOD'))
  with check (auth_role() in ('ADMIN', 'HOD'));

-- ---------- Canteen ----------
create table if not exists canteen_menu (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null,
  category text,
  available boolean not null default true
);

create table if not exists canteen_orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id),
  status canteen_order_status not null default 'PLACED',
  total_amount numeric(10, 2) not null,
  pickup_code text not null default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists canteen_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references canteen_orders(id) on delete cascade,
  menu_item_id uuid not null references canteen_menu(id),
  quantity int not null check (quantity > 0),
  price_at_order numeric(10, 2) not null
);

alter table canteen_menu enable row level security;
alter table canteen_orders enable row level security;
alter table canteen_order_items enable row level security;

drop policy if exists "canteen_menu_select_all" on canteen_menu;
create policy "canteen_menu_select_all" on canteen_menu for select using (true);

drop policy if exists "canteen_menu_write_staff" on canteen_menu;
create policy "canteen_menu_write_staff" on canteen_menu for all
  using (auth_role() in ('ADMIN', 'CANTEEN_STAFF'))
  with check (auth_role() in ('ADMIN', 'CANTEEN_STAFF'));

drop policy if exists "canteen_orders_select" on canteen_orders;
create policy "canteen_orders_select" on canteen_orders for select
  using (student_id = auth.uid() or auth_role() in ('ADMIN', 'CANTEEN_STAFF'));

drop policy if exists "canteen_orders_insert_own" on canteen_orders;
create policy "canteen_orders_insert_own" on canteen_orders for insert
  with check (student_id = auth.uid() and auth_role() = 'STUDENT');

drop policy if exists "canteen_orders_update_staff" on canteen_orders;
create policy "canteen_orders_update_staff" on canteen_orders for update
  using (auth_role() in ('ADMIN', 'CANTEEN_STAFF'));

drop policy if exists "canteen_order_items_select" on canteen_order_items;
create policy "canteen_order_items_select" on canteen_order_items for select
  using (
    auth_role() in ('ADMIN', 'CANTEEN_STAFF')
    or exists (
      select 1 from canteen_orders o where o.id = order_id and o.student_id = auth.uid()
    )
  );

drop policy if exists "canteen_order_items_insert_own" on canteen_order_items;
create policy "canteen_order_items_insert_own" on canteen_order_items for insert
  with check (
    exists (
      select 1 from canteen_orders o
      where o.id = order_id and o.student_id = auth.uid()
    )
  );

-- ---------- Lost & Found ----------
create table if not exists lost_found (
  id uuid primary key default gen_random_uuid(),
  type lost_found_type not null,
  title text not null,
  description text,
  location text,
  item_date date,
  image_path text,
  reported_by uuid not null references profiles(id),
  status lost_found_status not null default 'OPEN',
  created_at timestamptz not null default now()
);

alter table lost_found enable row level security;

drop policy if exists "lost_found_select_all" on lost_found;
create policy "lost_found_select_all" on lost_found for select using (true);

drop policy if exists "lost_found_insert_own" on lost_found;
create policy "lost_found_insert_own" on lost_found for insert
  with check (reported_by = auth.uid());

drop policy if exists "lost_found_update_own_or_staff" on lost_found;
create policy "lost_found_update_own_or_staff" on lost_found for update
  using (reported_by = auth.uid() or auth_role() in ('ADMIN', 'HOD'));

insert into storage.buckets (id, name, public)
values ('lost-found', 'lost-found', true)
on conflict (id) do nothing;

drop policy if exists "lost_found_bucket_insert_own" on storage.objects;
create policy "lost_found_bucket_insert_own" on storage.objects for insert
  with check (bucket_id = 'lost-found' and auth.uid() is not null);

drop policy if exists "lost_found_bucket_select_all" on storage.objects;
create policy "lost_found_bucket_select_all" on storage.objects for select
  using (bucket_id = 'lost-found');

-- ---------- Faculty-Student Chat ----------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id),
  faculty_id uuid not null references faculty(id),
  created_at timestamptz not null default now(),
  unique (student_id, faculty_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table conversations enable row level security;
alter table messages enable row level security;

create or replace function is_conversation_participant(p_conversation_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations
    where id = p_conversation_id
      and (student_id = auth.uid() or faculty_id = auth.uid())
  );
$$;

drop policy if exists "conversations_select" on conversations;
create policy "conversations_select" on conversations for select
  using (student_id = auth.uid() or faculty_id = auth.uid() or auth_role() = 'ADMIN');

drop policy if exists "conversations_insert" on conversations;
create policy "conversations_insert" on conversations for insert
  with check (
    (student_id = auth.uid() and auth_role() = 'STUDENT')
    or (faculty_id = auth.uid() and auth_role() = 'FACULTY')
  );

drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select
  using (is_conversation_participant(conversation_id) or auth_role() = 'ADMIN');

drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages for insert
  with check (sender_id = auth.uid() and is_conversation_participant(conversation_id));

-- Any participant (not just the sender) may update a message row, but
-- only to set read_at — a trigger below blocks tampering with content.
drop policy if exists "messages_update_own" on messages;
create policy "messages_update_own" on messages for update
  using (is_conversation_participant(conversation_id));

create or replace function prevent_message_content_edit() returns trigger
language plpgsql as $$
begin
  if new.content <> old.content
    or new.sender_id <> old.sender_id
    or new.conversation_id <> old.conversation_id
  then
    raise exception 'Only read_at may be updated on messages';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_restrict_update on messages;
create trigger messages_restrict_update
  before update on messages
  for each row execute function prevent_message_content_edit();

create index if not exists idx_messages_conversation on messages(conversation_id, created_at);
create index if not exists idx_canteen_orders_student on canteen_orders(student_id);
create index if not exists idx_lost_found_status on lost_found(status);

-- ============================================================
-- RESUME BUILDER
-- One draft per student. Skills/projects/achievements are freeform,
-- ordered, owner-only lists, so a JSONB array is a better fit here than
-- three extra join tables — Postgres still validates/queries it fine.
-- ============================================================
create table if not exists resumes (
  student_id uuid primary key references students(id) on delete cascade,
  headline text,
  summary text,
  skills jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table resumes enable row level security;

drop policy if exists "resumes_all_own" on resumes;
create policy "resumes_all_own" on resumes for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ============================================================
-- CAMPUS COINS
-- Balance is derived (sum of transactions), never stored directly, so
-- there is no balance column a student could ever write to themselves.
-- ============================================================
create table if not exists campus_coin_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  amount int not null,
  reason text not null,
  awarded_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table campus_coin_transactions enable row level security;

drop policy if exists "coins_select" on campus_coin_transactions;
create policy "coins_select" on campus_coin_transactions for select
  using (student_id = auth.uid() or auth_role() in ('ADMIN', 'HOD'));

drop policy if exists "coins_insert_admin" on campus_coin_transactions;
create policy "coins_insert_admin" on campus_coin_transactions for insert
  with check (auth_role() = 'ADMIN' and awarded_by = auth.uid());

-- ============================================================
-- POLLS
-- ============================================================
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null,
  active boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists poll_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  option_index int not null,
  created_at timestamptz not null default now(),
  unique (poll_id, student_id)
);

alter table polls enable row level security;
alter table poll_responses enable row level security;

drop policy if exists "polls_select_all" on polls;
create policy "polls_select_all" on polls for select using (true);

drop policy if exists "polls_insert_admin" on polls;
create policy "polls_insert_admin" on polls for insert
  with check (auth_role() = 'ADMIN' and created_by = auth.uid());

drop policy if exists "poll_responses_select_all" on poll_responses;
create policy "poll_responses_select_all" on poll_responses for select using (true);

drop policy if exists "poll_responses_insert_own" on poll_responses;
create policy "poll_responses_insert_own" on poll_responses for insert
  with check (student_id = auth.uid() and auth_role() = 'STUDENT');

-- ============================================================
-- PROJECT MATCHMAKING & TUTORING
-- ============================================================
do $$ begin
  create type project_status as enum ('OPEN', 'CLOSED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tutoring_type as enum ('REQUEST', 'OFFER');
exception when duplicate_object then null; end $$;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  skills_needed text,
  posted_by uuid not null references profiles(id),
  status project_status not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table if not exists tutoring (
  id uuid primary key default gen_random_uuid(),
  type tutoring_type not null,
  subject text not null,
  description text,
  posted_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table tutoring enable row level security;

drop policy if exists "projects_select_all" on projects;
create policy "projects_select_all" on projects for select using (true);

drop policy if exists "projects_insert_own" on projects;
create policy "projects_insert_own" on projects for insert
  with check (posted_by = auth.uid());

drop policy if exists "projects_update_own" on projects;
create policy "projects_update_own" on projects for update
  using (posted_by = auth.uid());

drop policy if exists "tutoring_select_all" on tutoring;
create policy "tutoring_select_all" on tutoring for select using (true);

drop policy if exists "tutoring_insert_own" on tutoring;
create policy "tutoring_insert_own" on tutoring for insert
  with check (posted_by = auth.uid());

drop policy if exists "tutoring_delete_own" on tutoring;
create policy "tutoring_delete_own" on tutoring for delete
  using (posted_by = auth.uid());

-- ============================================================
-- CAMPUS MARKETPLACE
-- ============================================================
do $$ begin
  create type marketplace_status as enum ('AVAILABLE', 'SOLD');
exception when duplicate_object then null; end $$;

create table if not exists marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric(10, 2) not null,
  category text not null,
  condition text,
  image_path text,
  seller_id uuid not null references profiles(id),
  status marketplace_status not null default 'AVAILABLE',
  created_at timestamptz not null default now()
);

alter table marketplace_listings enable row level security;

drop policy if exists "marketplace_select_all" on marketplace_listings;
create policy "marketplace_select_all" on marketplace_listings for select using (true);

drop policy if exists "marketplace_insert_own" on marketplace_listings;
create policy "marketplace_insert_own" on marketplace_listings for insert
  with check (seller_id = auth.uid());

drop policy if exists "marketplace_update_own" on marketplace_listings;
create policy "marketplace_update_own" on marketplace_listings for update
  using (seller_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict (id) do nothing;

drop policy if exists "marketplace_bucket_insert_own" on storage.objects;
create policy "marketplace_bucket_insert_own" on storage.objects for insert
  with check (bucket_id = 'marketplace' and auth.uid() is not null);

drop policy if exists "marketplace_bucket_select_all" on storage.objects;
create policy "marketplace_bucket_select_all" on storage.objects for select
  using (bucket_id = 'marketplace');

-- ============================================================
-- TRANSPORT
-- MVP simplification: route/stop info is static data admins enter, not
-- live GPS. Never presented as real-time tracking (per the project spec).
-- ============================================================
create table if not exists transport_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bus_number text not null,
  driver_id uuid references profiles(id),
  stops text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists transport_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  route_id uuid not null references transport_routes(id) on delete cascade,
  unique (student_id, route_id)
);

create table if not exists boarding_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id),
  route_id uuid not null references transport_routes(id),
  boarded_at timestamptz not null default now(),
  verified_by uuid not null references profiles(id)
);

alter table transport_routes enable row level security;
alter table transport_assignments enable row level security;
alter table boarding_records enable row level security;

drop policy if exists "transport_routes_select_all" on transport_routes;
create policy "transport_routes_select_all" on transport_routes for select using (true);

drop policy if exists "transport_routes_write_admin" on transport_routes;
create policy "transport_routes_write_admin" on transport_routes for all
  using (auth_role() = 'ADMIN')
  with check (auth_role() = 'ADMIN');

drop policy if exists "transport_assignments_select" on transport_assignments;
create policy "transport_assignments_select" on transport_assignments for select
  using (
    student_id = auth.uid()
    or auth_role() = 'ADMIN'
    or exists (
      select 1 from transport_routes r
      where r.id = route_id and r.driver_id = auth.uid()
    )
  );

drop policy if exists "transport_assignments_write_admin" on transport_assignments;
create policy "transport_assignments_write_admin" on transport_assignments for all
  using (auth_role() = 'ADMIN')
  with check (auth_role() = 'ADMIN');

drop policy if exists "boarding_records_select" on boarding_records;
create policy "boarding_records_select" on boarding_records for select
  using (
    student_id = auth.uid()
    or auth_role() = 'ADMIN'
    or exists (
      select 1 from transport_routes r
      where r.id = route_id and r.driver_id = auth.uid()
    )
  );

drop policy if exists "boarding_records_insert_driver" on boarding_records;
create policy "boarding_records_insert_driver" on boarding_records for insert
  with check (
    verified_by = auth.uid()
    and auth_role() = 'BUS_DRIVER'
    and exists (
      select 1 from transport_routes r
      where r.id = route_id and r.driver_id = auth.uid()
    )
  );
