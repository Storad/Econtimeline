"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Settings, Calendar, Clock, Lightbulb, TrendingUp, TrendingDown, X, Play, RefreshCw, Plus, Trash2, ChevronDown, ChevronRight, Tag, DollarSign, RotateCcw, GripVertical } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DemoModeProvider, useDemoMode } from "@/context/DemoModeContext";
import { TagProvider, useTagSettings, TAG_COLORS } from "@/context/TagContext";

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
  { name: "Timeline", href: "/dashboard", icon: Clock },
  { name: "Economic Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Trading", href: "/dashboard/trading", icon: TrendingUp },
  { name: "Strategies", href: "/dashboard/strategies", icon: Lightbulb },
];

// Available colors for sections
const SECTION_COLORS = ["blue", "purple", "emerald", "red", "amber", "cyan", "pink", "indigo"];

// Settings Modal Component
function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { isDemoMode, demoSettings, enableDemoMode, disableDemoMode, regenerateDemoTrades } = useDemoMode();
  const {
    tagSettings,
    addSection,
    removeSection,
    updateSection,
    addTag,
    removeTag,
    restoreDefaults,
    setStartingEquity: setTagStartingEquity
  } = useTagSettings();

  const [activeTab, setActiveTab] = useState<"general" | "tags" | "demo">("general");
  const [tradeCount, setTradeCount] = useState(String(demoSettings.tradeCount));
  const [monthsBack, setMonthsBack] = useState(String(demoSettings.monthsBack));
  const [demoEquity, setDemoEquity] = useState(String(demoSettings.startingEquity));
  const [profitable, setProfitable] = useState(demoSettings.profitable);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionColor, setNewSectionColor] = useState("blue");

  if (!isOpen) return null;

  const handleEnableDemo = () => {
    enableDemoMode({
      tradeCount: parseInt(tradeCount) || 50,
      monthsBack: parseInt(monthsBack) || 3,
      startingEquity: parseInt(demoEquity) || 10000,
      profitable
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleAddTag = (sectionId: string) => {
    const tagName = newTagInputs[sectionId]?.trim();
    if (tagName) {
      addTag(sectionId, tagName);
      setNewTagInputs(prev => ({ ...prev, [sectionId]: "" }));
    }
  };

  const handleAddSection = () => {
    if (newSectionName.trim()) {
      addSection(newSectionName.trim(), newSectionColor);
      setNewSectionName("");
      setNewSectionColor("blue");
      setShowNewSection(false);
    }
  };

  const tabs = [
    { id: "general" as const, label: "General", icon: DollarSign },
    { id: "tags" as const, label: "Tags", icon: Tag },
    { id: "demo" as const, label: "Demo", icon: Play },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent-light" />
            Settings
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-card-hover transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? "text-accent-light border-b-2 border-accent-light bg-accent/5"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "demo" && isDemoMode && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Starting Equity</label>
                <p className="text-xs text-muted mb-3">Your initial account balance for calculating returns</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={tagSettings.startingEquity || ""}
                    onChange={(e) => setTagStartingEquity(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === "tags" && (
            <div className="space-y-4">
              {/* Restore Defaults Button */}
              <div className="flex justify-end">
                <button
                  onClick={restoreDefaults}
                  className="text-xs text-muted hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded hover:bg-card-hover transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore Defaults
                </button>
              </div>

              {/* Sections */}
              <div className="space-y-2">
                {tagSettings.sections
                  .sort((a, b) => a.order - b.order)
                  .map((section) => {
                    const colors = TAG_COLORS[section.color] || TAG_COLORS.blue;
                    const isExpanded = expandedSections.has(section.id);

                    return (
                      <div
                        key={section.id}
                        className={`rounded-xl border ${colors.border} overflow-hidden`}
                      >
                        {/* Section Header */}
                        <div
                          className={`${colors.bg} px-3 py-2.5 flex items-center justify-between cursor-pointer`}
                          onClick={() => toggleSection(section.id)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className={`w-4 h-4 ${colors.text}`} />
                            ) : (
                              <ChevronRight className={`w-4 h-4 ${colors.text}`} />
                            )}
                            <span className={`text-sm font-medium ${colors.text}`}>
                              {section.name}
                            </span>
                            <span className="text-xs text-muted">
                              ({section.tags.length})
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSection(section.id);
                            }}
                            className="p-1 rounded hover:bg-black/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-muted hover:text-red-400" />
                          </button>
                        </div>

                        {/* Section Content (Tags) */}
                        {isExpanded && (
                          <div className="p-3 bg-card-hover/30 space-y-2">
                            {/* Existing Tags */}
                            <div className="flex flex-wrap gap-1.5">
                              {section.tags
                                .sort((a, b) => a.order - b.order)
                                .map((tag) => (
                                  <span
                                    key={tag.id}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}
                                  >
                                    {tag.name}
                                    <button
                                      onClick={() => removeTag(section.id, tag.id)}
                                      className="ml-0.5 hover:bg-black/20 rounded p-0.5 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                            </div>

                            {/* Add Tag Input */}
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                value={newTagInputs[section.id] || ""}
                                onChange={(e) => setNewTagInputs(prev => ({ ...prev, [section.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && handleAddTag(section.id)}
                                placeholder="New tag name..."
                                className="flex-1 px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs"
                              />
                              <button
                                onClick={() => handleAddTag(section.id)}
                                disabled={!newTagInputs[section.id]?.trim()}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  newTagInputs[section.id]?.trim()
                                    ? `${colors.bg} ${colors.text} ${colors.bgHover}`
                                    : "bg-card-hover text-muted cursor-not-allowed"
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Add New Section */}
              {!showNewSection ? (
                <button
                  onClick={() => setShowNewSection(true)}
                  className="w-full py-2.5 border border-dashed border-border rounded-xl text-sm text-muted hover:text-foreground hover:border-accent-light/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Section
                </button>
              ) : (
                <div className="p-3 border border-border rounded-xl space-y-3 bg-card-hover/30">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Section name..."
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm"
                    autoFocus
                  />
                  <div>
                    <label className="text-xs text-muted block mb-2">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {SECTION_COLORS.map((color) => {
                        const colorStyle = TAG_COLORS[color];
                        return (
                          <button
                            key={color}
                            onClick={() => setNewSectionColor(color)}
                            className={`w-7 h-7 rounded-lg ${colorStyle.bg} ${colorStyle.border} border-2 transition-all ${
                              newSectionColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-card" : ""
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowNewSection(false);
                        setNewSectionName("");
                      }}
                      className="flex-1 py-2 border border-border rounded-lg text-sm text-muted hover:bg-card-hover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSection}
                      disabled={!newSectionName.trim()}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        newSectionName.trim()
                          ? "bg-accent text-white hover:bg-accent/90"
                          : "bg-card-hover text-muted cursor-not-allowed"
                      }`}
                    >
                      Create Section
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Demo Tab */}
          {activeTab === "demo" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-foreground">Demo Mode</h4>
                  <p className="text-xs text-muted mt-0.5">Generate sample trades to preview the site</p>
                </div>
                {isDemoMode && (
                  <span className="text-[10px] px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full font-medium">
                    ACTIVE
                  </span>
                )}
              </div>

              {!isDemoMode ? (
                <div className="space-y-4 p-4 bg-card-hover/50 rounded-xl border border-border/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted block mb-1.5">Number of Trades</label>
                      <input
                        type="number"
                        value={tradeCount}
                        onChange={(e) => setTradeCount(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="1"
                        max="500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1.5">Months Back</label>
                      <input
                        type="number"
                        value={monthsBack}
                        onChange={(e) => setMonthsBack(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="1"
                        max="24"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted block mb-1.5">Starting Equity ($)</label>
                      <input
                        type="number"
                        value={demoEquity}
                        onChange={(e) => setDemoEquity(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min="100"
                        step="100"
                      />
                    </div>
                  </div>

                  {/* Profitable/Unprofitable Toggle */}
                  <div>
                    <label className="text-xs text-muted block mb-2">Outcome Type</label>
                    <div className="flex rounded-lg overflow-hidden border border-border">
                      <button
                        type="button"
                        onClick={() => setProfitable(true)}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          profitable
                            ? 'bg-emerald-500/20 text-emerald-400 border-r border-emerald-500/30'
                            : 'bg-card text-muted hover:bg-card-hover border-r border-border'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Profitable
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfitable(false)}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          !profitable
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-card text-muted hover:bg-card-hover'
                        }`}
                      >
                        <TrendingDown className="w-4 h-4" />
                        Unprofitable
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleEnableDemo}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Play className="w-4 h-4" />
                    Enable Demo Mode
                  </button>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                  <div className="text-sm text-amber-200">
                    <p className="font-medium mb-1">Demo mode is active</p>
                    <p className="text-xs text-amber-200/70">
                      Showing {demoSettings.tradeCount} {demoSettings.profitable ? 'profitable' : 'unprofitable'} trades over {demoSettings.monthsBack} months.
                      Your real trades are hidden.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={regenerateDemoTrades}
                      className="flex-1 py-2 bg-card border border-border rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-card-hover transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <button
                      onClick={disableDemoMode}
                      className="flex-1 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                    >
                      Disable Demo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inner layout component that uses the context
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const { isDemoMode } = useDemoMode();

  // Handle navigation with transition
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Don't transition if already on that page
    if (pathname === href || (href === "/dashboard" && pathname === "/dashboard")) {
      return;
    }

    // For sub-routes like /dashboard/calendar, check if we're already there
    if (href !== "/dashboard" && pathname.startsWith(href)) {
      return;
    }

    e.preventDefault();

    // Start transition
    setShowContent(false);
    setIsTransitioning(true);

    // After 500ms, navigate
    setTimeout(() => {
      router.push(href);
    }, 500);
  }, [pathname, router]);

  // When pathname changes, end transition
  useEffect(() => {
    if (isTransitioning) {
      setIsTransitioning(false);
      setShowContent(true);
    }
  }, [pathname]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 px-4 py-1.5 text-center">
          <span className="text-xs text-amber-300 font-medium">
            🎭 Demo Mode Active — Showing generated sample data
          </span>
        </div>
      )}

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
                const isActive = item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
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
              <button
                onClick={() => setShowSettings(true)}
                className={`p-2 rounded-lg hover:bg-card-hover transition-colors ${isDemoMode ? 'text-amber-400' : 'text-muted hover:text-foreground'}`}
              >
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
              const isActive = item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
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
        {isTransitioning ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              {/* Spinner */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-border" />
                <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-t-accent animate-spin-slow" />
              </div>
              {/* Loading text */}
              <p className="text-sm text-muted animate-pulse">Loading...</p>
            </div>
          </div>
        ) : (
          <div
            className={`h-full transition-all duration-300 ease-out ${
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

// Main layout wrapped with providers
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TagProvider>
      <DemoModeProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </DemoModeProvider>
    </TagProvider>
  );
}
