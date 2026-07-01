"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/_lib/supabase/supabaseClient";
import LandingHeader from "@/app/_components/landing/LandingHeader";
import Hero from "@/app/_components/landing/Hero";
import Features from "@/app/_components/landing/Features";
import Pricing from "@/app/_components/landing/Pricing";
import FinalCTA from "@/app/_components/landing/FinalCTA";
import LandingFooter from "@/app/_components/landing/LandingFooter";

export default function LandingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace("/new");
          return;
        }
      } catch (err) {
        console.error("Failed to check auth on landing page:", err);
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [router]);

  if (checkingAuth) {
    return <div className="min-h-dvh bg-background" />;
  }

  return (
    <div className="min-h-dvh bg-background font-sans">
      <LandingHeader />
      <Hero />
      <Features />
      <Pricing />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
