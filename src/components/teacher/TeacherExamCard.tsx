import { useState } from "react";
import { BookOpen, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { callApi, ApiError } from "@/lib/api";
import type { ExamEntry } from "@/lib/constants";
import { ConfirmDeleteExamModal } from "@/components/exam/ConfirmDeleteExamModal";
import { Alert } from "@/components/ui/Alert";
import { Toggle } from "@/components/ui/Toggle";

type TeacherExamCardProps = {
  token: string;
  exam: ExamEntry;
  onChange: (exam: ExamEntry) => void;
  onEdit: () => void;
  onDeleted: () => void;
};

export function TeacherExamCard({ token, exam, onChange, onEdit, onDeleted }: TeacherExamCardProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggleVisibility = async (visible: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const data = await callApi<{ exam: ExamEntry }>("set_visibility", { id: exam.id, visible }, token);
      onChange(data.exam);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Status gagal diubah. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li
      className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-card transition duration-300 ${exam.isVisible ? "border-emerald-200 ring-4 ring-emerald-50" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${exam.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-brand-50 text-brand-700"}`}>
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-brand-900">{exam.mataPelajaran}</p>
            <p className={`text-xs font-semibold ${exam.isVisible ? "text-emerald-700" : "text-slate-500"}`}>
              {exam.isVisible ? "Tampil untuk siswa" : "Disembunyikan dari siswa"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${exam.mataPelajaran}`}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-800"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Hapus link soal ${exam.mataPelajaran}`}
            className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <a
        href={exam.formUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 truncate text-sm font-semibold text-brand-700 transition hover:text-brand-900 hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">Buka link Google Form</span>
      </a>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-sm font-semibold text-slate-700">Tampilkan ke siswa</span>
        <Toggle label={`Tampilkan ${exam.mataPelajaran} ke siswa`} checked={exam.isVisible} disabled={saving} onChange={toggleVisibility} />
      </div>

      <ConfirmDeleteExamModal
        open={confirmOpen}
        mataPelajaran={exam.mataPelajaran}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await callApi("teacher_delete_exam", { id: exam.id }, token);
          setConfirmOpen(false);
          onDeleted();
        }}
      />
    </li>
  );
}
