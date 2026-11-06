import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Tone = "error" | "success" | "info";

const toneClasses: Record<Tone, { box: string; icon: typeof Info }> = {
  error: { box: "border-rose-200 bg-rose-50 text-rose-800", icon: AlertCircle },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  info: { box: "border-brand-200 bg-brand-50 text-brand-800", icon: Info },
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  const { box, icon: Icon } = toneClasses[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm animate-fade-in ${box}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
