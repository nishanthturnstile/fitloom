import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitloom",
  description: "Tailoring and shop management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
