import { useCallback, useRef, useState } from "react";
import { AlertTriangle, LogOut, Maximize } from "lucide-react";
import { callApi } from "@/lib/api";
import type { StudentExam } from "@/lib/constants";
import type { StudentSession } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useExamGuard } from "@/components/student/useExamGuard";
import { toEmbeddableFormUrl } from "@/lib/formUrl";

type ExamScreenProps = {
  exam: StudentExam;
  student: Pick<StudentSession, "name" | "kelas" | "tingkat">;
  onExit: () => void;
  onLocked: () => void;
};

export function ExamScreen({ exam, student, onExit, onLocked }: ExamScreenProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reportViolation = useCallback(() => {
    callApi<{ locked: boolean }>("report_violation", { tingkat: student.tingkat, kelas: student.kelas, nama: student.name })
      .then((result) => {
        if (result.locked) onLocked();
      })
      .catch(() => undefined);
  }, [student.tingkat, student.kelas, student.name, onLocked]);
  const guard = useExamGuard(iframeRef, reportViolation);

  const exitApp = () => {
    guard.markLeaving();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    onExit();
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-brand-900 animate-fade-in">
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{exam.mataPelajaran}</p>
            <p className="truncate text-xs text-brand-200">
              {exam.submenu} · {student.name}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!guard.fullscreenActive && (
            <button
              type="button"
              onClick={guard.requestFullscreen}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-400 px-3 py-2 text-sm font-semibold text-brand-900 transition hover:bg-accent-500"
            >
              <Maximize className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Aktifkan Layar Penuh</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Keluar Aplikasi
          </button>
        </div>
      </header>

      <iframe
        ref={iframeRef}
        src={toEmbeddableFormUrl(exam.formUrl)}
        title={`Ujian ${exam.mataPelajaran}`}
        allow="autoplay; fullscreen"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-modals"
        referrerPolicy="strict-origin-when-cross-origin"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />

      {guard.warningMessage && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="violation-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-rose-950/85 p-5 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md animate-shake rounded-3xl border-2 border-rose-300 bg-rose-600 p-7 text-center text-white shadow-modal">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <AlertTriangle className="h-8 w-8" aria-hidden="true" />
            </span>
            <h2 id="violation-title" className="mt-4 text-xl font-bold leading-snug">
              {guard.warningMessage}
            </h2>
            <p className="mt-2 text-sm text-rose-50">Pelanggaran ke-{guard.violations} tercatat. Kembali ke layar ujian untuk melanjutkan.</p>
            <Button variant="accent" onClick={guard.returnToExam} className="mt-6 w-full">
              Kembali ke Ujian
            </Button>
          </div>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Anda yakin?" description="Anda akan keluar dari ujian dan logout dari aplikasi." size="sm">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={exitApp}>
            Yakin
          </Button>
        </div>
      </Modal>
    </div>
  );
}
