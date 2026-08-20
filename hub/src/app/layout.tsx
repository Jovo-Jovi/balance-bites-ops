import type { Metadata, Viewport } from "next";
import { Playfair_Display, Syne, DM_Sans, Tajawal } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: "900",
  variable: "--font-playfair",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-syne",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  adjustFontFallback: false,
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f0ea",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://balance-bites-ops.vercel.app"),
  title: {
    default: "Balance Bites Ops",
    template: "%s · Balance Bites Ops",
  },
  description:
    "Invoices, label design, and finance & inventory — one hub for Balance Bites.",
  applicationName: "Balance Bites Ops",
  appleWebApp: {
    title: "Balance Bites Ops",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Balance Bites Ops",
    description:
      "Invoices, label design, and finance & inventory — one hub for Balance Bites.",
    url: "/",
    siteName: "Balance Bites Ops",
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Balance Bites Ops",
    description:
      "Invoices, label design, and finance & inventory — one hub for Balance Bites.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${playfair.variable} ${syne.variable} ${dmSans.variable} ${tajawal.variable} min-h-dvh antialiased`}
    >
      <body className="min-h-dvh bg-[var(--bb-charcoal)] text-[var(--bb-text)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
