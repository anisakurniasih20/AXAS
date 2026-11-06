import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, LogIn } from "lucide-react";
import { callApi, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";

type StaffRole = "admin" | "teacher";

export function CredentialsForm({ role }: { role: StaffRole }) {
  const { signIn } = useSession();
  const [username, setUsername] = useState(role === "admin" ? "Administrator" : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await callApi<{ token: string; role: StaffRole; username: string }>("login", {
        role,
        username: username.trim(),
        password,
      });
      signIn({ role: data.role, token: data.token, username: data.username });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login gagal. Coba lagi.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Username" htmlFor="login-username">
        <TextInput
          id="login-username"
          autoComplete="username"
          placeholder={role === "admin" ? "Administrator" : "Masukkan username guru"}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <div className="relative">
          <TextInput
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 transition hover:text-slate-800"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {role === "admin" && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setForgotOpen(true)} className="text-sm font-semibold text-brand-700 transition hover:text-brand-900 hover:underline">
            Lupa Password?
          </button>
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full">
        {!loading && <LogIn className="h-4 w-4" aria-hidden="true" />}
        Masuk sebagai {role === "admin" ? "Administrator" : "Guru"}
      </Button>

      {role === "admin" && <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />}
      {role === "admin" && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          Password dapat diganti dari dashboard setelah login.
        </p>
      )}
    </form>
  );
}
