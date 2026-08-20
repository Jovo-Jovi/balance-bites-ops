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
      <span className="bb-brand-mono" aria-hidden>
        <OrnamentTrack />
        <span className="bb-brand-diamond" />
        <span className="bb-brand-letters">BB</span>
        <span className="bb-brand-diamond" />
        <OrnamentTrack reverse />
      </span>
      <span className="bb-brand-name">Balance Bites</span>
    </span>
  );
}

function OrnamentTrack({ reverse = false }: { reverse?: boolean }) {
  const pips = [0, 1, 2, 3, 4, 5];
  return (
    <span className={`bb-brand-orn ${reverse ? "bb-brand-orn-reverse" : ""}`}>
      <span className="bb-brand-orn-track">
        {pips.map((i) => (
          <span key={`a-${i}`} className="bb-brand-pip" />
        ))}
        {pips.map((i) => (
          <span key={`b-${i}`} className="bb-brand-pip" />
        ))}
      </span>
    </span>
  );
}
