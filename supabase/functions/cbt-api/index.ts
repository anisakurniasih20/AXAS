import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GURU_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1VtWlrTCbdqgQaidxYrLv6zhanTbIfIStM1fT8WE50cM/export?format=csv&gid=0";
const SISWA_SHEET_ID = "1fbXIBHI5y7iKikMEAsX__cMMrt0CsEQYJE6KtBXH7RE";
const TINGKAT_SHEETS = [
  { tingkat: "VII", sheet: "Kelas VII" },
  { tingkat: "VIII", sheet: "Kelas VIII" },
  { tingkat: "IX", sheet: "Kelas IX" },
];

const ADMIN_USERNAME = "Administrator";
const ADMIN_DEFAULT_PASSWORD = "CBT-AXSHAT";
const PBKDF2_ITERATIONS = 100000;
const SESSION_HOURS = 12;
const VIOLATION_LIMIT = 3;
const MIN_PASSWORD_LENGTH = 8;
const SUBMENUS = [
  "Sumatif Lingkup Materi",
  "STS Ganjil",
  "STS Genap",
  "SAS Ganjil",
  "SAS Genap",
  "USP",
];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${hash}`;
}

async function verifyPassword(password: string, stored: string | null, defaultPassword: string): Promise<boolean> {
  if (!stored) return password === defaultPassword;
  const [, iterations, saltHex, expected] = stored.split("$");
  const actual = await derivePbkdf2(password, fromHex(saltHex), Number(iterations));
  return actual === expected;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

async function fetchCsv(url: string): Promise<string[][]> {
  const res = await fetch(url);
  if (!res.ok) throw new HttpError(502, "Data sekolah tidak dapat dibaca saat ini. Coba lagi nanti.");
  const rows = parseCsv(await res.text());
  if (rows.length === 0) throw new HttpError(502, "Data sekolah kosong atau tidak dapat dibaca.");
  return rows;
}

function findColumn(header: string[], pattern: RegExp, sheetName: string): number {
  const index = header.findIndex((h) => pattern.test(h));
  if (index < 0) throw new HttpError(502, `Kolom yang dibutuhkan tidak ditemukan di ${sheetName}.`);
  return index;
}

type SheetTeacher = { username: string; password: string };

async function loadSheetTeachers(): Promise<SheetTeacher[]> {
  const [header, ...body] = await fetchCsv(GURU_CSV_URL);
  const userCol = findColumn(header, /^\s*username\s*$/i, "data guru");
  const passCol = findColumn(header, /^\s*password\s*$/i, "data guru");
  return body
    .map((r) => ({ username: (r[userCol] ?? "").trim(), password: (r[passCol] ?? "").trim() }))
    .filter((t) => t.username !== "");
}

type ManualTeacher = {
  id: string;
  full_name: string;
  username: string;
  password_hash: string;
  subjects: string[];
};

async function loadManualTeachers(): Promise<ManualTeacher[]> {
  const { data, error } = await supabase
    .from("manual_teachers")
    .select("id, full_name, username, password_hash, subjects")
    .order("username", { ascending: true });
  if (error) throw error;
  return data;
}

type Student = { tingkat: string; kelas: string; nama: string };

async function loadRoster(): Promise<Student[]> {
  const groups = await Promise.all(
    TINGKAT_SHEETS.map(async ({ tingkat, sheet }) => {
      const url = `https://docs.google.com/spreadsheets/d/${SISWA_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
      const [header, ...body] = await fetchCsv(url);
      const namaCol = findColumn(header, /nama|username/i, `sheet ${sheet}`);
      const kelasCol = findColumn(header, /kelas/i, `sheet ${sheet}`);
      return body
        .map((r) => ({ tingkat, kelas: (r[kelasCol] ?? "").trim(), nama: (r[namaCol] ?? "").trim() }))
        .filter((s) => s.kelas && s.nama);
    }),
  );
  return groups.flat();
}

async function assertRegisteredTeacher(username: string): Promise<string> {
  const key = username.toLowerCase();
  const [sheet, manual] = await Promise.all([loadSheetTeachers(), loadManualTeachers()]);
  const match = sheet.find((t) => t.username.toLowerCase() === key) ?? manual.find((t) => t.username.toLowerCase() === key);
  if (!match) throw new HttpError(404, "Guru tidak ditemukan di data sekolah.");
  return match.username;
}

