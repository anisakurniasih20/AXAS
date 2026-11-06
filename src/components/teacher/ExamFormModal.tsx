import { useState, type FormEvent } from "react";
import { callApi, ApiError } from "@/lib/api";
import { MATA_PELAJARAN_OPTIONS, formatKelas, type ExamEntry } from "@/lib/constants";
import { toEmbeddableFormUrl } from "@/lib/formUrl";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

type ExamFormModalProps = {
  token: string;
  open: boolean;
  exam: ExamEntry | null;
  schoolYearId: string;
  kelas: string;
  submenu: string;
  teacherName?: string;
  action?: "save_exam" | "admin_save_exam";
  onClose: () => void;
  onSaved: (exam: ExamEntry) => void;
};

export function ExamFormModal(props: ExamFormModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.exam ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
      description={[props.teacherName, formatKelas(props.kelas), props.submenu].filter(Boolean).join(" · ")}
    >
      {props.open && <ExamForm key={props.exam?.id ?? "new"} {...props} />}
    </Modal>
  );
}

function ExamForm({ token, exam, schoolYearId, kelas, submenu, action = "save_exam", onClose, onSaved }: ExamFormModalProps) {
  const [mataPelajaran, setMataPelajaran] = useState(exam?.mataPelajaran ?? "");
  const subjectOptions =
    exam && !(MATA_PELAJARAN_OPTIONS as readonly string[]).includes(exam.mataPelajaran)
      ? [exam.mataPelajaran, ...MATA_PELAJARAN_OPTIONS]
      : MATA_PELAJARAN_OPTIONS;
  const [formUrl, setFormUrl] = useState(exam?.formUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedSubject = mataPelajaran.trim();
    const trimmedUrl = formUrl.trim();
    if (!trimmedSubject) {
      setError("Pilih mata pelajaran terlebih dahulu.");
      return;
    }
    if (!trimmedUrl.startsWith("https://")) {
      setError("Link Google Form harus diawali https://");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = await callApi<{ exam: ExamEntry }>(
        action,
        {
          id: exam?.id,
          schoolYearId,
          kelas,
          submenu,
          mataPelajaran: trimmedSubject,
          formUrl: toEmbeddableFormUrl(trimmedUrl),
        },
        token,
      );
      onSaved(data.exam);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Mata Pelajaran" htmlFor="exam-subject">
        <SelectInput
          id="exam-subject"
          value={mataPelajaran}
          onChange={(e) => setMataPelajaran(e.target.value)}
          autoFocus
        >
          <option value="">-- Pilih mata pelajaran --</option>
          {subjectOptions.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Link Google Form" htmlFor="exam-url" hint="Pastikan form sudah dapat diakses melalui tautan.">
        <TextInput
          id="exam-url"
          type="url"
          inputMode="url"
          value={formUrl}
          onChange={(e) => setFormUrl(e.target.value)}
          placeholder="https://docs.google.com/forms/..."
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" loading={saving}>
          Simpan
        </Button>
      </div>
    </form>
  );
}
