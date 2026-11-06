import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Search, UserCheck, UserX } from "lucide-react";
import { callApi, ApiError } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";

type TeacherAccess = { username: string; isEnabled: boolean; hasCustomPassword: boolean };

export function AccessPanel({ token }: { token: string }) {
  const [teachers, setTeachers] = useState<TeacherAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [resetTarget, setResetTarget] = useState<TeacherAccess | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi<{ teachers: TeacherAccess[] }>("teacher_access", undefined, token);
      setTeachers(data.teachers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar guru.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (username: string, action: () => Promise<unknown>, onDone: () => void) => {
    setBusyUser(username);
    setActionError(null);
    try {
      await action();
      onDone();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Perubahan gagal disimpan.");
    } finally {
      setBusyUser(null);
    }
  };

  const setEnabled = (teacher: TeacherAccess, enabled: boolean) =>
    update(
      teacher.username,
      () => callApi("set_teacher_enabled", { username: teacher.username, enabled }, token),
      () => setTeachers((list) => list.map((t) => (t.username === teacher.username ? { ...t, isEnabled: enabled } : t))),
    );

  const confirmReset = async () => {
    if (!resetTarget) return;
    const target = resetTarget;
    await update(
      target.username,
      () => callApi("reset_teacher_password", { username: target.username }, token),
      () => {
        setTeachers((list) => list.map((t) => (t.username === target.username ? { ...t, hasCustomPassword: false } : t)));
        setResetTarget(null);
      },
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? teachers.filter((t) => t.username.toLowerCase().includes(q)) : teachers;
  }, [teachers, query]);

  const disabledCount = teachers.filter((t) => !t.isEnabled).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-900">Kelola Akses Guru</h2>
          <p className="text-sm text-slate-500">
            {teachers.length} guru terdaftar, {disabledCount} akses dinonaktifkan.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <TextInput aria-label="Cari guru" placeholder="Cari nama guru..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      {actionError && <Alert tone="error">{actionError}</Alert>}
      {error && (
        <Alert tone="error">
          {error}{" "}
          <button type="button" onClick={load} className="font-semibold underline">
            Coba lagi
          </button>
        </Alert>
      )}
      {loading && <p className="py-10 text-center text-sm text-slate-500">Memuat daftar guru...</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">
          Tidak ada guru yang cocok.
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {filtered.map((teacher) => (
          <li
            key={teacher.username}
            className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-card transition sm:flex-row sm:items-center sm:justify-between ${teacher.isEnabled ? "border-slate-200" : "border-rose-200 bg-rose-50/40"}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${teacher.isEnabled ? "bg-brand-50 text-brand-700" : "bg-rose-100 text-rose-600"}`}>
                {teacher.isEnabled ? <UserCheck className="h-5 w-5" aria-hidden="true" /> : <UserX className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-brand-900">{teacher.username}</p>
                <p className="text-xs text-slate-500">
                  {teacher.isEnabled ? "Akses aktif" : "Akses dinonaktifkan"}
                  {teacher.hasCustomPassword ? " · Password sudah diganti" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Button variant="ghost" className="px-2.5 py-2" disabled={busyUser !== null} onClick={() => setResetTarget(teacher)}>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Reset Password
              </Button>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-slate-500">{teacher.isEnabled ? "Aktif" : "Nonaktif"}</span>
                <Toggle
                  label={`Akses ${teacher.username}`}
                  checked={teacher.isEnabled}
                  disabled={busyUser === teacher.username}
                  onChange={(enabled) => setEnabled(teacher, enabled)}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal open={resetTarget !== null} onClose={() => setResetTarget(null)} title="Reset Password Guru?" description={resetTarget?.username} size="sm">
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-slate-600">
            Password guru ini akan dikembalikan ke password default. Guru perlu login ulang menggunakan password default.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" loading={busyUser === resetTarget?.username} onClick={confirmReset}>
              Ya, Reset
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
