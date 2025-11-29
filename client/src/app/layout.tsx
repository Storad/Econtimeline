import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Econtimeline | Real-Time Economic Calendar for Traders",
  description: "Never miss a market event. Real-time scrolling timeline of economic news, market sessions, and custom alerts — synced to your local time. Built for forex and stock traders.",
  keywords: ["economic calendar", "forex news", "trading alerts", "market sessions", "forex factory", "economic events", "trading timeline"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#3b82f6",
          colorBackground: "#0f172a",
          colorInputBackground: "#1e293b",
          colorInputText: "#f1f5f9",
          colorTextOnPrimaryBackground: "#ffffff",
          colorTextSecondary: "#94a3b8",
        },
        elements: {
          formButtonPrimary: "bg-accent hover:bg-accent-light",
          card: "bg-card border border-border",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted",
          socialButtonsBlockButton: "bg-card border border-border hover:bg-card-hover",
          formFieldInput: "bg-background border-border",
          footerActionLink: "text-accent-light hover:text-accent",
          identityPreviewEditButton: "text-accent-light",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={`${inter.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
