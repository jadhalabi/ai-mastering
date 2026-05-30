import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MasterAI — AI-Powered Audio Mastering",
  description: "Upload your track, drop a reference, get a professional master in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#08080E] text-white">
        <Nav />
        {children}
      </body>
    </html>
  );
}
