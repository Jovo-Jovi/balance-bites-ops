"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          minHeight: "100%",
          margin: 0,
          background: "#f4f0ea",
          color: "#2c2824",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
          }}
        >
          <p style={{ color: "#1f2930", fontSize: 28, margin: 0 }}>
            Balance Bites
          </p>
          <p style={{ color: "#b4453a", textAlign: "center", maxWidth: 480 }}>
            {error.message || "حدث خطأ في التطبيق"}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "1px solid #0f6e6b",
              background: "#0f6e6b",
              color: "#ffffff",
              padding: "8px 16px",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
