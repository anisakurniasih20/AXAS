import { useState } from "react";
import { BookOpen, ChevronLeft, GraduationCap, ShieldCheck, type LucideIcon } from "lucide-react";
import { CredentialsForm } from "@/components/auth/CredentialsForm";
import { StudentLoginForm } from "@/components/auth/StudentLoginForm";

type LoginRole = "admin" | "teacher" | "student";

const roles: { id: LoginRole; title: string; description: string; icon: LucideIcon; chipClass: string }[] = [
  {
    id: "admin",
    title: "Administrator",
    description: "Kelola tahun pelajaran dan akses",
    icon: ShieldCheck,
    chipClass: "bg-gradient-to-br from-brand-500 to-brand-800 text-white",
  },
  {
    id: "teacher",
    title: "Guru",
    description: "Atur link ujian untuk kelas Anda",
    icon: BookOpen,
    chipClass: "bg-gradient-to-br from-sky-400 to-brand-600 text-white",
  },
  {
    id: "student",
    title: "Siswa",
    description: "Masuk dan kerjakan ujian",
    icon: GraduationCap,
    chipClass: "bg-gradient-to-br from-accent-300 to-accent-600 text-brand-900",
  },
];

const roleHeadings: Record<LoginRole, { title: string; subtitle: string }> = {
  admin: { title: "Login Administrator", subtitle: "Masukkan kredensial administrator untuk melanjutkan." },
  teacher: { title: "Login Guru", subtitle: "Gunakan username guru dan password Anda." },
  student: { title: "Login Siswa", subtitle: "Pilih tingkat, kelas, lalu nama Anda." },
};

export function LoginPage() {
  const [role, setRole] = useState<LoginRole | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-50 via-white to-accent-50 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-accent-200/60 blur-3xl" />

      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-brand-900 px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <p className="relative text-sm font-semibold uppercase tracking-[0.2em] text-accent-300">SMP Negeri 1 Cicurug</p>
        <div className="relative space-y-5">
          <h2 className="text-4xl font-bold leading-tight">Ujian sekolah yang tertib, aman, dan mudah digunakan.</h2>
          <p className="max-w-md text-base leading-relaxed text-brand-200">
            Guru menyiapkan link ujian, siswa mengerjakan di mode aman, dan administrator memantau seluruh kegiatan.
          </p>
        </div>
        <p className="relative text-sm font-semibold tracking-wide text-accent-300">CERDAS • BERKARAKTER • BERPRESTASI</p>
      </aside>

      <main className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md animate-pop-in space-y-8">
          <div className="flex flex-col items-center text-center">
            <img src="/logo.png" alt="Logo AXAS" className="h-28 w-28 object-contain drop-shadow-xl sm:h-36 sm:w-36" />
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-900 sm:text-5xl">AXAS</h1>
            <p className="mt-1 text-base font-semibold text-brand-700 sm:text-lg">Axshat Smart Assessment</p>
          </div>

          {role === null ? (
            <div className="space-y-5 rounded-3xl border border-white/70 bg-white/60 p-6 shadow-xl backdrop-blur-xl sm:p-8">
              <div className="text-center">
                <h2 className="text-xl font-bold text-brand-900">Selamat datang</h2>
                <p className="mt-1 text-sm text-slate-500">Pilih peran Anda untuk masuk ke sistem.</p>
              </div>
              <div className="space-y-3">
                {roles.map(({ id, title, description, icon: Icon, chipClass }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-white/80 bg-white/70 p-4 text-left shadow-[0_8px_30px_rgb(11,27,53,0.08)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
                  >
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md transition duration-300 group-hover:scale-105 ${chipClass}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-brand-900">{title}</span>
                      <span className="block text-sm text-slate-500">{description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-xl sm:p-8">
              <button
                type="button"
                onClick={() => setRole(null)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition hover:text-brand-900"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Ganti peran
              </button>
              <div>
                <h2 className="text-2xl font-bold text-brand-900">{roleHeadings[role].title}</h2>
                <p className="mt-2 text-sm text-slate-500">{roleHeadings[role].subtitle}</p>
              </div>
              {role === "student" ? <StudentLoginForm /> : <CredentialsForm role={role} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
