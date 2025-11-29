"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Bell,
  Globe,
  TrendingUp,
  Filter,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Real-Time Timeline",
    description:
      "Watch events scroll with a 'NOW' line synced to your local time. See exactly when news releases happen in real-time.",
  },
  {
    icon: TrendingUp,
    title: "Impact-Coded Events",
    description:
      "Color-coded by impact level — red for high, yellow for medium, green for low. Know what moves markets instantly.",
  },
  {
    icon: Globe,
    title: "Global Market Sessions",
    description:
      "Visualize New York, London, Tokyo, and Sydney sessions. Toggle pre/post-market to match your trading style.",
  },
  {
    icon: Bell,
    title: "Custom Alerts",
    description:
      "Set audio and visual alerts for specific events, sessions, or custom times. Get notified exactly your way.",
  },
  {
    icon: Filter,
    title: "Currency Filters",
    description:
      "Filter events by USD, EUR, GBP, JPY — focus only on the pairs you trade. No noise, just relevance.",
  },
  {
    icon: Zap,
    title: "No Fluff, Just Data",
    description:
      "No walls of text, no upsells, no ads. Just clean, essential economic data delivered when you need it.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Features() {
  return (
    <section id="features" className="h-screen flex flex-col justify-center relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent-light text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Everything you need to{" "}
            <span className="gradient-text">trade smarter</span>
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Built by traders, for traders. Every feature designed to keep you
            ahead of market-moving events.
          </p>
        </motion.div>

        {/* Features Grid - 3x2 */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative p-6 rounded-2xl bg-card border border-border hover:border-accent/50 transition-all duration-300"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-accent-light" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
