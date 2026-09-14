import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { resolveBasket } from "@/lib/basket";

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

export const metadata: Metadata = {
  title: "Amazon Clone — 8x Assignment",
  description: "Amazon.co.uk storefront clone built for the 8x assignment.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the basket cookie here makes every route dynamic. Accepted: a
  // storefront header that lies about the basket count is worse than a static
  // product grid.
  const { itemCount } = await resolveBasket();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SiteHeader basketCount={itemCount} />
        {children}
      </body>
    </html>
  );
}
