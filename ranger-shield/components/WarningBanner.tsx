interface WarningBannerProps {
  juniorExhausted: boolean;
  seniorAbsorbingLosses: boolean;
}

export function WarningBanner({ juniorExhausted, seniorAbsorbingLosses }: WarningBannerProps) {
  if (!juniorExhausted && !seniorAbsorbingLosses) return null;

  return (
    <div role="alert" aria-live="assertive" className="mx-auto max-w-5xl px-6 flex flex-col gap-2">
      {juniorExhausted && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/50 bg-rose-950/60 px-4 py-3">
          <span className="text-rose-400 text-xl flex-shrink-0">⚠</span>
          <div>
            <p className="text-rose-200 font-semibold text-sm">Risk Buffer Exhausted</p>
            <p className="text-rose-300/80 text-xs mt-0.5">
              The risk buffer has been fully wiped out by losses. Protected capital is now at direct risk.
            </p>
          </div>
        </div>
      )}
      {seniorAbsorbingLosses && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-500/50 bg-rose-950/60 px-4 py-3">
          <span className="text-rose-400 text-xl flex-shrink-0">⚠</span>
          <div>
            <p className="text-rose-200 font-semibold text-sm">Protected Position Absorbing Losses</p>
            <p className="text-rose-300/80 text-xs mt-0.5">
              Risk buffer has been depleted. The protected position is bearing remaining losses directly, reducing protected NAV per share.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
