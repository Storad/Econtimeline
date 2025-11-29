"use client";

import { motion } from "framer-motion";
import { Star, Quote, TrendingUp } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    name: "Michael Torres",
    role: "Forex Day Trader",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    content:
      "I used to have 5 tabs open just to track economic releases. Now I just glance at Econtimeline. Saved me hours every week.",
    result: "3+ hours saved weekly",
    rating: 5,
  },
  {
    name: "Sarah Kim",
    role: "Swing Trader",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    content:
      "The session overlays are exactly what I needed. I can see London open, plan my entries, and get alerts when news drops.",
    result: "Caught 2x more setups",
    rating: 5,
  },
  {
    name: "James Wilson",
    role: "Prop Firm Trader",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    content:
      "Clean, minimal, no BS. Just what I need — when the news hits — synced to my timezone. Finally a calendar that works.",
    result: "Passed prop challenge",
    rating: 5,
  },
  {
    name: "Elena Vasquez",
    role: "Currency Analyst",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    content:
      "Impact color coding saves me so much time. Red means pay attention, green means focus elsewhere. Simple but effective.",
    result: "50% faster analysis",
    rating: 5,
  },
  {
    name: "David Chen",
    role: "Crypto & Forex Trader",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    content:
      "I trade the Asian session from the US. Having Tokyo and Sydney sessions in my local time is a game-changer.",
    result: "Zero missed sessions",
    rating: 5,
  },
  {
    name: "Rachel Thompson",
    role: "Part-Time Trader",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    content:
      "Custom alerts let me know exactly when to check the charts. I've caught moves I would have completely missed.",
    result: "Never miss key events",
    rating: 5,
  },
];

const stats = [
  { value: "3,000+", label: "Active Traders" },
  { value: "50K+", label: "Alerts Sent Daily" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9/5", label: "User Rating" },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="h-screen flex flex-col justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent-light text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Trusted by <span className="gradient-text">traders</span> worldwide
          </h2>
          <p className="text-muted text-lg max-w-2xl mx-auto">
            Join thousands of traders who&apos;ve simplified their news tracking
            and never miss market-moving events.
          </p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-4 gap-4 mb-10"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-4 rounded-xl bg-card border border-border">
              <div className="text-2xl md:text-3xl font-bold gradient-text mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="relative p-5 rounded-2xl bg-card border border-border hover:border-accent/30 transition-colors"
            >
              <Quote className="absolute top-5 right-5 w-6 h-6 text-accent/20" />

              {/* Rating */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-500 text-yellow-500"
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/90 text-sm mb-4 leading-relaxed">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Author + Result Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-accent/20">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{testimonial.name}</div>
                    <div className="text-xs text-muted">{testimonial.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                  <TrendingUp className="w-3 h-3" />
                  {testimonial.result}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
