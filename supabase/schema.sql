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
  using (profile_id = auth.uid() or auth_role() in ('ADMIN', 'HOD', 'FACULTY'));

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
