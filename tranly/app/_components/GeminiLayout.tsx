'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  MenuOutlined,
  DeleteOutlined,
  BookOutlined,
  SettingOutlined,
  EditOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useUserProfile } from '@/app/_lib/useUserProfile';
import { useConversationHistory } from '@/app/chat/_lib/useConversationHistory';
import { useStrings } from '@/app/_lib/strings';
import { Drawer } from 'antd';

interface GeminiLayoutProps {
  children: React.ReactNode;
  title?: string;
  onNewChat?: () => void;
  showNewChatButton?: boolean;
  rightElement?: React.ReactNode;
}

interface DrawerContentProps {
  setDrawerOpen: (open: boolean) => void;
  onNewChat?: () => void;
}

function DrawerContent({ setDrawerOpen, onNewChat }: DrawerContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { displayName, avatarInitial } = useUserProfile();
  const { sessions, loadSessions, deleteSession } = useConversationHistory();
  const t = useStrings();

  const navLinks = [
    { label: t.drawer.navChat, path: '/chat', icon: <MessageOutlined style={{ fontSize: 18 }} /> },
    { label: t.drawer.navWords, path: '/words', icon: <BookOutlined style={{ fontSize: 18 }} /> },
  ];

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleNav = (path: string) => {
    setDrawerOpen(false);
    router.push(path);
  };

  const handleNewChatClick = () => {
    setDrawerOpen(false);
    if (onNewChat) {
      onNewChat();
    } else {
      router.push('/chat');
    }
  };

  const currentSession = searchParams.get('session');

  return (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <span className="text-xl font-bold tracking-tight text-gray-800 dark:text-white font-sans">
          Gemini
        </span>
      </div>

      {/* New Chat List Item */}
      <button
        type="button"
        onClick={handleNewChatClick}
        className={`w-full flex items-center gap-3.5 px-5 py-2.5 rounded-full text-[15px] font-medium transition-colors duration-200 cursor-pointer mb-5 text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e1e3e1]/50 dark:hover:bg-[#3c4043]/40 ${
          pathname === '/chat' && !currentSession
            ? 'bg-[#e9eef6] text-[#1a1a1a] font-semibold dark:bg-[#004a77]/30 dark:text-[#c2e7ff]'
            : ''
        }`}
      >
        <EditOutlined style={{ fontSize: 18 }} />
        <span>{t.drawer.newChat}</span>
      </button>

      {/* Core Navigation Links */}
      <div className="flex flex-col gap-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.path && !(link.path === '/chat' && currentSession);
          return (
            <button
              key={link.path}
              type="button"
              onClick={() => handleNav(link.path)}
              className={`w-full flex items-center gap-3.5 px-5 py-2.5 rounded-full text-[15px] font-medium transition-colors duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#e9eef6] text-[#1a1a1a] font-semibold dark:bg-[#004a77]/30 dark:text-[#c2e7ff]'
                  : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e1e3e1]/50 dark:hover:bg-[#3c4043]/40'
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recent Conversations */}
      {sessions.length > 0 && (
        <div className="flex flex-col gap-1 mt-6 flex-1 min-h-0 overflow-y-auto pt-4 border-t border-gray-200/50 dark:border-gray-800/40">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 mb-1.5">
            {t.drawer.recent}
          </p>
          <div className="flex flex-col gap-0.5">
            {sessions.slice(0, 15).map((s) => {
              const isSessionActive = pathname === '/chat' && currentSession === s.id;
              return (
                <div
                  key={s.id}
                  className={`group relative flex items-center w-full rounded-full transition-colors duration-200 px-5 py-2 text-[15px] cursor-pointer ${
                    isSessionActive
                      ? 'bg-[#e9eef6] text-[#1a1a1a] font-semibold dark:bg-[#004a77]/30 dark:text-[#c2e7ff]'
                      : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e1e3e1]/50 dark:hover:bg-[#3c4043]/40'
                  }`}
                >
                  <span
                    onClick={() => {
                      setDrawerOpen(false);
                      router.push(`/chat?session=${s.id}`);
                    }}
                    className="flex-1 truncate text-left pr-6 font-normal"
                  >
                    {s.topic || t.drawer.untitledChat}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteSession(s.id);
                    }}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 rounded-full transition-all cursor-pointer bg-white/95 dark:bg-[#1e1f20]/95 shadow-sm"
                    aria-label="Delete history"
                  >
                    <DeleteOutlined style={{ fontSize: 11 }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Profile Footer */}
      <div className="mt-auto border-t border-gray-200/50 dark:border-gray-800/40 pt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => handleNav('/profile')}
          className={`flex items-center gap-3 min-w-0 text-left p-1.5 rounded-full transition-all cursor-pointer flex-1 ${
            pathname === '/profile'
              ? 'bg-[#e9eef6] text-[#1a1a1a] dark:bg-[#004a77]/30 dark:text-[#c2e7ff] font-semibold'
              : 'hover:bg-[#e1e3e1]/50 dark:hover:bg-[#3c4043]/40 text-[#444746] dark:text-[#c4c7c5]'
          }`}
        >
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 dark:from-pink-600 dark:to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {avatarInitial}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate leading-tight">
              {displayName}
            </span>
            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1 py-0.5 rounded w-max mt-0.5 tracking-wider">
              PRO
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setDrawerOpen(false);
            router.push('/profile');
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-[#e1e3e1]/50 dark:hover:bg-[#3c4043]/40 hover:text-gray-800 dark:hover:text-gray-200 transition-all cursor-pointer active:scale-95 flex-shrink-0"
          aria-label={t.drawer.settingsAria}
        >
          <SettingOutlined style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

export default function GeminiLayout({
  children,
  title,
  onNewChat,
  rightElement,
}: GeminiLayoutProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getPageTitle = () => {
    if (title) return title;
    if (pathname === '/chat') return '';
    if (pathname === '/words') return 'คำศัพท์สะสม';
    if (pathname === '/profile') return 'โปรไฟล์ของคุณ';
    return 'Tarnly';
  };

  return (
    <div className="flex flex-col h-dvh text-gray-900 dark:text-gray-100 relative font-sans select-none">
      {/* Header */}
      <header
        className="flex items-center justify-between gap-3 px-4 pb-3 z-30"
        style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 dark:text-gray-200 transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95"
          aria-label="เมนูหลัก"
        >
          <MenuOutlined style={{ fontSize: 16 }} />
        </button>

        <span className="text-base font-bold text-gray-900 dark:text-white">
          {getPageTitle()}
        </span>

        {rightElement ? rightElement : <div className="w-10 h-10" />}
      </header>

      {/* Main content body */}
      <main className="flex-1 overflow-y-auto relative flex flex-col min-h-0">
        {children}
      </main>

      {/* Gemini Style Sidebar Drawer */}
      <Drawer
        placement="left"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        closable={false}
        destroyOnClose={true}
        styles={{
          body: { padding: '24px 16px', background: 'transparent' },
          wrapper: { borderTopRightRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
          content: { borderTopRightRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
        }}
        width={280}
        className="dark:bg-[#1e1f20] bg-[#f0f4f9] text-gray-900 dark:text-gray-100 [&_.ant-drawer-content]:bg-[#f0f4f9] dark:[&_.ant-drawer-content]:bg-[#1e1f20]"
      >
        <Suspense fallback={<div className="p-4 text-center text-xs text-gray-400">Loading menu...</div>}>
          <DrawerContent setDrawerOpen={setDrawerOpen} onNewChat={onNewChat} />
        </Suspense>
      </Drawer>
    </div>
  );
}
