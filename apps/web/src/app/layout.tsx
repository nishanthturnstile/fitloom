import type { Metadata } from "next";
import "./globals.css";
import { IBM_Plex_Sans, Noto_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const notoSansHeading = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-heading",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-ibm-plex",
});

export const metadata: Metadata = {
  title: "Fitloom",
  description: "Tailoring and shop management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(ibmPlexSans.variable, notoSansHeading.variable)}
    >
      <body>{children}</body>
    </html>
  );
}
