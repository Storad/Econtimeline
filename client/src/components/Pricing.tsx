"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Zap } from "lucide-react";

// Logo Icon Component
const LogoIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pricingBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="pricingArrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#pricingBgGradient)" />
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
      stroke="url(#pricingArrowGradient)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const freeFeatures = [
  { text: "Real-time scrolling timeline", included: true },
  { text: "Today's economic events", included: true },
  { text: "Major market sessions", included: true },
  { text: "High-impact news alerts", included: true },
  { text: "Local timezone sync", included: true },
];

const proFeatures = [
  "Everything in Free",
  "7-day lookahead",
  "Unlimited custom alerts",
  "Currency & event filters",
  "Session overlap highlights",
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const proPrice = isAnnual ? "$102" : "$10";
  const proPeriod = isAnnual ? "/year" : "/month";
  const savings = isAnnual ? "Save $18/year" : null;

  return (
    <section id="pricing" className="h-screen flex flex-col relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />

      {/* Main Content - centered with flex-1 */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent-light text-sm font-medium mb-3">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            Start free.{" "}
            <span className="gradient-text">Upgrade when ready.</span>
          </h2>
          <p className="text-muted text-base max-w-xl mx-auto">
            No credit card required. Get instant access to the economic calendar.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-6 bg-card border border-border"
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-1">Free</h3>
              <p className="text-muted text-sm">Get started with the essentials</p>
            </div>

            <div className="mb-4">
              <span className="text-4xl font-bold">$0</span>
            </div>

            <a
              href="/signup"
              className="block w-full py-3 px-6 rounded-xl font-semibold text-center transition-all duration-300 mb-6 bg-card-hover hover:bg-border text-foreground border border-border"
            >
              Get Started Free
            </a>

            <div className="space-y-3">
              {freeFeatures.map((feature) => (
                <div key={feature.text} className="flex items-center gap-2">
                  {feature.included ? (
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted/50 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${feature.included ? "text-foreground" : "text-muted/50"}`}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative rounded-2xl p-6 bg-gradient-to-b from-accent/10 to-card border-2 border-accent/50"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-white text-xs font-medium">
                <Zap className="w-3 h-3" />
                Most Popular
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-xl font-bold mb-1">Pro</h3>
              <p className="text-muted text-sm">Everything you need to trade smarter</p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setIsAnnual(false)}
                className={`text-sm font-medium transition-colors ${!isAnnual ? "text-foreground" : "text-muted"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isAnnual ? "bg-accent" : "bg-border"}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                    isAnnual ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`text-sm font-medium transition-colors ${isAnnual ? "text-foreground" : "text-muted"}`}
              >
                Annual
              </button>
              {savings && (
                <span className="text-xs text-emerald-400 font-medium">{savings}</span>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{proPrice}</span>
                <span className="text-muted">{proPeriod}</span>
              </div>
            </div>

            <a
              href="/signup"
              className="block w-full py-3 px-6 rounded-xl font-semibold text-center transition-all duration-300 mb-6 bg-accent hover:bg-accent-light hover:scale-105 text-white glow"
            >
              Upgrade to Pro
            </a>

            <div className="space-y-3">
              {proFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-muted text-sm mt-6"
        >
          Cancel anytime. No questions asked.
        </motion.p>
      </div>

      {/* Footer - anchored to bottom */}
      <div className="relative z-10 border-t border-border bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoIcon />
            <span className="text-sm font-semibold">
              Econ<span className="text-accent-light">timeline</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#home" className="text-sm text-muted hover:text-foreground transition-colors">Home</a>
            <a href="#features" className="text-sm text-muted hover:text-foreground transition-colors">Features</a>
            <a href="#testimonials" className="text-sm text-muted hover:text-foreground transition-colors">Testimonials</a>
            <a href="#pricing" className="text-sm text-muted hover:text-foreground transition-colors">Pricing</a>
          </div>
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} Econtimeline
          </p>
        </div>
      </div>
    </section>
  );
}
