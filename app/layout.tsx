import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Protection Grading & Damage Curve Studio",
  description:
    "Plot protective-device time-current curves against equipment damage/withstand curves to check protection coordination and grading.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
