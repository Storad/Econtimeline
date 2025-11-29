import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";

export default function Home() {
  return (
    <main className="bg-background">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
    </main>
  );
}
