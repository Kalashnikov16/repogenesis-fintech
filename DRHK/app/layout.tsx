import type { Metadata } from "next";
import { Inter } from "next/font/google";
// @ts-ignore
import "./globals.css"; // <--- THIS IMPORT MUST BE HERE

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TokenEstate",
  description: "Real Estate Tokenization Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
