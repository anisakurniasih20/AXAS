import { useCallback, useEffect, useState } from "react";
import { BookOpen, FileText, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { callApi, ApiError } from "@/lib/api";
import type { StudentExam } from "@/lib/constants";
import type { StudentSession } from "@/lib/session";
import { useSession } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { ExamScreen } from "@/components/student/ExamScreen";
import { ExamLockScreen } from "@/components/student/ExamLockScreen";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type StudentExamsResponse = { schoolYear: string | null; exams: StudentExam[]; locked: boolean };

export function StudentDashboard({ session }: { session: StudentSession }) {
  const { signOut } = useSession();
  const [data, setData] = useState<StudentExamsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<StudentExam | null>(null);
  const [locked, setLocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await callApi<StudentExamsResponse>("student_exams", {
        tingkat: session.tingkat,
        kelas: session.kelas,
        nama: session.name,
      });
      if (typeof response.locked !== "boolean" || !Array.isArray(response.exams)) {
        throw new ApiError("Data ujian tidak valid.", 500);
      }
      if (response.locked) setLocked(true);
      setData(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar ujian.");
    } finally {
      setLoading(false);
    }
  }, [session.tingkat, session.kelas, session.name]);

  useEffect(() => {
    load();
  }, [load]);

  const startExam = (exam: StudentExam) => {
    document.documentElement.requestFullscreen().catch(() => undefined);
    setActiveExam(exam);
  };

  if (locked) {
    return <ExamLockScreen onExit={signOut} />;
  }

  if (activeExam) {
    return (
      <ExamScreen
        exam={activeExam}
        student={session}
        onExit={signOut}
        onLocked={() => setLocked(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader title="CBT AXSHAT" subtitle="Ruang Ujian Siswa" onSignOut={signOut} />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="relative overflow-hidden rounded-3xl bg-brand-900 p-6 text-white shadow-card sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" />
          <p className="text-sm font-semibold text-accent-300">{session.kelas}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Halo, {session.name}</h1>
          <p className="mt-2 text-sm text-brand-200">{data?.schoolYear ? `Tahun Pelajaran ${data.schoolYear}` : "Pilih mata pelajaran untuk memulai ujian."}</p>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3.5 text-sm text-slate-600 shadow-card">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
          <p>Ujian dibuka dalam mode layar penuh. Jangan berpindah tab, membuka aplikasi lain, atau keluar dari layar penuh selama ujian.</p>
        </div>

        {loading && <p className="py-12 text-center text-sm text-slate-500">Memuat daftar ujian...</p>}

        {error && !loading && (
          <div className="space-y-4">
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" onClick={load}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Coba Lagi
            </Button>
          </div>
        )}

        {!loading && !error && data && data.exams.length === 0 && (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <FileText className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="mt-4 font-bold text-brand-900">Belum ada ujian yang tersedia</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Ujian akan muncul di sini ketika guru mengaktifkannya untuk kelas Anda.</p>
          </div>
        )}

        {!loading && !error && data && data.exams.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {data.exams.map((exam) => (
              <li key={exam.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <BookOpen className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-accent-700">{exam.submenu}</p>
                    <p className="truncate text-lg font-bold text-brand-900">{exam.mataPelajaran}</p>
                  </div>
                </div>
                <Button onClick={() => startExam(exam)} className="w-full">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Mulai Ujian
                </Button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
