import { useEffect, useMemo, useState } from "react";
import { ArrowRight, GraduationCap, Loader2, RotateCcw } from "lucide-react";
import { callApi, ApiError } from "@/lib/api";
import { TINGKAT_OPTIONS, type Student } from "@/lib/constants";
import { useSession } from "@/lib/session";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput } from "@/components/ui/Field";

type RosterResponse = { students: Student[] };

export function StudentLoginForm() {
  const { signIn } = useSession();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tingkat, setTingkat] = useState<string>("");
  const [kelas, setKelas] = useState<string>("");
  const [nama, setNama] = useState<string>("");

  const loadRoster = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await callApi<RosterResponse>("roster");
      if (!Array.isArray(data.students)) throw new ApiError("Data siswa tidak valid.", 500);
      setStudents(data.students);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Gagal memuat data siswa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const classOptions = useMemo(() => {
    if (!students || !tingkat) return [];
    return [...new Set(students.filter((s) => s.tingkat === tingkat).map((s) => s.kelas))];
  }, [students, tingkat]);

  const nameOptions = useMemo(() => {
    if (!students || !kelas) return [];
    return students.filter((s) => s.kelas === kelas).map((s) => s.nama).sort((a, b) => a.localeCompare(b, "id"));
  }, [students, kelas]);

  const chooseTingkat = (value: string) => {
    setTingkat(value);
    setKelas("");
    setNama("");
  };

  const chooseKelas = (value: string) => {
    setKelas(value);
    setNama("");
  };

  const handleSubmit = () => {
    if (!tingkat || !kelas || !nama) return;
    signIn({ role: "student", tingkat, kelas, name: nama });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden="true" />
        <p className="text-sm">Memuat data siswa...</p>
      </div>
    );
  }

  if (loadError || !students) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{loadError ?? "Data siswa belum tersedia."}</Alert>
        <Button variant="secondary" onClick={loadRoster} className="w-full">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-slate-700">1. Pilih tingkat</p>
        <div className="grid grid-cols-3 gap-2.5">
          {TINGKAT_OPTIONS.map((option) => {
            const active = tingkat === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => chooseTingkat(option)}
                aria-pressed={active}
                className={`rounded-xl border px-3 py-3 text-sm font-bold transition duration-200 active:scale-[0.97] ${
                  active
                    ? "border-brand-700 bg-brand-700 text-white shadow-md"
                    : "border-slate-200 bg-white text-brand-800 hover:border-brand-300 hover:bg-brand-50"
                }`}
              >
                Kelas {option}
              </button>
            );
          })}
        </div>
      </div>

      {tingkat && (
        <div className="animate-fade-in">
          <Field label="2. Pilih kelas" htmlFor="student-kelas">
            <SelectInput id="student-kelas" value={kelas} onChange={(e) => chooseKelas(e.target.value)}>
              <option value="">-- Pilih kelas --</option>
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      )}

      {kelas && (
        <div className="animate-fade-in">
          <Field label="3. Pilih nama Anda" htmlFor="student-nama">
            <SelectInput id="student-nama" value={nama} onChange={(e) => setNama(e.target.value)}>
              <option value="">-- Pilih nama --</option>
              {nameOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!nama} className="w-full">
        <GraduationCap className="h-4 w-4" aria-hidden="true" />
        Masuk ke Ujian
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
