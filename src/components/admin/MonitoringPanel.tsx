import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Pencil, RefreshCw, Search, Trash2 } from "lucide-react";
import { callApi, ApiError } from "@/lib/api";
import { formatKelas, type ExamEntry } from "@/lib/constants";
import { ConfirmDeleteExamModal } from "@/components/exam/ConfirmDeleteExamModal";
import { ExamFormModal } from "@/components/teacher/ExamFormModal";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { Toggle } from "@/components/ui/Toggle";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

export function MonitoringPanel({ token }: { token: string }) {
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamEntry | null>(null);
  const [editTarget, setEditTarget] = useState<ExamEntry | null>(null);
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "visible" | "hidden">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi<{ exams: ExamEntry[] }>("monitor_exams", undefined, token);
      setExams(data.exams);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data soal.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const setVisibility = async (exam: ExamEntry, visible: boolean) => {
    setActionError(null);
    setUpdatingId(exam.id);
    try {
      const data = await callApi<{ exam: ExamEntry }>("admin_set_visibility", { id: exam.id, visible }, token);
      setExams((list) => list.map((e) => (e.id === exam.id ? data.exam : e)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Status gagal diubah. Coba lagi.");
    } finally {
      setUpdatingId(null);
    }
  };

  const years = useMemo(() => [...new Set(exams.map((e) => e.schoolYear).filter((y): y is string => Boolean(y)))], [exams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exams.filter((e) => {
      if (yearFilter && e.schoolYear !== yearFilter) return false;
      if (statusFilter === "visible" && !e.isVisible) return false;
      if (statusFilter === "hidden" && e.isVisible) return false;
      if (!q) return true;
      return [e.teacher, e.mataPelajaran, e.kelas, e.submenu].some((v) => v.toLowerCase().includes(q));
    });
  }, [exams, query, yearFilter, statusFilter]);

  const visibleCount = exams.filter((e) => e.isVisible).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-900">Kelola Soal Ujian</h2>
          <p className="text-sm text-slate-500">
            {exams.length} soal terunggah, {visibleCount} sedang tampil untuk siswa.
          </p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>
          {!loading && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          Muat Ulang
        </Button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card md:grid-cols-[minmax(0,1fr)_200px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <TextInput
            aria-label="Cari guru, mata pelajaran, atau kelas"
            placeholder="Cari guru, mata pelajaran, kelas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <SelectInput aria-label="Filter tahun pelajaran" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">Semua tahun</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </SelectInput>
        <SelectInput aria-label="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="">Semua status</option>
          <option value="visible">Tampil</option>
          <option value="hidden">Disembunyikan</option>
        </SelectInput>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {actionError && <Alert tone="error">{actionError}</Alert>}
      {loading && !exams.length && <p className="py-10 text-center text-sm text-slate-500">Memuat data soal...</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">
          Tidak ada soal yang cocok dengan filter.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Guru</th>
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Sub-menu</th>
                  <th className="px-4 py-3">Tahun</th>
                  <th className="px-4 py-3">Tampilkan ke Siswa</th>
                  <th className="px-4 py-3">Diperbarui</th>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e) => (
                  <tr key={e.id} className="transition hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-semibold text-brand-900">{e.teacher}</td>
                    <td className="px-4 py-3 text-slate-700">{e.mataPelajaran}</td>
                    <td className="px-4 py-3 text-slate-700">{formatKelas(e.kelas)}</td>
                    <td className="px-4 py-3 text-slate-700">{e.submenu}</td>
                    <td className="px-4 py-3 text-slate-700">{e.schoolYear ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Toggle
                          label={`Tampilkan ${e.mataPelajaran} milik ${e.teacher} ke siswa`}
                          checked={e.isVisible}
                          disabled={updatingId === e.id}
                          onChange={(visible) => setVisibility(e, visible)}
                        />
                        <span className={`text-xs font-semibold ${e.isVisible ? "text-emerald-700" : "text-slate-500"}`}>
                          {e.isVisible ? "Tampil" : "Disembunyikan"}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateFormatter.format(new Date(e.updatedAt))}</td>
                    <td className="px-4 py-3">
                      <a
                        href={e.formUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-900 hover:underline"
                      >
                        Buka
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditTarget(e)}
                          aria-label={`Edit link soal ${e.mataPelajaran} milik ${e.teacher}`}
                          className="rounded-lg p-2 text-brand-700 transition hover:bg-brand-50 hover:text-brand-900"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(e)}
                          aria-label={`Hapus link soal ${e.mataPelajaran} milik ${e.teacher}`}
                          className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExamFormModal
        token={token}
        open={editTarget !== null}
        exam={editTarget}
        schoolYearId={editTarget?.schoolYearId ?? ""}
        kelas={editTarget?.kelas ?? ""}
        submenu={editTarget?.submenu ?? ""}
        teacherName={editTarget?.teacher}
        action="admin_save_exam"
        onClose={() => setEditTarget(null)}
        onSaved={(saved) => {
          setExams((list) => list.map((e) => (e.id === saved.id ? saved : e)));
          setEditTarget(null);
        }}
      />

      <ConfirmDeleteExamModal
        open={deleteTarget !== null}
        mataPelajaran={deleteTarget ? `${deleteTarget.mataPelajaran} · ${deleteTarget.teacher}` : ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await callApi("admin_delete_exam", { id: deleteTarget.id }, token);
          const deletedId = deleteTarget.id;
          setExams((list) => list.filter((e) => e.id !== deletedId));
          setDeleteTarget(null);
        }}
      />
    </section>
  );
}
