import { useState, type FormEvent } from "react";
import { callApi, ApiError } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

const MIN_LENGTH = 8;

export function ChangePasswordModal({ token, open, onClose }: { token: string; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Ganti Password" description="Gunakan kombinasi yang sulit ditebak." size="sm">
      {open && <ChangePasswordForm token={token} onDone={onClose} />}
    </Modal>
  );
}

function ChangePasswordForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      setError(`Password baru minimal ${MIN_LENGTH} karakter.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak sama.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await callApi("change_admin_password", { oldPassword, newPassword }, token);
      setSuccess(true);
      setTimeout(onDone, 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Password gagal diganti. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (success) return <Alert tone="success">Password Administrator berhasil diganti.</Alert>;

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Password Lama" htmlFor="old-password">
        <TextInput id="old-password" type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
      </Field>
      <Field label="Password Baru" htmlFor="new-password" hint={`Minimal ${MIN_LENGTH} karakter.`}>
        <TextInput id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </Field>
      <Field label="Ulangi Password Baru" htmlFor="confirm-password">
        <TextInput id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onDone}>
          Batal
        </Button>
        <Button type="submit" loading={saving}>
          Simpan Password
        </Button>
      </div>
    </form>
  );
}
