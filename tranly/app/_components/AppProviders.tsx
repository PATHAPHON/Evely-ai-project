'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ActiveLanguageProvider } from '../_lib/ActiveLanguageContext';
import { GemsProvider } from '../_lib/GemsContext';
import { WordStatusProvider } from './WordStatusProvider';
import { ToastProvider } from './Toast';
import { supabase } from '../_lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export default function AppProviders({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Subscribe to auth changes once on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setCheckingAuth(false);
        }
      } catch (err) {
        console.error('Failed to initialize Supabase Auth:', err);
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setCheckingAuth(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Enforce redirection when session or pathname changes
  useEffect(() => {
    if (!checkingAuth) {
      const isPublicPath = pathname === '/auth' || pathname === '/';
      if (!session && !isPublicPath) {
        router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [session, pathname, checkingAuth, router]);

  const isPublicPath = pathname === '/auth' || pathname === '/';

  // Prevent rendering protected content while checking auth
  if (checkingAuth && !isPublicPath) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="text-sm font-bold text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <GemsProvider>
      <ActiveLanguageProvider>
        <ToastProvider>
          {session ? (
            <WordStatusProvider>{children}</WordStatusProvider>
          ) : (
            children
          )}
        </ToastProvider>
      </ActiveLanguageProvider>
    </GemsProvider>
  );
}


