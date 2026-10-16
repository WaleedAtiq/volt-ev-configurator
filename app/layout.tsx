import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "lenis/dist/lenis.css"; // small stylesheet Lenis needs to work correctly
import "./globals.css";

/*
 * next/font downloads these fonts at BUILD time and serves them from our own
 * domain, so visitors never make a request to Google (privacy + speed), and
 * the text never "jumps" when the font arrives.
 */
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading", weight: ["300", "500", "700"], display: "swap" });

const title = "VOLT ONE // Electric Grand Tourer (Concept)";
const description =
  "Concept product page for a fictional electric car: a real-time 3D configurator with live paint, finish and studio / night / outdoor environments. Designed & developed by Waleed Atiq.";

export const metadata: Metadata = {
  title,
  description,
  authors: [{ name: "Waleed Atiq" }],
  openGraph: { title, description, type: "website", siteName: "VOLT — concept by Waleed Atiq" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`}>
      <body>{children}</body>
    </html>
  );
}