async function verifyTeacherLogin(username: string, password: string): Promise<string | null> {
  const key = username.toLowerCase();
  const [sheet, manual] = await Promise.all([loadSheetTeachers(), loadManualTeachers()]);
  const fromSheet = sheet.find((t) => t.username.toLowerCase() === key);
  if (fromSheet) return password !== "" && password === fromSheet.password ? fromSheet.username : null;
  const fromManual = manual.find((t) => t.username.toLowerCase() === key);
  if (!fromManual) return null;
  return (await verifyPassword(password, fromManual.password_hash, "")) ? fromManual.username : null;
}

function str(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.trim() === "") throw new HttpError(400, `${field} wajib diisi.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpError(400, `${field} maksimal ${max} karakter.`);
  return trimmed;
}

function validFormUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, "Link Google Form tidak valid.");
  }
  if (url.protocol !== "https:") throw new HttpError(400, "Link Google Form harus diawali https://");
  return url.toString();
}

async function createSession(role: "admin" | "teacher", username: string): Promise<string> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  const { error } = await supabase.from("sessions").insert({
    token_hash: await sha256Hex(token),
    role,
    username,
    expires_at: expiresAt,
  });
  if (error) throw error;
  return token;
}

async function requireSession(token: unknown, role?: "admin" | "teacher") {
  if (typeof token !== "string" || token === "") throw new HttpError(401, "Sesi berakhir. Silakan login ulang.");
  const { data, error } = await supabase
    .from("sessions")
    .select("role, username, expires_at")
    .eq("token_hash", await sha256Hex(token))
    .maybeSingle();
  if (error) throw error;
  if (!data || new Date(data.expires_at) < new Date()) {
    throw new HttpError(401, "Sesi berakhir. Silakan login ulang.");
  }
  if (role && data.role !== role) throw new HttpError(403, "Anda tidak memiliki akses ke fitur ini.");
  return { role: data.role as "admin" | "teacher", username: data.username as string };
}

async function getAdminHash(): Promise<string | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "admin_password_hash")
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

async function login(payload: Record<string, unknown>) {
  const role = payload.role;
  const password = typeof payload.password === "string" ? payload.password : "";
  if (role === "admin") {
    const username = str(payload.username, "Username", 50);
    const ok =
      username.toLowerCase() === ADMIN_USERNAME.toLowerCase() &&
      (await verifyPassword(password, await getAdminHash(), ADMIN_DEFAULT_PASSWORD));
    if (!ok) throw new HttpError(401, "Username atau password salah.");
    return { token: await createSession("admin", ADMIN_USERNAME), role: "admin", username: ADMIN_USERNAME };
  }
  if (role === "teacher") {
    const username = str(payload.username, "Username", 100);
    const teacher = await verifyTeacherLogin(username, password);
    if (!teacher) throw new HttpError(401, "Username atau password salah.");
    const { data: access, error } = await supabase
      .from("teacher_access")
      .select("is_enabled")
      .eq("username", teacher)
      .maybeSingle();
    if (error) throw error;
    if (access && !access.is_enabled) {
      throw new HttpError(403, "Akses Anda dinonaktifkan. Hubungi administrator.");
    }
    return { token: await createSession("teacher", teacher), role: "teacher", username: teacher };
  }
  throw new HttpError(400, "Peran login tidak dikenal.");
}

async function listYears() {
  const { data, error } = await supabase
    .from("school_years")
    .select("id, label, is_active")
    .order("label", { ascending: false });
  if (error) throw error;
  return { years: data.map((y) => ({ id: y.id, label: y.label, isActive: y.is_active })) };
}

function studentIdentity(payload: Record<string, unknown>) {
  const tingkat = str(payload.tingkat, "Tingkat", 10);
  if (!TINGKAT_SHEETS.some((s) => s.tingkat === tingkat)) throw new HttpError(400, "Tingkat tidak valid.");
  return { tingkat, kelas: str(payload.kelas, "Kelas", 20), nama: str(payload.nama, "Nama", 100) };
}

async function findViolation(identity: { tingkat: string; kelas: string; nama: string }) {
  const { data, error } = await supabase
    .from("student_violations")
    .select("violation_count, is_locked")
    .eq("tingkat", identity.tingkat)
    .eq("kelas", identity.kelas)
    .eq("nama", identity.nama)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function studentExams(payload: Record<string, unknown>) {
  const identity = studentIdentity(payload);
  const violation = await findViolation(identity);
  if (violation?.is_locked) return { schoolYear: null, exams: [], locked: true };
  const { data: year, error: yearError } = await supabase
    .from("school_years")
    .select("id, label")
    .eq("is_active", true)
    .maybeSingle();
  if (yearError) throw yearError;
  if (!year) return { schoolYear: null, exams: [], locked: false };
  const { data, error } = await supabase
    .from("exam_entries")
    .select("id, submenu, mata_pelajaran, form_url")
    .eq("school_year_id", year.id)
    .eq("kelas", identity.tingkat)
    .eq("is_visible", true)
    .order("mata_pelajaran", { ascending: true });
  if (error) throw error;
  return {
    schoolYear: year.label,
    exams: data.map((e) => ({ id: e.id, submenu: e.submenu, mataPelajaran: e.mata_pelajaran, formUrl: e.form_url })),
    locked: false,
  };
}

async function reportViolation(payload: Record<string, unknown>) {
  const identity = studentIdentity(payload);
  const roster = await loadRoster();
  const isStudent = roster.some(
    (s) => s.tingkat === identity.tingkat && s.kelas === identity.kelas && s.nama === identity.nama,
  );
  if (!isStudent) throw new HttpError(404, "Data siswa tidak ditemukan.");
  const current = await findViolation(identity);
  if (current?.is_locked) return { violationCount: current.violation_count, locked: true };
  const violationCount = (current?.violation_count ?? 0) + 1;
  const locked = violationCount >= VIOLATION_LIMIT;
  const now = new Date().toISOString();
  const { error } = await supabase.from("student_violations").upsert(
    { ...identity, violation_count: violationCount, is_locked: locked, last_violation_at: now, updated_at: now },
    { onConflict: "tingkat,kelas,nama" },
  );
  if (error) throw error;
  return { violationCount, locked };
}

async function violationList() {
  const { data, error } = await supabase
    .from("student_violations")
    .select("id, tingkat, kelas, nama, violation_count, is_locked, last_violation_at")
    .gt("violation_count", 0)
    .order("is_locked", { ascending: false })
    .order("violation_count", { ascending: false })
    .order("nama", { ascending: true });
  if (error) throw error;
  return {
    violations: data.map((v) => ({
      id: v.id as string,
      tingkat: v.tingkat as string,
      kelas: v.kelas as string,
      nama: v.nama as string,
      violationCount: v.violation_count as number,
      isLocked: v.is_locked as boolean,
      lastViolationAt: v.last_violation_at as string | null,
    })),
  };
}

async function resetViolation(payload: Record<string, unknown>) {
  const id = str(payload.id, "Data pelanggaran", 60);
  const { data, error } = await supabase
    .from("student_violations")
    .update({ violation_count: 0, is_locked: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Data pelanggaran tidak ditemukan.");
  return { ok: true };
}

function mapExam(e: Record<string, any>) {
  return {
    id: e.id as string,
    schoolYearId: e.school_year_id as string,
    schoolYear: (e.school_years?.label ?? null) as string | null,
    teacher: e.teacher_username as string,
    kelas: e.kelas as string,
    submenu: e.submenu as string,
    mataPelajaran: e.mata_pelajaran as string,
    formUrl: e.form_url as string,
    isVisible: e.is_visible as boolean,
    updatedAt: e.updated_at as string,
  };
}

function examInput(payload: Record<string, unknown>) {
  const submenu = str(payload.submenu, "Sub-menu ujian", 50);
  if (!SUBMENUS.includes(submenu)) throw new HttpError(400, "Sub-menu ujian tidak valid.");
  const kelas = str(payload.kelas, "Kelas", 10);
  if (!TINGKAT_SHEETS.some((s) => s.tingkat === kelas)) throw new HttpError(400, "Kelas tidak valid.");
  return {
    kelas,
    submenu,
    mata_pelajaran: str(payload.mataPelajaran, "Mata pelajaran", 100),
    form_url: validFormUrl(str(payload.formUrl, "Link Google Form", 2000)),
  };
}

async function teacherExams(session: { username: string }, payload: Record<string, unknown>) {
  const schoolYearId = str(payload.schoolYearId, "Tahun pelajaran", 60);
  const { data, error } = await supabase
    .from("exam_entries")
    .select("*, school_years(label)")
    .eq("school_year_id", schoolYearId)
    .eq("teacher_username", session.username)
    .order("mata_pelajaran", { ascending: true });
  if (error) throw error;
  return { exams: data.map(mapExam) };
}

async function saveExam(session: { username: string }, payload: Record<string, unknown>) {
  const values = examInput(payload);
  const id = typeof payload.id === "string" && payload.id ? payload.id : null;
  const schoolYearId = str(payload.schoolYearId, "Tahun pelajaran", 60);
  const { data, error } = id
    ? await supabase
        .from("exam_entries")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("teacher_username", session.username)
        .select("*, school_years(label)")
        .maybeSingle()
    : await supabase
        .from("exam_entries")
        .insert({ ...values, school_year_id: schoolYearId, teacher_username: session.username })
        .select("*, school_years(label)")
        .single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "Mata pelajaran ini sudah ada untuk kelas dan sub-menu tersebut.");
    if (error.code === "23503") throw new HttpError(400, "Tahun pelajaran tidak ditemukan.");
    throw error;
  }
  if (!data) throw new HttpError(404, "Data soal tidak ditemukan.");
  return { exam: mapExam(data) };
}

async function setVisibility(session: { username: string }, payload: Record<string, unknown>) {
  const id = str(payload.id, "Soal", 60);
  if (typeof payload.visible !== "boolean") throw new HttpError(400, "Status tampil tidak valid.");
  const { data, error } = await supabase
    .from("exam_entries")
    .update({ is_visible: payload.visible, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("teacher_username", session.username)
    .select("*, school_years(label)")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Data soal tidak ditemukan.");
  return { exam: mapExam(data) };
}

async function adminSetVisibility(payload: Record<string, unknown>) {
  const id = str(payload.id, "Soal", 60);
  if (typeof payload.visible !== "boolean") throw new HttpError(400, "Status tampil tidak valid.");
  const { data, error } = await supabase
    .from("exam_entries")
    .update({ is_visible: payload.visible, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, school_years(label)")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Data soal tidak ditemukan.");
  return { exam: mapExam(data) };
}

function embeddedFormUrl(value: string): string {
  const url = new URL(value);
  if (url.pathname.endsWith("/viewform")) url.searchParams.set("embedded", "true");
  return url.toString();
}

async function adminSaveExam(payload: Record<string, unknown>) {
  const id = str(payload.id, "Soal", 60);
  const values = examInput(payload);
  const { data, error } = await supabase
    .from("exam_entries")
    .update({ ...values, form_url: embeddedFormUrl(values.form_url), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, school_years(label)")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "Mata pelajaran ini sudah ada untuk kelas dan sub-menu tersebut.");
    throw error;
  }
  if (!data) throw new HttpError(404, "Data soal tidak ditemukan.");
  return { exam: mapExam(data) };
}

async function teacherDeleteExam(session: { username: string }, payload: Record<string, unknown>) {
  const id = str(payload.id, "Soal", 60);
  const { data, error } = await supabase
    .from("exam_entries")
    .delete()
    .eq("id", id)
    .eq("teacher_username", session.username)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Data soal tidak ditemukan.");
  return { ok: true };
}

async function adminDeleteExam(payload: Record<string, unknown>) {
  const id = str(payload.id, "Soal", 60);
  const { data, error } = await supabase.from("exam_entries").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Data soal tidak ditemukan.");
  return { ok: true };
}

async function createYear(payload: Record<string, unknown>) {
  const label = str(payload.label, "Tahun pelajaran", 20);
  const { data, error } = await supabase
    .from("school_years")
    .insert({ label, is_active: false })
    .select("id, label, is_active")
    .single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "Tahun pelajaran tersebut sudah ada.");
    throw error;
  }
  return { year: { id: data.id, label: data.label, isActive: data.is_active } };
}

async function updateYear(payload: Record<string, unknown>) {
  const id = str(payload.id, "Tahun pelajaran", 60);
  const label = str(payload.label, "Tahun pelajaran", 20);
  const { data, error } = await supabase
    .from("school_years")
    .update({ label })
    .eq("id", id)
    .select("id, label, is_active")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "Tahun pelajaran tersebut sudah ada.");
    throw error;
  }
  if (!data) throw new HttpError(404, "Tahun pelajaran tidak ditemukan.");
  return { year: { id: data.id, label: data.label, isActive: data.is_active } };
}

async function activateYear(payload: Record<string, unknown>) {
  const id = str(payload.id, "Tahun pelajaran", 60);
  const { error: clearError } = await supabase
    .from("school_years")
    .update({ is_active: false })
    .eq("is_active", true);
  if (clearError) throw clearError;
  const { data, error } = await supabase
    .from("school_years")
    .update({ is_active: true })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Tahun pelajaran tidak ditemukan.");
  return listYears();
}

async function monitorExams() {
  const { data, error } = await supabase
    .from("exam_entries")
    .select("*, school_years(label)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return { exams: data.map(mapExam) };
}

async function teacherAccess() {
  const [sheet, manual, { data, error }] = await Promise.all([
    loadSheetTeachers(),
    loadManualTeachers(),
    supabase.from("teacher_access").select("username, is_enabled"),
  ]);
  if (error) throw error;
  const enabledByName = new Map(data.map((a) => [a.username.toLowerCase(), a.is_enabled as boolean]));
  const sheetNames = [...new Map(sheet.map((t) => [t.username.toLowerCase(), t.username])).values()];
  const teachers = [
    ...sheetNames.map((username) => ({ username, fullName: null as string | null, subjects: [] as string[], source: "sheet" as const })),
    ...manual.map((t) => ({ username: t.username, fullName: t.full_name, subjects: t.subjects, source: "manual" as const })),
  ];
  return {
    teachers: teachers.map((t) => ({ ...t, isEnabled: enabledByName.get(t.username.toLowerCase()) ?? true })),
  };
}

async function setTeacherEnabled(payload: Record<string, unknown>) {
  const username = await assertRegisteredTeacher(str(payload.username, "Username guru", 100));
  if (typeof payload.enabled !== "boolean") throw new HttpError(400, "Status akses tidak valid.");
  const { error } = await supabase
    .from("teacher_access")
    .upsert({ username, is_enabled: payload.enabled, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { ok: true };
}

async function createTeacher(payload: Record<string, unknown>) {
  const fullName = str(payload.fullName, "Nama guru", 100);
  const username = str(payload.username, "Username", 50);
  if (!/^[A-Za-z0-9._-]+$/.test(username)) {
    throw new HttpError(400, "Username hanya boleh berisi huruf, angka, titik, strip, atau garis bawah.");
  }
  const password = typeof payload.password === "string" ? payload.password : "";
  if (password.length < MIN_PASSWORD_LENGTH) throw new HttpError(400, `Password guru minimal ${MIN_PASSWORD_LENGTH} karakter.`);
  const requested: unknown[] = Array.isArray(payload.subjects) ? payload.subjects : [];
  const subjects = [...new Set(requested)];
  if (subjects.length === 0) throw new HttpError(400, "Pilih minimal satu mata pelajaran.");
  const { data: subjectRows, error: subjectError } = await supabase.from("subjects").select("name");
  if (subjectError) throw subjectError;
  const allowed = new Set(subjectRows.map((s) => s.name as string));
  if (subjects.some((s) => typeof s !== "string" || !allowed.has(s))) {
    throw new HttpError(400, "Mata pelajaran tidak valid.");
  }
  const sheet = await loadSheetTeachers();
  if (sheet.some((t) => t.username.toLowerCase() === username.toLowerCase())) {
    throw new HttpError(409, "Username sudah terdaftar di data sekolah.");
  }
  const { error } = await supabase.from("manual_teachers").insert({
    full_name: fullName,
    username,
    password_hash: await hashPassword(password),
    subjects,
  });
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "Username sudah terdaftar.");
    throw error;
  }
  return { ok: true };
}

async function subjectsList() {
  const { data, error } = await supabase.from("subjects").select("id, name").order("name", { ascending: true });
  if (error) throw error;
  return { subjects: data };
}

async function createSubject(payload: Record<string, unknown>) {
  const name = str(payload.name, "Nama mata pelajaran", 100);
  const { data, error } = await supabase.from("subjects").insert({ name }).select("id, name").single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "Mata pelajaran tersebut sudah ada.");
    throw error;
  }
  return { subject: data };
}

async function updateSubject(payload: Record<string, unknown>) {
  const id = str(payload.id, "Mata pelajaran", 60);
  const name = str(payload.name, "Nama mata pelajaran", 100);
  const { data: current, error: currentError } = await supabase
    .from("subjects")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) throw new HttpError(404, "Mata pelajaran tidak ditemukan.");
  const { data, error } = await supabase
    .from("subjects")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name")
    .single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "Mata pelajaran tersebut sudah ada.");
    throw error;
  }
  if (current.name !== name) {
    const { error: renameError } = await supabase
      .from("exam_entries")
      .update({ mata_pelajaran: name })
      .eq("mata_pelajaran", current.name);
    if (renameError) throw renameError;
  }
  return { subject: data };
}

async function deleteSubject(payload: Record<string, unknown>) {
  const id = str(payload.id, "Mata pelajaran", 60);
  const { data, error } = await supabase.from("subjects").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Mata pelajaran tidak ditemukan.");
  return { ok: true };
}


async function changeAdminPassword(payload: Record<string, unknown>) {
  const oldPassword = typeof payload.oldPassword === "string" ? payload.oldPassword : "";
  const newPassword = str(payload.newPassword, "Password baru", 100);
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`);
  }
  const ok = await verifyPassword(oldPassword, await getAdminHash(), ADMIN_DEFAULT_PASSWORD);
  if (!ok) throw new HttpError(401, "Password lama tidak sesuai.");
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "admin_password_hash", value: await hashPassword(newPassword), updated_at: new Date().toISOString() });
  if (error) throw error;
  return { ok: true };
}

