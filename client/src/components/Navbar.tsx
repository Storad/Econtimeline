"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Features", href: "#features" },
  { name: "Testimonials", href: "#testimonials" },
  { name: "Pricing", href: "#pricing" },
];

// Logo Icon Component - Abstract E with Timeline
const LogoIcon = () => (
  <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Background with subtle gradient */}
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#bgGradient)" />
    {/* E structure - centered */}
    <path
      d="M7 7H25M7 25H25M7 7V25"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Middle arrow horizontal line - gap from vertical stem */}
    <line
      x1="10"
      y1="16"
      x2="23"
      y2="16"
      stroke="#22d3ee"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Arrow head */}
    <path
      d="M20 12.5L24 16L20 19.5"
      stroke="url(#arrowGradient)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <LogoIcon />
            <span className="text-xl font-bold">
              Econ<span className="text-accent-light">timeline</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-muted hover:text-foreground transition-colors text-sm font-medium"
              >
                {link.name}
              </a>
            ))}
            <SignedIn>
              <a
                href="/dashboard"
                className="text-muted hover:text-foreground transition-colors text-sm font-medium"
              >
                Dashboard
              </a>
            </SignedIn>
            <SignedOut>
              <a
                href="/login"
                className="text-muted hover:text-foreground transition-colors text-sm font-medium"
              >
                Dashboard
              </a>
            </SignedOut>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <SignedOut>
              <a
                href="/login"
                className="text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                Login
              </a>
              <a
                href="/signup"
                className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-light text-white rounded-lg transition-colors"
              >
                Sign Up
              </a>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9",
                  },
                }}
              />
            </SignedIn>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted hover:text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card border-b border-border"
          >
            <div className="px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block text-muted hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <SignedIn>
                <a
                  href="/dashboard"
                  className="block text-muted hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </a>
              </SignedIn>
              <SignedOut>
                <a
                  href="/login"
                  className="block text-muted hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </a>
              </SignedOut>
              <div className="pt-4 border-t border-border space-y-3">
                <SignedOut>
                  <a
                    href="/login"
                    className="block text-center text-sm font-medium text-muted hover:text-foreground"
                  >
                    Login
                  </a>
                  <a
                    href="/signup"
                    className="block text-center px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg"
                  >
                    Sign Up
                  </a>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center justify-center gap-3">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-9 h-9",
                        },
                      }}
                    />
                    <span className="text-sm text-muted">My Account</span>
                  </div>
                </SignedIn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
