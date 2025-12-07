"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bell, Clock, Globe, TrendingUp, Shield, Users, Star } from "lucide-react";

export default function Hero() {
  return (
    <section id="home" className="h-screen flex flex-col justify-center gradient-bg overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm text-accent-light font-medium">
                Real-time economic calendar for traders
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="gradient-text">Trade Smarter</span>
              <br />
              <span className="text-foreground">With Every Event.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted max-w-lg mb-8"
            >
              Get a clean, real-time scrolling timeline of economic news releases,
              market sessions, and custom alerts — all synced to your local time.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start gap-4 mb-6"
            >
              <a
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold bg-accent hover:bg-accent-light hover:scale-105 text-white rounded-xl transition-all duration-300 glow btn-glow"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <div className="flex items-center gap-4 text-sm text-muted">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-accent-light" />
                  <span>3,000+ traders</span>
                </div>
              </div>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-card/50 border border-border"
            >
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-background">M</div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-background">S</div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-background">J</div>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <span className="text-sm text-foreground font-medium">&ldquo;Game-changer for NFP trades&rdquo;</span>
            </motion.div>
          </div>

          {/* Right Column - Timeline Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-b from-accent/20 to-transparent rounded-3xl blur-2xl" />
            <div className="relative gradient-border rounded-2xl overflow-hidden bg-card p-2">
              <div className="rounded-xl bg-background border border-border overflow-hidden">
                {/* Mock Timeline Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Today&apos;s Events</span>
                    <span className="text-xs text-muted px-2 py-1 rounded bg-card">Dec 15, 2024</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Next 3 hours</span>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                </div>

                {/* Mock Timeline */}
                <div className="p-6 relative">
                  {/* Now Line */}
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-accent">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-accent text-xs font-medium text-white">
                      NOW
                    </div>
                  </div>

                  {/* Timeline Track */}
                  <div className="h-32 bg-card rounded-lg border border-border relative overflow-hidden">
                    {/* Time markers */}
                    <div className="absolute inset-x-0 top-3 flex justify-between px-4 text-xs text-muted">
                      <span>9:00</span>
                      <span>9:30</span>
                      <span>10:00</span>
                      <span>10:30</span>
                      <span>11:00</span>
                      <span>11:30</span>
                      <span>12:00</span>
                    </div>

                    {/* Events */}
                    <div className="absolute bottom-6 left-[15%] flex flex-col items-center group/event cursor-pointer">
                      <div className="w-4 h-4 rounded-full bg-red-500 ring-4 ring-red-500/20 group-hover/event:ring-8 group-hover/event:scale-125 transition-all duration-300" />
                      <span className="text-xs mt-1 text-muted group-hover/event:text-red-400 transition-colors">USD CPI</span>
                    </div>
                    <div className="absolute bottom-6 left-[45%] flex flex-col items-center group/event cursor-pointer">
                      <div className="w-4 h-4 rounded-full bg-yellow-500 ring-4 ring-yellow-500/20 group-hover/event:ring-8 group-hover/event:scale-125 transition-all duration-300" />
                      <span className="text-xs mt-1 text-muted group-hover/event:text-yellow-400 transition-colors">ISM PMI</span>
                    </div>
                    <div className="absolute bottom-6 left-[70%] flex flex-col items-center group/event cursor-pointer">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 group-hover/event:ring-8 group-hover/event:scale-125 transition-all duration-300" />
                      <span className="text-xs mt-1 text-muted group-hover/event:text-emerald-400 transition-colors">Retail Sales</span>
                    </div>

                    {/* Session overlay */}
                    <div className="absolute top-10 left-[20%] right-[30%] h-8 bg-blue-500/10 border-l-2 border-blue-500 rounded-r hover:bg-blue-500/20 transition-colors cursor-pointer">
                      <span className="text-xs text-blue-400 ml-2">London Session</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      High Impact
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Medium
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Low
                    </div>
                  </div>
                </div>

                {/* Feature Pills */}
                <div className="px-6 pb-6">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: Clock, text: "Real-time" },
                      { icon: Bell, text: "Alerts" },
                      { icon: Globe, text: "Sessions" },
                      { icon: TrendingUp, text: "Impact" },
                    ].map((item) => (
                      <div
                        key={item.text}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card-hover border border-border text-xs"
                      >
                        <item.icon className="w-3 h-3 text-accent-light" />
                        <span className="text-muted">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
