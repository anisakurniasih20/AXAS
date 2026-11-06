import { Mail } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const ADMIN_EMAIL = "smpsatuciurug@gmail.com";

export function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Lupa Password Administrator" description="Reset password dilakukan oleh pengembang sistem.">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-slate-600">
          Silakan hubungi tim pengelola sistem melalui email berikut untuk mendapatkan bantuan reset password Administrator.
        </p>
        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
          <Mail className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
          <span className="break-all text-sm font-semibold text-brand-900">{ADMIN_EMAIL}</span>
        </div>
        <a href={`mailto:${ADMIN_EMAIL}?subject=Lupa%20Password%20Administrator%20CBT%20AXSHAT`} className="block">
          <Button className="w-full">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Kirim Email
          </Button>
        </a>
      </div>
    </Modal>
  );
}
