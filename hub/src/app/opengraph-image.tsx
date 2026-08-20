import { ImageResponse } from "next/og";

export const alt = "Balance Bites Ops";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f0ea",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              background: "#1f2930",
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: 8,
              color: "#1f2930",
            }}
          >
            BB
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              background: "#1f2930",
              transform: "rotate(45deg)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 64,
            fontWeight: 700,
            color: "#1f2930",
          }}
        >
          Balance Bites
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontSize: 28,
            color: "#6b645c",
          }}
        >
          Ops — invoices · design · finance
        </div>
      </div>
    ),
    { ...size },
  );
}
