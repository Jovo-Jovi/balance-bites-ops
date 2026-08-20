export function BrandLockup({
  size = "bar",
}: {
  size?: "bar" | "hero";
}) {
  const hero = size === "hero";
  return (
    <span
      dir="ltr"
      className={`bb-brand-lockup ${hero ? "bb-brand-lockup-hero" : ""}`}
    >
      <span className="bb-brand-pattern" aria-hidden />
      <span className="bb-brand-mono" aria-hidden>
        <span className="bb-brand-diamond" />
        <span className="bb-brand-letters">BB</span>
        <span className="bb-brand-diamond" />
      </span>
      <span className="bb-brand-name">Balance Bites</span>
    </span>
  );
}
