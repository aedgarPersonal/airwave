import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// If Clerk isn't configured yet, skip the provider so public pages still
// render. Auth-protected routes (dashboard, station admin) will bounce to a
// sign-in page that will itself fail loudly — which is the correct signal
// that the platform admin needs to set CLERK_SECRET_KEY + publishable key.
const CLERK_CONFIGURED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder");

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://airwave.vercel.app",
  ),
  title: "Airwave — Sites, schedules, and mobile apps for grassroots radio",
  description:
    "Airwave helps independent radio stations run a modern web presence without rebuilding their site. Schedule, sponsors, stream, and a mobile-installable page from one dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <html
      lang="en"
      className={`${inter.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
  return CLERK_CONFIGURED ? <ClerkProvider>{body}</ClerkProvider> : body;
}
