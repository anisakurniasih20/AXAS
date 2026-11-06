import { useState } from "react";
import { CalendarDays, KeyRound, MonitorCheck, ShieldAlert, Users } from "lucide-react";
import { useSession, type Session } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { AccessPanel } from "@/components/admin/AccessPanel";
import { ChangePasswordModal } from "@/components/admin/ChangePasswordModal";
import { MonitoringPanel } from "@/components/admin/MonitoringPanel";
import { SchoolYearsPanel } from "@/components/admin/SchoolYearsPanel";
import { ViolationsPanel } from "@/components/admin/ViolationsPanel";
import { Button } from "@/components/ui/Button";

type AdminSession = Extract<Session, { role: "admin" }>;
type TabId = "years" | "monitoring" | "violations" | "access";

const tabs: { id: TabId; label: string; icon: typeof CalendarDays }[] = [
  { id: "years", label: "Tahun Pelajaran", icon: CalendarDays },
  { id: "monitoring", label: "Kelola Soal Ujian", icon: MonitorCheck },
  { id: "violations", label: "Laporan Pelanggaran Ujian", icon: ShieldAlert },
  { id: "access", label: "Kelola Akses", icon: Users },
];

export function AdminDashboard({ session }: { session: AdminSession }) {
  const { signOut } = useSession();
  const [tab, setTab] = useState<TabId>("years");
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        title="CBT AXSHAT"
        subtitle="Panel Administrator"
        tone="dark"
        onSignOut={signOut}
        actions={
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-brand-100 transition hover:bg-brand-800 hover:text-white"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Ganti Password</span>
          </button>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-slate-500">Selamat datang, {session.username}</p>
          <h1 className="text-2xl font-bold text-brand-900">Dashboard Administrator</h1>
        </div>

        <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card" aria-label="Menu administrator">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 ${active ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-brand-900"}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>

        <div key={tab} className="animate-fade-in">
          {tab === "years" && <SchoolYearsPanel token={session.token} />}
          {tab === "monitoring" && <MonitoringPanel token={session.token} />}
          {tab === "violations" && <ViolationsPanel token={session.token} />}
          {tab === "access" && <AccessPanel token={session.token} />}
        </div>

        <div className="md:hidden">
          <Button variant="secondary" className="w-full" onClick={() => setPasswordOpen(true)}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Ganti Password
          </Button>
        </div>
      </main>

      <ChangePasswordModal token={session.token} open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
