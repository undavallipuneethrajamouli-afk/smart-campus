-- Smart Campus — DEMO seed data (not real users/records).
-- Run in Supabase SQL Editor AFTER schema.sql.
-- Safe to re-run: uses ON CONFLICT DO NOTHING.

insert into departments (name, code) values
  ('Computer Science & Engineering', 'CSE'),
  ('Electronics & Communication', 'ECE'),
  ('Mechanical Engineering', 'MECH'),
  ('Civil Engineering', 'CIVIL'),
  ('Business Administration', 'MBA')
on conflict (code) do nothing;

insert into subjects (name, code, department_id, semester)
select v.name, v.code, d.id, v.semester
from (values
  ('Data Structures', 'CSE201', 'CSE', 3),
  ('Database Management Systems', 'CSE301', 'CSE', 5),
  ('Operating Systems', 'CSE302', 'CSE', 5),
  ('Computer Networks', 'CSE401', 'CSE', 7),
  ('Digital Electronics', 'ECE201', 'ECE', 3)
) as v(name, code, dept_code, semester)
join departments d on d.code = v.dept_code
on conflict (code) do nothing;
