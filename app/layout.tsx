import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import "@/app/globals.css";
import { PwaRegister } from "@/components/pwa-register";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Null Journal",
  description:
    "Diario personal privado con Dead Man's Switch y experiencia premium en modo oscuro.",
  applicationName: "Null Journal",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Null Journal",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={geist.variable}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
