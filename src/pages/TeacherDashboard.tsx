import { useEffect, useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { callApi, ApiError } from "@/lib/api";
import { SUBMENUS, TINGKAT_OPTIONS, formatKelas, type ExamEntry } from "@/lib/constants";
import type { Session } from "@/lib/session";
import { useSession } from "@/lib/session";
import { useSchoolYears } from "@/lib/useSchoolYears";
import { AppHeader } from "@/components/AppHeader";
import { ExamFormModal } from "@/components/teacher/ExamFormModal";
import { TeacherExamCard } from "@/components/teacher/TeacherExamCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput } from "@/components/ui/Field";

type TeacherSession = Extract<Session, { role: "teacher" }>;

export function TeacherDashboard({ session }: { session: TeacherSession }) {
  const { signOut } = useSession();
  const { years, loading: yearsLoading, error: yearsError, reload: reloadYears } = useSchoolYears(session.token);
  const [yearId, setYearId] = useState<string>("");
  const [kelas, setKelas] = useState("");
  const [submenu, setSubmenu] = useState<string>("");
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examsError, setExamsError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ exam: ExamEntry | null } | null>(null);

  const selectedYearId = yearId || years.find((y) => y.isActive)?.id || "";
  const selectedYear = years.find((y) => y.id === selectedYearId);
  const canManage = Boolean(selectedYearId && kelas && submenu);

  useEffect(() => {
    if (!selectedYearId) return;
    let cancelled = false;
    setExamsLoading(true);
    setExamsError(null);
    callApi<{ exams: ExamEntry[] }>("teacher_exams", { schoolYearId: selectedYearId }, session.token)
      .then((data) => {
        if (!cancelled) setExams(data.exams);
      })
      .catch((err) => {
        if (!cancelled) setExamsError(err instanceof ApiError ? err.message : "Gagal memuat daftar mapel.");
      })
      .finally(() => {
        if (!cancelled) setExamsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYearId, session.token]);

  const scopedExams = useMemo(
    () => exams.filter((e) => e.kelas === kelas && e.submenu === submenu).sort((a, b) => a.mataPelajaran.localeCompare(b.mataPelajaran, "id")),
    [exams, kelas, submenu],
  );

  const upsertExam = (exam: ExamEntry) => {
    setExams((list) => {
      const exists = list.some((e) => e.id === exam.id);
      return exists ? list.map((e) => (e.id === exam.id ? exam : e)) : [...list, exam];
    });
  };

  const removeExam = (id: string) => {
    setExams((list) => list.filter((e) => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader title="CBT AXSHAT" subtitle="Panel Guru" onSignOut={signOut} />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <p className="text-sm font-semibold text-slate-500">Selamat datang, {session.username}</p>
          <h1 className="text-2xl font-bold text-brand-900">Atur Link Ujian</h1>
          <p className="mt-1 text-sm text-slate-500">Pilih tahun, kelas, dan sub-menu ujian, lalu masukkan link Google Form untuk setiap mata pelajaran.</p>
        </div>

        <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-3 sm:p-6">
          <Field label="Tahun Pelajaran" htmlFor="teacher-year">
            {yearsLoading ? (
              <p className="py-2.5 text-sm text-slate-500">Memuat...</p>
            ) : yearsError ? (
              <button type="button" onClick={reloadYears} className="py-2.5 text-left text-sm font-semibold text-rose-700 underline">
                {yearsError} Coba lagi
              </button>
            ) : (
              <SelectInput id="teacher-year" value={selectedYearId} onChange={(e) => setYearId(e.target.value)}>
                {years.length === 0 && <option value="">Belum ada tahun pelajaran</option>}
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                    {y.isActive ? " (Aktif)" : ""}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label="Kelas" htmlFor="teacher-kelas">
            <SelectInput id="teacher-kelas" value={kelas} onChange={(e) => setKelas(e.target.value)}>
              <option value="">-- Pilih kelas --</option>
              {TINGKAT_OPTIONS.map((tingkat) => (
                <option key={tingkat} value={tingkat}>
                  {formatKelas(tingkat)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Sub-menu Ujian" htmlFor="teacher-submenu">
            <SelectInput id="teacher-submenu" value={submenu} onChange={(e) => setSubmenu(e.target.value)}>
              <option value="">-- Pilih sub-menu --</option>
              {SUBMENUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectInput>
          </Field>
        </section>

        {examsError && <Alert tone="error">{examsError}</Alert>}

        {!canManage && (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <FileText className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mt-4 font-bold text-brand-900">Lengkapi pilihan di atas</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Pilih kelas dan sub-menu ujian untuk mengelola mata pelajaran dan link Google Form.</p>
          </div>
        )}

        {canManage && (
          <section className="space-y-4 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-900">
                  {formatKelas(kelas)} · {submenu}
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedYear?.label} · {scopedExams.length} mata pelajaran
                </p>
              </div>
              <Button onClick={() => setFormState({ exam: null })} disabled={examsLoading}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tambah Mata Pelajaran
              </Button>
            </div>

            {examsLoading && <p className="py-10 text-center text-sm text-slate-500">Memuat daftar mapel...</p>}

            {!examsLoading && scopedExams.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-12 text-center">
                <p className="font-semibold text-slate-700">Belum ada mata pelajaran</p>
                <p className="mt-1 text-sm text-slate-500">Tambahkan mapel beserta link Google Form-nya.</p>
              </div>
            )}

            <ul className="grid gap-3 md:grid-cols-2">
              {scopedExams.map((exam) => (
                <TeacherExamCard
                  key={exam.id}
                  token={session.token}
                  exam={exam}
                  onChange={upsertExam}
                  onEdit={() => setFormState({ exam })}
                  onDeleted={() => removeExam(exam.id)}
                />
              ))}
            </ul>
          </section>
        )}
      </main>

      {canManage && (
        <ExamFormModal
          token={session.token}
          open={formState !== null}
          exam={formState?.exam ?? null}
          schoolYearId={selectedYearId}
          kelas={kelas}
          submenu={submenu}
          onClose={() => setFormState(null)}
          onSaved={(exam) => {
            upsertExam(exam);
            setFormState(null);
          }}
        />
      )}
    </div>
  );
}

