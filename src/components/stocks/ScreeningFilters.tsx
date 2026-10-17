import { Filter, RotateCcw, Sparkles } from "lucide-react";
import { criteria, type CriterionId, type ThresholdField, type Thresholds } from "@/lib/screening";
import { cn } from "@/lib/utils";

interface ScreeningFiltersProps {
  enabled: CriterionId[];
  thresholds: Thresholds;
  onToggle: (id: CriterionId) => void;
  onThresholdChange: (id: ThresholdField, value: number) => void;
  onApplyPreset: () => void;
  onClear: () => void;
}

export function ScreeningFilters({
  enabled,
  thresholds,
  onToggle,
  onThresholdChange,
  onApplyPreset,
  onClear,
}: ScreeningFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Filter className="size-4 text-emerald-600" />
          VI Screening
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onApplyPreset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <Sparkles className="size-3.5" />
            เกณฑ์ VI พื้นฐาน
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={enabled.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="size-3.5" />
            ล้างเกณฑ์
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {criteria.map((criterion) => {
          const checked = enabled.includes(criterion.id);
          return (
            <div
              key={criterion.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                checked
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                  : "border-slate-200 dark:border-slate-700",
              )}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(criterion.id)}
                  className="size-4 accent-emerald-600"
                />
                <span>{criterion.label}</span>
              </label>

              {criterion.kind === "threshold" && (
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="font-mono">{criterion.op}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={criterion.step}
                    min={0}
                    value={Number.isNaN(thresholds[criterion.id]) ? "" : thresholds[criterion.id]}
                    onChange={(e) => onThresholdChange(criterion.id, e.target.valueAsNumber)}
                    aria-label={`ค่าเกณฑ์ ${criterion.label}`}
                    className="w-16 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-right font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <span className="w-6 text-xs">{criterion.unit}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
