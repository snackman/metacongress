"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Nav() {
  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-white">
              MetaSenate
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/communities"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Communities
              </Link>
              <Link
                href="/delegate"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Delegate
              </Link>
              <Link
                href="/senate"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Senate
              </Link>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
