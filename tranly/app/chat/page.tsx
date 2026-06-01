'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CameraOutlined, MessageOutlined, BookOutlined } from '@ant-design/icons';
import { message as antdMessage } from 'antd';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import { useActiveLanguage } from '@/app/_lib/ActiveLanguageContext';
import { LANGUAGE_DISPLAY } from '@/app/_lib/languageDisplay';
import { useStrings } from '@/app/_lib/strings';
import { useWordContext } from './_lib/useWordContext';
import { setCapturedImage } from '@/app/scan/_lib/capturedImageStore';
import Mascot from './_components/Mascot';

/**
 * The "AI Scan" hub. It is purely a launchpad: a card for the camera scan, and
 * cards that navigate to the dedicated AI Tutor (`/tutor`) and Flashcard
 * (`/flashcard`) routes. The actual tutor and flashcard experiences live on
 * those routes.
 */
export default function ChatHubPage() {
  const router = useRouter();
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const { activeLanguage } = useActiveLanguage();
  const langDisplay = LANGUAGE_DISPLAY[activeLanguage];
  const t = useStrings();
  const [messageApi, navMessageHolder] = antdMessage.useMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasGetUserMedia, setHasGetUserMedia] = useState(false);

  const { savedWords, loadSavedWords } = useWordContext();

  const [greetingPhase, setGreetingPhase] = useState<'dots' | 'typing' | 'done'>('dots');
  const [shownChars, setShownChars] = useState(0);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Load saved words on mount (drives the flashcard word-count badge / gating).
  useEffect(() => {
    loadSavedWords();
  }, [loadSavedWords]);

  const welcomeText = isThai
    ? `${langDisplay.greeting}! 👋 ยินดีต้อนรับสู่โซนเรียนรู้เชิงรุก วันนี้อยากฝึกภาษา${langDisplay.nameTh}แบบไหนดีจ๊ะ?`
    : `${langDisplay.greeting}! 👋 Welcome to active learning! How would you like to practice ${langDisplay.nameEn} today?`;

  // Start welcome bubble typing animation immediately on mount
  useEffect(() => {
    if (greetingPhase === 'dots') {
      const timer = setTimeout(() => {
        setGreetingPhase('typing');
      }, 700); // 700ms loading dots
      return () => clearTimeout(timer);
    }
  }, [greetingPhase]);

  // Stream characters typewriter-style
  useEffect(() => {
    if (greetingPhase !== 'typing') return;
    const chars = Array.from(welcomeText);
    if (shownChars >= chars.length) {
      setGreetingPhase('done');
      return;
    }
    const timer = setTimeout(() => {
      setShownChars((n) => n + 1);
    }, 18); // 18ms per character for natural typing pace
    return () => clearTimeout(timer);
  }, [greetingPhase, shownChars, welcomeText]);

  // Once greeting finishes typing, show cards skeleton loader for 800ms, then show actual cards
  useEffect(() => {
    if (greetingPhase === 'done') {
      setShowSkeleton(true);
      const timer = setTimeout(() => {
        setShowSkeleton(false);
        setCardsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [greetingPhase]);


  useEffect(() => {
    const supported = !!(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    );
    setHasGetUserMedia(supported);
  }, []);

  const handleCameraScanClick = () => {
    if (hasGetUserMedia) {
      router.push('/scan');
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedImage(file);
      router.push('/scan/preview');
    }
  };

  const wordCount = (savedWords || []).length;

  return (
    <div className="flex flex-col h-dvh bg-background relative">
      {navMessageHolder}

      {/* Local styles for premium silky page-load transitions */}
      <style>{`
        @keyframes cardFadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-card-fade-in {
          animation: cardFadeInUp 0.45s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
        }
      `}</style>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex flex-col gap-3 p-4 overflow-y-auto">
          {/* Welcome Mascot Speech Bubble (Always visible immediately on mount!) */}
          <div className="flex max-w-[85%] items-end gap-2 self-start mb-2 mt-1">
            <Mascot 
              size={52} 
              state={greetingPhase === 'done' ? 'happy' : 'thinking'} 
            />
            <div className="rounded-2xl rounded-tl-md border-3 border-border-color bg-accent-pink-bg px-4 py-3 text-sm font-black text-text-primary shadow-nb-sm min-h-[48px] flex items-center">
              {greetingPhase === 'dots' ? (
                <span className="flex gap-1 py-1 px-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-text-primary [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-text-primary [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-text-primary" />
                </span>
              ) : (
                <span>
                  {greetingPhase === 'typing' 
                    ? Array.from(welcomeText).slice(0, shownChars).join('') 
                    : welcomeText}
                </span>
              )}
            </div>
          </div>

          {/* Cards Section: Skeletons shown ONLY after typing completes */}
          {showSkeleton && (
            <div className="flex flex-col gap-3">
              {/* Injected CSS for Neobrutalist elastic staggered animations */}
              <style>{`
                @keyframes skeletonSlideUp {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                .animate-stagger-1 {
                  animation: skeletonSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                  animation-delay: 80ms;
                  opacity: 0;
                }
                .animate-stagger-2 {
                  animation: skeletonSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                  animation-delay: 160ms;
                  opacity: 0;
                }
                .animate-stagger-3 {
                  animation: skeletonSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                  animation-delay: 240ms;
                  opacity: 0;
                }
              `}</style>

              {/* 3 Card Skeletons */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-4 shadow-nb-md flex items-center gap-4 ${
                    i === 1 ? 'animate-stagger-1' : i === 2 ? 'animate-stagger-2' : 'animate-stagger-3'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl border-3 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shrink-0 animate-pulse flex items-center justify-center shadow-nb-sm" />
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="w-1/3 h-[18px] rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
                    <div className="flex flex-col gap-1 w-full">
                      <div className="w-[90%] h-3 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
                      <div className="w-[70%] h-3 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Real Content Section: Fades in smoothly after skeletons complete */}
          {!cardsLoading && (
            <div className="flex flex-col gap-3 animate-card-fade-in">
              {/* 1. Camera Scan Card */}
              <div
                onClick={handleCameraScanClick}
                className="rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-4 shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm cursor-pointer flex items-center gap-4 group transition-all"
              >
                <span className="w-12 h-12 flex items-center justify-center rounded-xl border-3 border-border-color bg-accent-green text-white shadow-nb-sm group-active:translate-y-[1px]">
                  <CameraOutlined style={{ fontSize: 24 }} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-text-primary">
                    {isThai ? 'กล้องสแกนอัจฉริยะ' : 'Smart Camera Scan'}
                  </h3>
                  <p className="text-xs font-semibold text-text-secondary mt-0.5">
                    {isThai
                      ? 'ถ่ายรูปสิ่งของ ป้าย หรือข้อความ เพื่อแปลและวิเคราะห์ศัพท์ทันที!'
                      : 'Snap objects, signs or books to instantly translate & extract vocab!'}
                  </p>
                </div>
              </div>

              {/* 2. AI Tutor Chat Card */}
              <div
                onClick={() => router.push('/tutor')}
                className="rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-4 shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm cursor-pointer flex items-center gap-4 group transition-all"
              >
                <span className="w-12 h-12 flex items-center justify-center rounded-xl border-3 border-border-color bg-accent-blue text-white shadow-nb-sm group-active:translate-y-[1px]">
                  <MessageOutlined style={{ fontSize: 24 }} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-text-primary">
                    {isThai ? 'แชทติวเตอร์ & บทเรียน' : 'AI Tutor & Custom Lessons'}
                  </h3>
                  <p className="text-xs font-semibold text-text-secondary mt-0.5">
                    {isThai
                      ? 'ฝึกแชทบทสนทนาจำลอง หรือสร้างบทเรียนส่วนตัวแบบจับคู่จับประโยค!'
                      : 'Interactive role-plays or dynamic grammar and vocabulary matching!'}
                  </p>
                </div>
              </div>

              {/* 3. Play Flashcards Card */}
              <div
                onClick={() => {
                  if (wordCount === 0) {
                    messageApi.info(isThai ? 'กรุณาสแกนคำศัพท์เข้าคลังก่อนเริ่มเล่นบัตรคำนะจ๊ะ!' : 'Please scan and save some words first!');
                    return;
                  }
                  router.push('/flashcard');
                }}
                className={`rounded-2xl border-3 border-border-color p-4 shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm cursor-pointer flex items-center gap-4 group transition-all bg-white dark:bg-[#2d2d44] ${
                  wordCount === 0 ? 'opacity-60' : ''
                }`}
              >
                <span className="w-12 h-12 flex items-center justify-center rounded-xl border-3 border-border-color bg-accent-yellow text-black shadow-nb-sm group-active:translate-y-[1px]">
                  <BookOutlined style={{ fontSize: 24 }} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                    <span>{isThai ? 'เล่นทวนบัตรคำศัพท์' : 'Play Flashcards'}</span>
                    <span className="inline-block rounded-md border border-border-color bg-accent-pink-bg px-1.5 py-0.2 text-[10px] font-black text-text-primary">
                      {wordCount} {isThai ? 'คำ' : 'words'}
                    </span>
                  </h3>
                  <p className="text-xs font-semibold text-text-secondary mt-0.5">
                    {isThai
                      ? 'ทบทวนคำศัพท์ที่บันทึกมาด้วยแฟลชการ์ดสุ่มคำศัพท์สนุกสนาน!'
                      : 'Master your saved vocabulary bank through spaced flipping card tests!'}
                  </p>
                </div>
              </div>

              {/* Hidden file input for non-secure context fallback */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </main>

      {/* Bottom nav bar */}
      <div
        className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-4 z-40 rounded-2xl shadow-nb-md"
        style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Tab 1: Home */}
        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary transition-colors"
          onClick={() => router.push("/home")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabHome}</span>
        </a>

        {/* Tab 2: Library */}
        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary transition-colors"
          onClick={() => router.push("/library")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabLibrary}</span>
        </a>

        {/* Tab 3: AI Scan (ACTIVE) */}
        <a className="flex flex-col items-center gap-1 cursor-pointer text-text-primary transition-colors">
          <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-pink-bg border-3 border-border-color shadow-nb-sm transition-all">
            <svg width="22" height="22" viewBox="0 0 18 18" shapeRendering="crispEdges" style={{ display: 'block' }}>
              <rect x="6" y="1" width="1" height="2" fill="currentColor" />
              <rect x="11" y="1" width="1" height="2" fill="currentColor" />
              <rect x="1" y="6" width="3" height="6" fill="currentColor" />
              <rect x="14" y="6" width="3" height="6" fill="currentColor" />
              <rect x="4" y="3" width="10" height="10" fill="currentColor" />
              <rect x="8" y="13" width="2" height="4" fill="currentColor" />
              <rect x="5" y="13" width="2" height="2" fill="currentColor" />
              <rect x="11" y="13" width="2" height="2" fill="currentColor" />
              <rect x="7" y="7" width="1" height="2" fill="#0b3d66" />
              <rect x="10" y="7" width="1" height="2" fill="#0b3d66" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabAIScan}</span>
        </a>

        {/* Tab 4: Profile */}
        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary transition-colors"
          onClick={() => router.push("/profile")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl transition-all">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">{t.common.tabProfile}</span>
        </a>
      </div>
    </div>
  );
}
