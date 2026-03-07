import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { Nav } from "@/components/Nav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meta Senate",
  description:
    "A governing body for the metaverse elected from the foremost communities.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100`}
      >
        <Web3Provider>
          <Nav />
          <main className="min-h-screen">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
