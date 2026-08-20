export function DiamondMark({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-[var(--bb-title)] ${className}`}
      style={{
        width: size,
        height: size,
        transform: "rotate(45deg)",
      }}
    />
  );
}
