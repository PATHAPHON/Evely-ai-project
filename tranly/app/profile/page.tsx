"use client";

import { useRouter } from "next/navigation";
import ScanButton from "@/app/scan/_components/ScanButton";
import { useLanguagePreference, type TranslationLanguage } from "@/app/_lib/useLanguagePreference";

const LANGUAGE_OPTIONS: { value: TranslationLanguage; label: string; description: string }[] = [
  { value: 'thai', label: 'Thai', description: 'Show Thai translation & pronunciation' },
  { value: 'english', label: 'English', description: 'Show English translation only' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguagePreference();

  return (
    <div className="w-full h-dvh bg-white text-[#2C2C2C] flex flex-col relative overflow-hidden font-sans select-none">
      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="p-[20px_16px_0]">
          <div className="pt-[10px]">
            <div
              className="font-extrabold text-[28px] tracking-tight leading-[1.1] text-black"
              style={{ fontFamily: "var(--font-outfit), sans-serif" }}
            >
              Profile
            </div>
            <div className="text-black text-sm mt-1 font-bold">
              Customize your learning experience
            </div>
          </div>
        </div>

        <div className="px-4 mt-6 flex flex-col gap-4">
          {/* Translation Language */}
          <div className="rounded-2xl border-3 border-black bg-white p-4 shadow-[4px_4px_0_#000000]">
            <p className="text-sm font-semibold text-black mb-3">Translation Language</p>
            <div className="flex flex-col gap-2">
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = language === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLanguage(option.value)}
                    className={`w-full rounded-xl border-3 border-black px-4 py-3 text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#52C41A] text-white shadow-[2px_2px_0_#000000] translate-x-[2px] translate-y-[2px]'
                        : 'bg-white text-black shadow-[4px_4px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000000]'
                    }`}
                  >
                    <span className="font-bold">{option.label}</span>
                    <span className={`ml-2 text-sm ${isActive ? 'text-white/80' : 'text-black/50'}`}>
                      — {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav bar */}
      <div
        className="absolute left-4 right-4 h-[80px] bg-white border-3 border-black p-[8px_8px_14px] grid grid-cols-5 z-40 rounded-2xl shadow-[4px_4px_0_#000000]"
        style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-black/40"
          onClick={() => router.push("/home")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">Home</span>
        </a>

        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-black/40"
          onClick={() => router.push("/learn")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">Word</span>
        </a>

        <ScanButton />

        <a
          className="flex flex-col items-center gap-1 cursor-pointer text-black/40"
          onClick={() => router.push("/chat")}
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-xl">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v2" /><path d="M12 19v2" /><path d="M5 12H3" /><path d="M21 12h-2" />
              <path d="M6.3 6.3 4.9 4.9" /><path d="M19.1 19.1 17.7 17.7" />
              <path d="M6.3 17.7 4.9 19.1" /><path d="M19.1 4.9 17.7 6.3" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">AI</span>
        </a>

        <a className="flex flex-col items-center gap-1 cursor-pointer text-black">
          <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FFF0F6] border-3 border-black shadow-[2px_2px_0_#000000]" style={{boxShadow: '2px 2px 0 #000000'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
          </span>
          <span className="text-[11px] font-bold tracking-wider">Profile</span>
        </a>
      </div>
    </div>
  );
}