async function logout(token: unknown) {
  if (typeof token !== "string" || token === "") return { ok: true };
  const { error } = await supabase.from("sessions").delete().eq("token_hash", await sha256Hex(token));
  if (error) throw error;
  return { ok: true };
}

async function handle(action: string, token: unknown, payload: Record<string, unknown>) {
  switch (action) {
    case "roster": {
      const students = await loadRoster();
      return { students };
    }
    case "login":
      return login(payload);
    case "logout":
      return logout(token);
    case "student_exams":
      return studentExams(payload);
    case "report_violation":
      return reportViolation(payload);
    case "violation_list":
      await requireSession(token, "admin");
      return violationList();
    case "violation_reset":
      await requireSession(token, "admin");
      return resetViolation(payload);
    case "years_list":
      await requireSession(token);
      return listYears();
    case "teacher_exams": {
      const session = await requireSession(token, "teacher");
      return teacherExams(session, payload);
    }
    case "save_exam": {
      const session = await requireSession(token, "teacher");
      return saveExam(session, payload);
    }
    case "set_visibility": {
      const session = await requireSession(token, "teacher");
      return setVisibility(session, payload);
    }
    case "teacher_delete_exam": {
      const session = await requireSession(token, "teacher");
      return teacherDeleteExam(session, payload);
    }
    case "admin_set_visibility":
      await requireSession(token, "admin");
      return adminSetVisibility(payload);
    case "admin_save_exam":
      await requireSession(token, "admin");
      return adminSaveExam(payload);
    case "admin_delete_exam":
      await requireSession(token, "admin");
      return adminDeleteExam(payload);
    case "year_create":
      await requireSession(token, "admin");
      return createYear(payload);
    case "year_update":
      await requireSession(token, "admin");
      return updateYear(payload);
    case "year_activate":
      await requireSession(token, "admin");
      return activateYear(payload);
    case "monitor_exams":
      await requireSession(token, "admin");
      return monitorExams();
    case "teacher_access":
      await requireSession(token, "admin");
      return teacherAccess();
    case "set_teacher_enabled":
      await requireSession(token, "admin");
      return setTeacherEnabled(payload);
    case "subjects_list":
      await requireSession(token);
      return subjectsList();
    case "subject_create":
      await requireSession(token, "admin");
      return createSubject(payload);
    case "subject_update":
      await requireSession(token, "admin");
      return updateSubject(payload);
    case "subject_delete":
      await requireSession(token, "admin");
      return deleteSubject(payload);
    case "teacher_create":
      await requireSession(token, "admin");
      return createTeacher(payload);
    case "change_admin_password":
      await requireSession(token, "admin");
      return changeAdminPassword(payload);
    default:
      throw new HttpError(400, "Permintaan tidak dikenal.");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
    const result = await handle(action, body?.token, payload);
    return json(result);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "Terjadi kesalahan pada server. Silakan coba lagi." }, 500);
  }
});
