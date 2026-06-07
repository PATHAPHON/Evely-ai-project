'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BookOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { ConfigProvider, message as antdMessage } from 'antd';
import useIllustrationTheme from '@/app/theme/illustrationTheme';
import { supabase } from '@/app/_lib/supabaseClient';

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const configProps = useIllustrationTheme();
  
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.is_anonymous) {
          router.replace('/auth?redirect=/backoffice');
          return;
        }

        // Fetch user profile to verify role
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (
          profileErr ||
          !profile ||
          (profile.role !== 'admin' && session.user.email !== 'admin@tranly.com')
        ) {
          antdMessage.error('คุณไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน');
          router.replace('/home');
          return;
        }

        setUserEmail(session.user.email || null);
        setCheckingAuth(false);
      } catch (err) {
        console.error('Failed to authenticate in backoffice layout:', err);
        router.replace('/auth?redirect=/backoffice');
      }
    };

    checkAuth();
  }, [router]);

  // Logout handler
  const handleLogout = async () => {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
      await supabase.auth.signOut();
      antdMessage.success('ออกจากระบบสำเร็จ');
      router.push('/auth');
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FFF9F0] text-black font-bold">
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  // Determine which page is active
  const isLessonsActive = pathname.startsWith('/backoffice/lessons');
  const isTopikActive = pathname.startsWith('/backoffice/topik');

  return (
    <ConfigProvider {...configProps}>
      <div className="flex h-dvh bg-background overflow-hidden font-sans select-none text-foreground">
        
        {/* Left Sidebar with Neobrutalist styling */}
        <aside className="w-[280px] bg-white dark:bg-[#1a1a2e] border-r-3 border-border-color flex flex-col h-full z-20 shrink-0">
          {/* Sidebar Header */}
          <div className="p-5 border-b-3 border-border-color bg-white dark:bg-[#1a1a2e] flex flex-col gap-1">
            <span className="text-[10px] font-black tracking-widest text-accent-red uppercase">
              Tarnly Korean
            </span>
            <h2 className="text-lg font-black text-text-primary">
              ระบบหลังบ้าน
            </h2>
            <span className="text-[10px] font-semibold text-text-secondary truncate block">
              {userEmail || 'admin@tarnly.com'}
            </span>
          </div>

          {/* Sidebar Menu Links */}
          <nav className="flex-1 p-4 flex flex-col gap-3.5 overflow-y-auto">
            {/* Manage Lessons */}
            <button
              type="button"
              onClick={() => router.push('/backoffice/lessons')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-3 font-bold text-sm transition-all shadow-nb-sm active:translate-y-[1px] cursor-pointer ${
                isLessonsActive
                  ? 'bg-accent-pink-bg border-border-color text-text-primary'
                  : 'bg-white dark:bg-[#2d2d44] border-border-color text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <BookOutlined style={{ fontSize: 16 }} />
              <span>จัดการบทเรียน</span>
            </button>

            {/* Manage TOPIK */}
            <button
              type="button"
              onClick={() => router.push('/backoffice/topik')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-3 font-bold text-sm transition-all shadow-nb-sm active:translate-y-[1px] cursor-pointer ${
                isTopikActive
                  ? 'bg-accent-pink-bg border-border-color text-text-primary'
                  : 'bg-white dark:bg-[#2d2d44] border-border-color text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <AuditOutlined style={{ fontSize: 16 }} />
              <span>จัดการข้อสอบ TOPIK</span>
            </button>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t-3 border-border-color bg-white dark:bg-[#1a1a2e] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => router.push('/chat-lessons')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] text-text-primary text-xs font-black shadow-nb-sm transition-all active:translate-y-[1px] cursor-pointer"
            >
              <ArrowLeftOutlined />
              <span>กลับไปที่ห้องเรียน</span>
            </button>
            
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-3 border-border-color bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs font-black shadow-nb-sm transition-all active:translate-y-[1px] cursor-pointer"
            >
              <LogoutOutlined />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-[#FFF9F0] dark:bg-[#1a1a2e] overflow-hidden relative">
          {children}
        </div>
      </div>
    </ConfigProvider>
  );
}
