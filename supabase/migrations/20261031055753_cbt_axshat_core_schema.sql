/*
# CBT AXSHAT core schema

1. New Tables
- `school_years`: Tahun Pelajaran list managed by the administrator. Exactly one year can be active (shown to students).
- `app_settings`: key/value store for application secrets such as the administrator password hash.
- `teacher_access`: per-teacher overrides set by the administrator (enabled/disabled, custom password hash). Teachers without a row use the defaults.
- `exam_entries`: one row per subject exam link created by a teacher for a school year, class and sub-menu, with a visibility toggle for students.
- `sessions`: hashed login tokens for administrator and teacher sessions.

2. Security
- Row level security is enabled on every table with no policies and no grants to anon or authenticated.
- Only the service role (used by the cbt-api edge function) can read or write these tables, so passwords, tokens and exam data are never reachable directly from the browser.

3. Seed data
- Creates the initial school year 2026/2027 as active. Re-running is safe.

4. Important notes
- No data is dropped or modified by this migration.
- Statements are idempotent (IF NOT EXISTS / ON CONFLICT).
*/

CREATE TABLE IF NOT EXISTS school_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_years_one_active_idx ON school_years (is_active) WHERE is_active;

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_access (
  username text PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  password_hash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id uuid NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  teacher_username text NOT NULL,
  kelas text NOT NULL,
  submenu text NOT NULL CHECK (submenu IN ('Sumatif Lingkup Materi', 'STS Ganjil', 'STS Genap', 'SAS Ganjil', 'SAS Genap', 'USP')),
  mata_pelajaran text NOT NULL,
  form_url text NOT NULL,
  is_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_year_id, teacher_username, kelas, submenu, mata_pelajaran)
);

CREATE INDEX IF NOT EXISTS exam_entries_year_kelas_idx ON exam_entries (school_year_id, kelas);
CREATE INDEX IF NOT EXISTS exam_entries_teacher_idx ON exam_entries (teacher_username);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('admin', 'teacher')),
  username text NOT NULL,
  expires_at timestamptz NOT NULL
);

ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON school_years, app_settings, teacher_access, exam_entries, sessions TO service_role;

INSERT INTO school_years (label, is_active)
VALUES ('2026/2027', true)
ON CONFLICT (label) DO NOTHING;
