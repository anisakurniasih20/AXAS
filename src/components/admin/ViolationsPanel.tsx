import { useCallback, useEffect, useState } from "react";
import { Lock, RefreshCw, RotateCcw } from "lucide-react";
import { callApi, ApiError } from "@/lib/api";
import { formatKelas } from "@/lib/constants";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export type ViolationRecord = {
  id: string;
  tingkat: string;
  kelas: string;
  nama: string;
  violationCount: number;
  isLocked: boolean;
  lastViolationAt: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

export function ViolationsPanel({ token }: { token: string }) {
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi<{ violations: ViolationRecord[] }>("violation_list", undefined, token);
      if (!Array.isArray(data.violations)) throw new ApiError("Data pelanggaran tidak valid.", 500);
      setViolations(data.violations);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat laporan pelanggaran.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const unlock = async (record: ViolationRecord) => {
    setResettingId(record.id);
    setActionError(null);
    try {
      await callApi("violation_reset", { id: record.id }, token);
      setViolations((list) => list.filter((v) => v.id !== record.id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Gagal membuka kunci. Coba lagi.");
    } finally {
      setResettingId(null);
    }
  };

  const lockedCount = violations.filter((v) => v.isLocked).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-brand-900">Laporan Pelanggaran Ujian</h2>
          <p className="text-sm text-slate-500">
            {violations.length} siswa tercatat melanggar, {lockedCount} terkunci.
          </p>
        </div>
        <Button variant="secondary" onClick={load} loading={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Muat Ulang
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {actionError && <Alert tone="error">{actionError}</Alert>}

      {!loading && !error && violations.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <p className="font-semibold text-slate-700">Belum ada pelanggaran</p>
          <p className="mt-1 text-sm text-slate-500">Siswa yang keluar dari layar ujian akan tercatat di sini.</p>
        </div>
      )}

      {violations.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3">Pelanggaran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Terakhir</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {violations.map((v) => (
                <tr key={v.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-brand-900">{v.nama}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatKelas(v.tingkat)} · {v.kelas}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{v.violationCount}x</td>
                  <td className="px-4 py-3">
                    {v.isLocked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        TERKUNCI
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Peringatan</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{v.lastViolationAt ? dateFormatter.format(new Date(v.lastViolationAt)) : "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" onClick={() => unlock(v)} loading={resettingId === v.id} disabled={resettingId !== null && resettingId !== v.id}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Buka Kunci (Reset)
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
