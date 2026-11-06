const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cbt-api`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function callApi<T>(action: string, payload?: Record<string, unknown>, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ action, payload, token }),
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.", 0);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("Respons server tidak valid. Coba lagi.", response.status);
  }

  if (!response.ok) {
    const message = (data as { error?: unknown })?.error;
    throw new ApiError(typeof message === "string" ? message : "Permintaan gagal. Coba lagi.", response.status);
  }
  if (typeof data !== "object" || data === null) {
    throw new ApiError("Respons server tidak valid. Coba lagi.", response.status);
  }
  return data as T;
}
