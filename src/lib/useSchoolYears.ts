import { useCallback, useEffect, useState } from "react";
import { callApi, ApiError } from "@/lib/api";
import type { SchoolYear } from "@/lib/constants";

export function useSchoolYears(token: string) {
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi<{ years: SchoolYear[] }>("years_list", undefined, token);
      setYears(data.years);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat tahun pelajaran.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { years, loading, error, reload };
}
