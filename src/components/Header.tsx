"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ShoppingCart, Menu, X, Search, User } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { WalletErrorBoundary } from "@/components/WalletErrorBoundary";
import { useState } from "react";

const WalletButton = dynamic(() => import("@/components/WalletButton"), {
  ssr: false,
  loading: () => (
    <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-800" />
  ),
});

export default function Header() {
  const { getTotalItems } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Shop", href: "/products" },
    { name: "Categories", href: "/categories" },
    { name: "About", href: "/about" },
  ];

  return (
    <header className="bg-black/95 backdrop-blur-md shadow-lg border-b border-yellow-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 relative">
          {/* Logo */}
          <div className="flex justify-start">
            <Link href="/" className="flex items-center group">
              <div className="flex items-center space-x-3">
                {/* Brand logo image */}
                <div className="relative h-16 w-16">
                  <Image
                    src="/logo.png"
                    alt="JP-Soccer logo"
                    fill
                    sizes="64px"
                    className="object-contain"
                    priority
                  />
                </div>

                {/* Text with enhanced styling */}
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-100 via-yellow-300 to-yellow-100 bg-clip-text text-transparent group-hover:from-yellow-200 group-hover:via-yellow-300 group-hover:to-yellow-400 transition-all duration-300 tracking-wide">
                    JP-Soccer
                  </h1>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-yellow-200 hover:text-yellow-100 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 hover:bg-yellow-500/5 relative group"
              >
                {item.name}
                <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-yellow-300 to-yellow-500 group-hover:w-full group-hover:left-0 transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Button */}
            <Link
              href="/products?focus=1"
              className="hidden md:flex p-2 text-yellow-100 hover:text-yellow-200 hover:bg-yellow-500/5 rounded-lg transition-all duration-300"
            >
              <Search className="h-5 w-5" />
            </Link>

            {/* User Account */}
            <button className="hidden md:flex p-2 text-yellow-100 hover:text-yellow-200 hover:bg-yellow-500/5 rounded-lg transition-all duration-300">
              <User className="h-5 w-5" />
            </button>

            {/* Wallet Connect */}
            <div className="relative">
              <WalletErrorBoundary>
                <WalletButton />
              </WalletErrorBoundary>
            </div>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative p-2 text-yellow-100 hover:text-yellow-200 hover:bg-yellow-500/5 rounded-lg transition-all duration-300 group"
            >
              <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/5 rounded-lg transition-all duration-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-yellow-500/20 bg-black/95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-yellow-300 hover:text-yellow-200 hover:bg-yellow-500/5 block px-3 py-3 text-base font-semibold rounded-lg transition-all duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
