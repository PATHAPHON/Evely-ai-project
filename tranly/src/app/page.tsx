"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/shared/supabase/supabaseClient";
import LandingHeader from "@/shared/components/landing/LandingHeader";
import Hero from "@/shared/components/landing/Hero";
import Features from "@/shared/components/landing/Features";
import Pricing from "@/shared/components/landing/Pricing";
import FinalCTA from "@/shared/components/landing/FinalCTA";
import LandingFooter from "@/shared/components/landing/LandingFooter";

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
