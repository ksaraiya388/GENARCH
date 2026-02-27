export function DisclaimerBanner() {
  return (
    <div
      className="sticky top-0 z-40 w-full bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-900"
      role="alert"
      aria-live="polite"
    >
      <p className="mx-auto max-w-4xl">
        GENARCH is an educational resource. The information presented is for
        educational purposes only and does not constitute medical advice.
      </p>
    </div>
  );
}
