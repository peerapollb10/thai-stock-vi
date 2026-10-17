import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface SectionProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function Section({ title, subtitle, icon: Icon, children }: SectionProps) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-emerald-600" />
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
