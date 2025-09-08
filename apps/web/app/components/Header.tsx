"use client"
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

const Header = () => {
  const { isAuthenticated, logoutMutation } = useAuth();
  return (
    <header className="fixed top-0 w-full px-4 py-6 md:px-8 lg:px-12 bg-white z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-black rounded-full"></div>
          <span className="text-xl font-semibold font-ibm-plex-mono">100xness</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8 lg:space-x-12">
          <Link href="/" className="text-black hover:text-gray-700 transition-colors font-instrument-sans">
            Home
          </Link>
          <Link href="/trade" className="text-black hover:text-gray-700 transition-colors font-instrument-sans">
            Trade
          </Link>
          <Link href="/marketplace" className="text-black hover:text-gray-700 transition-colors font-instrument-sans">
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


        <button className="md:hidden p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header >
  );
};

export default Header;
