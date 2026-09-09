'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  Book,
  MoreHorizontal,
  Pencil,
  MessageCircle,
  PlayCircle,
} from 'lucide-react';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useConversationHistory } from '@/shared/hooks/useConversationHistory';
import { useStrings } from '@/shared/utils/strings';
import { supabase } from '@/shared/supabase/supabaseClient';
import SlothMascot from '@/shared/components/mascots/SlothMascot';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  onNewChat?: () => void;
  showNewChatButton?: boolean;
  rightElement?: React.ReactNode;
  /** When true, replaces the hamburger menu with a back arrow. */
  showBackButton?: boolean;
  /** Path for the back button. Defaults to router.back(). */
  backPath?: string;
  /** When true, prevents main from scrolling (useful when child has its own scroll container). */
  noScroll?: boolean;
}

interface DrawerContentProps {
  setDrawerOpen: (open: boolean) => void;
  onNewChat?: () => void;
}

const NAV_ITEM_ACTIVE = 'bg-primary-bg text-primary font-semibold';
const NAV_ITEM_INACTIVE = 'text-foreground/75 hover:bg-card-bg/60 hover:text-foreground';

/** Shared active/inactive classes for sidebar nav items. */
function navItemClass(isActive: boolean): string {
  return isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE;
}

function DrawerContent({ setDrawerOpen, onNewChat }: DrawerContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { displayName } = useUserProfile();
  const { sessions, loadSessions } = useConversationHistory();
  const t = useStrings();
  const [email, setEmail] = useState<string | null>(null);

  const navLinks = [
    { label: t.drawer.navChat, path: '/recents', icon: <MessageCircle size={18} stroke="url(#nav-icon-grad)" /> },
    { label: t.drawer.navWords, path: '/words', icon: <Book size={18} stroke="url(#nav-icon-grad)" /> },
    { label: t.drawer.navRefresh, path: '/refresh', icon: <PlayCircle size={18} stroke="url(#nav-icon-grad)" /> },
  ];

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        setEmail(user?.email || null);
      } catch (err) {
        console.error("Error checking user in DrawerContent:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleNav = (path: string) => {
    setDrawerOpen(false);
    router.push(path);
  };

  const handleNewChatClick = () => {
    setDrawerOpen(false);
    if (onNewChat) {
      onNewChat();
    } else {
      router.push('/new');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hidden SVG Gradient Definition for Sidebar Icons */}
      <svg width="0" height="0" className="absolute pointer-events-none" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="nav-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f8df7" />
            <stop offset="100%" stopColor="#1b62d1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <span className="text-xl font-black tracking-tight font-sans bg-gradient-to-br from-[#4f8df7] to-[#1b62d1] bg-clip-text text-transparent">
          {t.common.appName}
        </span>
      </div>

      {/* New Chat List Item */}
      <button
        type="button"
        onClick={handleNewChatClick}
        className={`w-full flex items-center gap-3.5 px-5 py-2.5 rounded-xl text-[15px] font-medium transition-colors duration-200 cursor-pointer mb-5 ${navItemClass(pathname === '/new')}`}
      >
        <Pencil size={18} stroke="url(#nav-icon-grad)" />
        <span>{t.drawer.newChat}</span>
      </button>

      {/* Core Navigation Links */}
      <div className="flex flex-col gap-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.path;
          return (
            <button
              key={link.path}
              type="button"
              onClick={() => handleNav(link.path)}
              className={`w-full flex items-center gap-3.5 px-5 py-2.5 rounded-xl text-[15px] font-medium transition-colors duration-200 cursor-pointer ${navItemClass(isActive)}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recent Conversations */}
      {sessions.length > 0 && (
        <div className="flex flex-col gap-1 mt-6 flex-1 min-h-0 overflow-y-auto pt-4">
          <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider px-5 mb-1.5">
            {t.drawer.recent}
          </p>
          <div className="flex flex-col gap-0.5">
            {sessions.slice(0, 8).map((s) => {
              const isSessionActive = pathname === `/chat/${s.id}`;
              return (
                <div
                  key={s.id}
                  className={`group relative flex items-center w-full rounded-xl transition-colors duration-200 px-5 py-2 text-[15px] cursor-pointer ${navItemClass(isSessionActive)}`}
                >
                  <span
                    onClick={() => {
                      setDrawerOpen(false);
                      router.push(`/chat/${s.id}`);
                    }}
                    className="flex-1 truncate text-left font-normal"
                  >
                    {s.topic || t.drawer.untitledChat}
                  </span>
                </div>
              );
            })}
            {/* All chats → full recents page */}
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                router.push('/recents');
              }}
              className={`flex items-center gap-3.5 w-full rounded-xl px-5 py-2 text-[15px] font-medium transition-colors duration-200 cursor-pointer ${
                pathname === '/recents'
                  ? 'bg-primary-bg text-primary font-semibold'
                  : 'text-primary hover:bg-card-bg/60'
              }`}
            >
              <MoreHorizontal size={18} className="rounded-full border border-current p-0.5" />
              <span>{t.drawer.allChats}</span>
            </button>
          </div>
        </div>
      )}

      {/* User Profile Footer */}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={() => handleNav('/profile')}
          className={`flex items-center gap-3.5 min-w-0 text-left px-4 py-3.5 w-full rounded-2xl border border-border-color bg-card-bg shadow-soft-sm transition-all cursor-pointer active:scale-[0.99] ${
            pathname === '/profile'
              ? 'border-primary/40 bg-primary-bg/10 font-semibold'
              : 'text-foreground/80 hover:bg-card-bg/70'
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary-bg bg-primary-bg/40">
            <SlothMascot size={34} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-foreground leading-tight">
              {displayName}
            </p>
            <p className="truncate text-xs text-foreground/70 leading-normal">{email || ''}</p>
          </div>
          <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold bg-foreground text-background">
            {t.profile.badgeMember}
          </span>
        </button>
      </div>
    </div>
  );
}

export default function AppShell({
  children,
  title,
  onNewChat,
  rightElement,
  showBackButton,
  backPath,
  noScroll = false,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = useStrings();

  const getPageTitle = () => {
    if (title) return title;
    if (pathname === '/new' || pathname.startsWith('/chat/')) return '';
    if (pathname === '/words') return t.layout.wordsTitle;
    if (pathname === '/profile') return t.layout.profileTitle;
    return t.common.appName;
  };

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground relative font-sans select-none">
      {/* Header */}
      <header
        className="flex items-center justify-between gap-3 px-4 pb-3 z-30"
        style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}
      >
        {showBackButton ? (
          <button
            type="button"
            onClick={() => backPath ? router.push(backPath) : router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-all cursor-pointer hover:bg-card-bg active:scale-95"
            aria-label={t.layout.backAria}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-all cursor-pointer hover:bg-card-bg active:scale-95"
            aria-label={t.layout.menuAria}
          >
            <Menu size={16} />
          </button>
        )}

        <span className={`text-base font-bold ${getPageTitle() === t.common.appName ? 'bg-gradient-to-br from-[#4f8df7] to-[#1b62d1] bg-clip-text text-transparent font-extrabold' : 'text-foreground'}`}>
          {getPageTitle()}
        </span>

        {rightElement ? rightElement : <div className="w-10 h-10" />}
      </header>

      {/* Main content body */}
      <main className={`flex-1 relative flex flex-col min-h-0 ${noScroll ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {children}
      </main>

      {/* Sidebar Drawer */}
      {/* Backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      {/* Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] overflow-hidden rounded-r-2xl bg-card-bg text-foreground shadow-soft-xl transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ padding: '24px 16px' }}
      >
        {drawerOpen && (
          <Suspense fallback={<div className="p-4 text-center text-xs text-gray-400">{t.layout.loadingMenu}</div>}>
            <DrawerContent setDrawerOpen={setDrawerOpen} onNewChat={onNewChat} />
          </Suspense>
        )}
      </aside>
    </div>
  );
}
