"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";

const Header = () => {
  const { isAuthenticated, logoutMutation } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  return (
    <header className="fixed top-0 w-full px-4 py-6 md:px-8 lg:px-12 bg-white z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-black rounded-full"></div>
          <span className="text-xl font-semibold font-ibm-plex-mono">
            100xness
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8 lg:space-x-12">
          <Link
            href="/"
            className={`text-black hover:text-gray-700 transition-colors font-instrument-sans ${pathname === "/" ? "font-bold" : "text-black"}`}
          >
            Home
          </Link>
          <Link
            href="/docs"
            className={`text-black hover:text-gray-700 transition-colors font-instrument-sans ${pathname === "/docs" ? "font-bold" : "text-black"}`}
          >
            Docs
          </Link>
          <Link
            href="/marketplace"
            className={`text-black hover:text-gray-700 transition-colors font-instrument-sans ${pathname === "/marketplace" ? "font-bold" : "text-black"}`}
          >
            Marketplace
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <button
              onClick={() => logoutMutation.mutate()}
              className="border border-black text-black px-6 py-2 rounded-4xl hover:bg-gray-800 transition-colors font-instrument-sans font-medium cursor-pointer"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="bg-black text-white px-6 py-2 rounded-4xl hover:bg-gray-800 transition-colors font-instrument-sans font-medium cursor-pointer"
            >
              Login
            </Link>
          )}
        </div>

        <button 
          className="md:hidden p-2 z-50 relative"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-0 left-0 w-full h-full bg-white z-40 pt-20">
          <nav className="flex flex-col space-y-6 px-6 py-8">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className={`text-lg font-instrument-sans transition-colors ${
                pathname === "/" 
                  ? "font-bold text-black" 
                  : "text-gray-700 hover:text-black"
              }`}
            >
              Home
            </Link>
            <Link
              href="/docs"
              onClick={closeMobileMenu}
              className={`text-lg font-instrument-sans transition-colors ${
                pathname === "/docs" 
                  ? "font-bold text-black" 
                  : "text-gray-700 hover:text-black"
              }`}
            >
              Docs
            </Link>
            <Link
              href="/marketplace"
              onClick={closeMobileMenu}
              className={`text-lg font-instrument-sans transition-colors ${
                pathname === "/marketplace" 
                  ? "font-bold text-black" 
                  : "text-gray-700 hover:text-black"
              }`}
            >
              Marketplace
            </Link>
            
            <div className="pt-6 border-t border-gray-200">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    logoutMutation.mutate();
                    closeMobileMenu();
                  }}
                  className="w-full border border-black text-black px-6 py-3 rounded-4xl hover:bg-gray-50 transition-colors font-instrument-sans font-medium"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="block w-full text-center bg-black text-white px-6 py-3 rounded-4xl hover:bg-gray-800 transition-colors font-instrument-sans font-medium"
                >
                  Login
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
