import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ConfirmDeleteExamModalProps = {
  open: boolean;
  mataPelajaran: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDeleteExamModal({ open, mataPelajaran, onClose, onConfirm }: ConfirmDeleteExamModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (deleting) return;
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus link soal. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Hapus Link Soal" description={mataPelajaran} size="sm">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-slate-600">Apakah Anda yakin ingin menghapus link soal ini? Slot mata pelajaran ini akan kembali kosong.</p>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={deleting}>
            Batal
          </Button>
          <Button variant="danger" onClick={confirm} loading={deleting}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Yakin
          </Button>
        </div>
      </div>
    </Modal>
  );
}
