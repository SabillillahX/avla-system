"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

const Hero2 = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Gradient background blobs */}
      <div className="flex flex-col items-end absolute -right-60 -top-10 blur-xl z-0">
        <div className="h-[10rem] rounded-full w-[60rem] z-[1] bg-gradient-to-b blur-[6rem] from-purple-600 to-sky-600"></div>
        <div className="h-[10rem] rounded-full w-[90rem] z-[1] bg-gradient-to-b blur-[6rem] from-pink-900 to-yellow-400"></div>
        <div className="h-[10rem] rounded-full w-[60rem] z-[1] bg-gradient-to-b blur-[6rem] from-yellow-600 to-sky-500"></div>
      </div>
      <div className="absolute inset-0 z-0 bg-noise opacity-30"></div>

      {/* Content container */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto flex items-center justify-between px-4 py-4 mt-6">
          <Link href="/" className="flex items-center">
            <Image src="/logo-white.png" alt="Avla Logo" width={200} height={64} className="h-8 md:h-16 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-6">
              <NavItem label="Fitur" />
              <NavItem label="Harga" />
              <NavItem label="Dokumentasi" />
              <NavItem label="Tentang" />
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/auth/login"
                className="h-12 rounded-full bg-white px-8 text-base font-medium text-black hover:bg-white/90 inline-flex items-center"
              >
                Masuk
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </nav>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex flex-col p-4 bg-black/95 md:hidden"
            >
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center">
                  <Image src="/logo-white.png" alt="Avla Logo" width={200} height={64} className="h-8 w-auto" />
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="mt-8 flex flex-col space-y-6">
                <MobileNavItem label="Fitur" />
                <MobileNavItem label="Harga" />
                <MobileNavItem label="Dokumentasi" />
                <MobileNavItem label="Tentang" />
                <div className="pt-4">
                  <Link
                    href="/auth/login"
                    className="block w-full text-center border border-gray-700 text-white py-2 rounded"
                  >
                    Masuk
                  </Link>
                </div>
                <Link
                  href="/auth/register"
                  className="h-12 rounded-full bg-white px-8 text-base font-medium text-black hover:bg-white/90 inline-flex items-center justify-center"
                >
                  Mulai Gratis
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge */}
        <div className="mx-auto mt-6 flex max-w-fit items-center justify-center space-x-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
          <span className="text-sm font-medium text-white">
            AI Learning Platform
          </span>
          <ArrowRight className="h-4 w-4 text-white" />
        </div>

        {/* Hero section */}
        <div className="container mx-auto mt-12 px-4 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight text-white md:text-6xl lg:text-7xl">
            Platform SaaS Profesional untuk Layanan Teknologi Terkelola
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            Avla membantu perusahaan dan organisasi membangun layanan teknologi
            informasi terkelola dengan alur kerja yang terukur, aman, dan siap
            skala — didukung AI Assessment Video.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <Link
              href="/auth/register"
              className="h-12 rounded-full bg-white px-8 text-base font-medium text-black hover:bg-white/90 inline-flex items-center"
            >
              Try for free
            </Link>
          </div>

          <div className="relative mx-auto my-20 w-full max-w-6xl overflow-hidden rounded-2xl border border-white/20 bg-white/5 p-1 shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/30 via-transparent to-amber-400/20 blur-3xl" />
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=75&auto=format&fit=crop"
              alt="Avla Dashboard — AI Video Assessment Platform"
              className="relative w-full h-auto rounded-xl border border-white/10 object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function NavItem({
  label,
  hasDropdown,
}: {
  label: string;
  hasDropdown?: boolean;
}) {
  return (
    <div className="flex items-center text-sm text-gray-300 hover:text-white cursor-pointer">
      <span>{label}</span>
      {hasDropdown && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-1"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
    </div>
  );
}

function MobileNavItem({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-800 pb-2 text-lg text-white">
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 text-gray-400" />
    </div>
  );
}

export { Hero2 };
