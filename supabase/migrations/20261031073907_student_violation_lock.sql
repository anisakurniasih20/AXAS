/*
# Student exam violation tracking and lock

1. New Tables
- `student_violations`: one row per student (identified by tingkat, kelas and nama from the student sheets).
  - `tingkat` (text, VII/VIII/IX), `kelas` (text), `nama` (text)
  - `violation_count` (integer, default 0): how many times the student left the exam screen
  - `is_locked` (boolean, default false): true once the student reaches 3 violations
  - `last_violation_at` (timestamptz, nullable)
  - `updated_at` (timestamptz, default now())
  - Unique on (tingkat, kelas, nama)

2. Security
- Enable RLS on `student_violations`.
- No grants to `anon` or `authenticated`. The table is only read and written by the `cbt-api` edge function using the service role.

3. Notes
- Lock state lives in this table so it survives page reloads and new devices.
- Unlocking resets `violation_count` to 0 and `is_locked` to false.
*/

CREATE TABLE IF NOT EXISTS student_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tingkat text NOT NULL CHECK (tingkat IN ('VII', 'VIII', 'IX')),
  kelas text NOT NULL,
  nama text NOT NULL,
  violation_count integer NOT NULL DEFAULT 0 CHECK (violation_count >= 0),
  is_locked boolean NOT NULL DEFAULT false,
  last_violation_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tingkat, kelas, nama)
);

ALTER TABLE student_violations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON student_violations TO service_role;
