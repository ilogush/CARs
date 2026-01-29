import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/toast";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Best Car Rental | Professional Fleet Management",
    template: "%s | Best Car Rental"
  },
  description: "Advanced car rental and fleet management system. Track contracts, manage payments, and optimize your business with Best Car Rental.",
  keywords: ["car rental", "fleet management", "booking system", "Best Car Rental", "Hua Hin car rental"],
  authors: [{ name: "Best Car Rental Team" }],
  creator: "Best Car Rental",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://monkeycar.ru",
    siteName: "Best Car Rental",
    title: "Best Car Rental | Professional Fleet Management",
    description: "Steamlined car rental operations and fleet management.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Best Car Rental Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Car Rental | Professional Fleet Management",
    description: "Advanced car rental and fleet management system.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.className} antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
