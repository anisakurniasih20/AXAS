import type { ReactNode } from "react";
import { LogOut } from "lucide-react";

export function AppHeader({
  title,
  subtitle,
  onSignOut,
  actions,
  tone = "light",
}: {
  title: string;
  subtitle: string;
  onSignOut?: () => void;
  actions?: ReactNode;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <header className={`sticky top-0 z-30 border-b ${dark ? "border-brand-800 bg-brand-900 text-white" : "border-slate-200 bg-white/90 text-slate-900 backdrop-blur"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.png" alt="Logo SMP Negeri 1 Cicurug" className="h-11 w-11 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className={`truncate text-base font-bold leading-tight ${dark ? "text-white" : "text-brand-900"}`}>{title}</p>
            <p className={`truncate text-xs ${dark ? "text-brand-200" : "text-slate-500"}`}>{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${dark ? "text-brand-100 hover:bg-brand-800 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
