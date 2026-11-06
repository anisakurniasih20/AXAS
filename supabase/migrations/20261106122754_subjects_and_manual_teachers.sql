/*
# Subjects list and admin-added teachers

1. New Tables
- `subjects`: daftar mata pelajaran yang dikelola admin. Columns: id, name (unik tanpa memperhatikan huruf besar/kecil), created_at, updated_at.
- `manual_teachers`: data guru yang ditambahkan admin secara manual. Columns: id, full_name (Nama Guru), username (unik), password_hash (password disimpan dalam bentuk hash), subjects (daftar mata pelajaran yang diampu), created_at.

2. Seed data
- Mengisi `subjects` dengan 11 mata pelajaran awal. Baris yang sudah ada tidak diduplikasi.

3. Security
- RLS diaktifkan pada kedua tabel tanpa policy untuk peran publik. Seluruh akses dilakukan lewat server (service role), sehingga browser tidak bisa membaca atau menulis langsung.
- Hanya service_role yang diberi hak akses.

4. Notes
- Password guru tidak pernah disimpan dalam bentuk teks biasa.
- Migrasi ini idempotent dan aman dijalankan ulang.
*/

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subjects_name_lower_key ON subjects (lower(name));

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON subjects TO service_role;

INSERT INTO subjects (name)
SELECT v.name
FROM (VALUES
  ('Bahasa Indonesia'),
  ('Pendidikan Agama dan Budi Pekerti (PABP)'),
  ('Pendidikan Pancasila'),
  ('Ilmu Pengetahuan Alam (IPA)'),
  ('Ilmu Pengetahuan Sosial (IPS)'),
  ('Matematika'),
  ('Bahasa Inggris'),
  ('Seni Budaya dan Prakarya (SBDP)'),
  ('Pendidikan Jasmani dan Olah Raga (PJOK)'),
  ('Informatika'),
  ('Bahasa Sunda')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM subjects s WHERE lower(s.name) = lower(v.name));

CREATE TABLE IF NOT EXISTS manual_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  subjects text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS manual_teachers_username_lower_key ON manual_teachers (lower(username));

ALTER TABLE manual_teachers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON manual_teachers TO service_role;
