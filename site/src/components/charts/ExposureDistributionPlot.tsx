"use client";

interface ExposureDistributionPlotProps {
  exposureName: string;
  distributionData?: {
    data_source: string;
    geographic_scope: string;
    summary_stats?: Record<string, number>;
  };
}

export function ExposureDistributionPlot({ exposureName, distributionData }: ExposureDistributionPlotProps) {
  if (!distributionData || !distributionData.summary_stats) {
    return (
      <div className="border border-white/[0.08] rounded-md p-6 bg-navy-mid/50 text-center">
        <p className="text-cool-mid text-sm">
          Exposure distribution data for {exposureName} is not yet available.
        </p>
        <p className="text-cool-dark text-xs mt-2">
          Source: {distributionData?.data_source ?? "Pending"} | Scope: {distributionData?.geographic_scope ?? "—"}
        </p>
      </div>
    );
  }

  const entries = Object.entries(distributionData.summary_stats).map(([key, value]) => ({
    label: key,
    value: Number(value),
  }));

  return (
    <div className="border border-white/[0.08] rounded-md p-4 bg-navy-mid/50">
      <h3 className="text-sm font-semibold text-surface-white mb-3">
        Exposure Distribution — {exposureName}
      </h3>
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.label} className="flex items-center gap-3 text-sm">
            <span className="text-cool-light w-32 text-right">{e.label}</span>
            <div className="flex-1 h-5 bg-white/[0.04] rounded-sm overflow-hidden">
              <div
                className="h-full bg-teal-primary/40 rounded-sm"
                style={{ width: `${Math.min(100, (e.value / Math.max(...entries.map(x => x.value))) * 100)}%` }}
              />
            </div>
            <span className="text-surface-white font-mono text-xs w-16 text-right">{e.value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-cool-dark mt-3">
        Source: {distributionData.data_source} | Scope: {distributionData.geographic_scope}
      </p>
    </div>
  );
}
