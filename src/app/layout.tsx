import type { Metadata, Viewport } from "next";
import { Lora, Plus_Jakarta_Sans } from "next/font/google";
import { InteractiveMidnightBg } from "@/components/InteractiveMidnightBg";
import { CAPSULE_CONFIG } from "@/config/capsule";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: CAPSULE_CONFIG.appTitle,
  description: CAPSULE_CONFIG.lockScreenSubtitle,
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0A10",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${lora.variable} midnight-backdrop`}
    >
      <body className="relative antialiased">
        <InteractiveMidnightBg />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
