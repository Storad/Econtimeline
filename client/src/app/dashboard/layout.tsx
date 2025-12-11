"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Bell, Settings, Calendar, Clock, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Logo Icon Component
const LogoIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="dashboardBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="dashboardArrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#dashboardBgGradient)" />
    <path
      d="M7 7H25M7 25H25M7 7V25"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="10"
      y1="16"
      x2="23"
      y2="16"
      stroke="#22d3ee"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M20 12.5L24 16L20 19.5"
      stroke="url(#dashboardArrowGradient)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const navItems = [
  { name: "Timeline", href: "/dashboard/timeline", icon: Clock },
  { name: "Economic Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Market Breakdown", href: "/dashboard/market", icon: BarChart3 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const pathname = usePathname();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Dashboard Header */}
      <header className="border-b border-border bg-card flex-shrink-0">
        <div className="max-w-full mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <LogoIcon />
              <span className="text-xl font-bold">
                Econ<span className="text-accent-light">timeline</span>
              </span>
            </Link>

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent/10 text-accent-light"
                        : "text-muted hover:text-foreground hover:bg-card-hover"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg hover:bg-card-hover transition-colors text-muted hover:text-foreground">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:bg-card-hover transition-colors text-muted hover:text-foreground">
                <Settings className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-border" />
              <span className="text-sm text-muted hidden sm:block">
                {user?.firstName || "User"}
              </span>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9",
                  },
                }}
              />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent-light"
                      : "text-muted hover:text-foreground hover:bg-card-hover"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-hidden px-6 py-4 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
