import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { WalletProvider } from "@/contexts/WalletProvider";
import Header from "@/components/Header";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Japanese Soccer",
  description:
    "Shop the latest soccer jerseys from top clubs and leagues worldwide. Authentic jerseys with fast shipping and secure checkout.",
  keywords:
    "soccer jerseys, football shirts, authentic jerseys, Manchester United, Real Madrid, Barcelona, Liverpool",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <CartProvider>
            <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
          </CartProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
