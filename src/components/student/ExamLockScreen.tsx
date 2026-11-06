import { useEffect } from "react";
import { Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ExamLockScreen({ onExit }: { onExit: () => void }) {
  useEffect(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="lock-title"
      aria-describedby="lock-description"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-rose-800 p-5 text-white animate-fade-in"
    >
      <div className="w-full max-w-lg animate-shake rounded-3xl border-2 border-rose-300 bg-rose-600 p-8 text-center shadow-modal">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
          <Lock className="h-9 w-9" aria-hidden="true" />
        </span>
        <h1 id="lock-title" className="mt-5 text-2xl font-bold leading-tight">
          UJIAN TERKUNCI!
        </h1>
        <p id="lock-description" className="mt-3 text-sm leading-relaxed text-rose-50">
          Anda telah terdeteksi meninggalkan layar ujian sebanyak 3 kali. Silakan hubungi Pengawas / Administrator untuk membuka kembali akses ujian Anda.
        </p>
        <Button variant="accent" onClick={onExit} className="mt-7 w-full">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar Aplikasi
        </Button>
      </div>
    </div>
  );
}
