import { useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, Pencil, Plus } from "lucide-react";
import { callApi, ApiError } from "@/lib/api";
import type { SchoolYear } from "@/lib/constants";
import { useSchoolYears } from "@/lib/useSchoolYears";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

export function SchoolYearsPanel({ token }: { token: string }) {
  const { years, loading, error, reload } = useSchoolYears(token);
  const [editing, setEditing] = useState<SchoolYear | "new" | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activate = async (year: SchoolYear) => {
    setActivatingId(year.id);
    setActionError(null);
    try {
      await callApi("year_activate", { id: year.id }, token);
      await reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal mengaktifkan tahun pelajaran.");
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-900">Tahun Pelajaran</h2>
          <p className="text-sm text-slate-500">Tahun yang aktif akan tampil untuk guru dan siswa.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Tahun
        </Button>
      </div>

      {actionError && <Alert tone="error">{actionError}</Alert>}

      {loading && <p className="py-10 text-center text-sm text-slate-500">Memuat tahun pelajaran...</p>}
      {error && !loading && (
        <Alert tone="error">
          {error}{" "}
          <button type="button" onClick={reload} className="font-semibold underline">
            Coba lagi
          </button>
        </Alert>
      )}

      {!loading && !error && years.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-700">Belum ada tahun pelajaran</p>
          <p className="text-sm text-slate-500">Tambahkan tahun pelajaran pertama Anda.</p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {years.map((year) => (
          <li
            key={year.id}
            className={`flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-card transition ${year.isActive ? "border-emerald-300 ring-4 ring-emerald-50" : "border-slate-200"}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${year.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-brand-900">{year.label}</p>
                {year.isActive ? (
                  <p className="text-xs font-semibold text-emerald-700">Sedang aktif</p>
                ) : (
                  <p className="text-xs text-slate-500">Tidak aktif</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(year)}
                aria-label={`Edit ${year.label}`}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-800"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {!year.isActive && (
                <Button variant="secondary" className="px-3 py-2" loading={activatingId === year.id} onClick={() => activate(year)}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Aktifkan
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <YearFormModal
        token={token}
        year={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </section>
  );
}

function YearFormModal({
  token,
  year,
  open,
  onClose,
  onSaved,
}: {
  token: string;
  year: SchoolYear | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={year ? "Edit Tahun Pelajaran" : "Tambah Tahun Pelajaran"} description="Contoh format: 2026/2027" size="sm">
      {open && <YearForm key={year?.id ?? "new"} token={token} year={year} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function YearForm({ token, year, onClose, onSaved }: { token: string; year: SchoolYear | null; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(year?.label ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError("Tahun pelajaran wajib diisi.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await callApi(year ? "year_update" : "year_create", year ? { id: year.id, label: label.trim() } : { label: label.trim() }, token);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Tahun Pelajaran" htmlFor="year-label">
        <TextInput id="year-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2026/2027" maxLength={20} autoFocus />
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
