"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigProvider } from "antd";
import { 
  SmileOutlined, 
  HeartOutlined, 
  ThunderboltOutlined, 
  StarOutlined, 
  CrownOutlined, 
  RocketOutlined,
  FireOutlined,
  CompassOutlined,
  BookOutlined,
  GiftOutlined,
  CloudOutlined,
  TrophyOutlined,
  CoffeeOutlined,
  BulbOutlined
} from "@ant-design/icons";
import useIllustrationTheme from "@/app/theme/illustrationTheme";
import ScanButton from "@/app/scan/_components/ScanButton";
import WordFeed from "@/app/home/_components/WordFeed";
import { useStrings } from "@/app/_lib/strings";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";

export default function HomePage() {
  const configProps = useIllustrationTheme();
  const router = useRouter();
  const t = useStrings();
  const { language } = useLanguagePreference();
  const isThai = language === "thai";
  const [activeTab, setActiveTab] = useState("Home");

  return (
    <ConfigProvider {...configProps}>
      {/* Injected CSS Animations for Playful Bouncing Icons & Meteor Showers */}
      <style>{`
        @keyframes floatAndFade1 {
          0% { transform: translate(0px, 0px) rotate(0deg); opacity: 0.05; }
          33% { transform: translate(70px, -50px) rotate(120deg); opacity: 0.18; }
          66% { transform: translate(-50px, 80px) rotate(240deg); opacity: 0.12; }
          100% { transform: translate(0px, 0px) rotate(360deg); opacity: 0.05; }
        }
        @keyframes floatAndFade2 {
          0% { transform: translate(0px, 0px) scale(0.9) rotate(0deg); opacity: 0.07; }
          25% { transform: translate(-80px, 60px) scale(1.15) rotate(-90deg); opacity: 0.22; }
          50% { transform: translate(60px, -90px) scale(0.95) rotate(-180deg); opacity: 0.14; }
          75% { transform: translate(-40px, 70px) scale(1.08) rotate(-270deg); opacity: 0.24; }
          100% { transform: translate(0px, 0px) scale(0.9) rotate(-360deg); opacity: 0.07; }
        }
        @keyframes floatAndFade3 {
          0% { transform: translate(0px, 0px) rotate(0deg); opacity: 0.08; }
          50% { transform: translate(90px, 60px) rotate(180deg); opacity: 0.22; }
          100% { transform: translate(0px, 0px) rotate(360deg); opacity: 0.08; }
        }
        @keyframes iconMeteorAnimation {
          0% { transform: translate(0, 0) rotate(0deg) scale(0); opacity: 0; }
          4% { opacity: 0.9; transform: translate(-20px, 15px) rotate(120deg) scale(1.3); }
          25% { transform: translate(-200px, 150px) rotate(720deg) scale(0.6); opacity: 0; }
          100% { transform: translate(-200px, 150px) rotate(720deg) scale(0); opacity: 0; }
        }
        .icon-meteor {
          position: absolute;
          opacity: 0;
          animation: iconMeteorAnimation 8s infinite linear;
          pointer-events: none;
          z-index: 0;
        }
        .animate-float-1 { animation: floatAndFade1 9s infinite ease-in-out; }
        .animate-float-2 { animation: floatAndFade2 12s infinite ease-in-out; }
        .animate-float-3 { animation: floatAndFade3 10s infinite ease-in-out; }
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
        /* Respect users who prefer reduced motion: stop all decorative
           animation and hide the purely-ornamental icons entirely. */
        @media (prefers-reduced-motion: reduce) {
          .animate-float-1, .animate-float-2, .animate-float-3, .icon-meteor {
            animation: none !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      {/* Container matches the absolute screen viewport of the mobile app */}
      <div className="w-full h-dvh bg-white dark:bg-[#1a1a2e] text-[#2C2C2C] dark:text-white flex flex-col relative overflow-hidden font-sans select-none">
        
        {/* Dynamic Meteor Shower - Animated Spinning Icons (Z-0) */}
        <div className="icon-meteor text-accent-yellow text-2xl" style={{ top: '8%', right: '5%', animationDelay: '0s', animationDuration: '6s' }}><StarOutlined /></div>
        <div className="icon-meteor text-accent-green text-xl" style={{ top: '18%', right: '18%', animationDelay: '2.5s', animationDuration: '8s' }}><ThunderboltOutlined /></div>
        <div className="icon-meteor text-accent-red text-2xl" style={{ top: '2%', right: '32%', animationDelay: '4s', animationDuration: '5.5s' }}><StarOutlined /></div>
        <div className="icon-meteor text-accent-blue text-xl" style={{ top: '28%', right: '12%', animationDelay: '1.2s', animationDuration: '7s' }}><FireOutlined /></div>
        
        {/* Playful Background Stickers - Auto Wandering Loop (Z-0) */}
        {/* Row 1 */}
        <div className="absolute top-[75px] left-[12%] text-2xl text-accent-blue animate-float-1 z-0 pointer-events-none">
          <SmileOutlined />
        </div>
        <div className="absolute top-[140px] right-[8%] text-3xl text-accent-red animate-float-2 z-0 pointer-events-none">
          <HeartOutlined />
        </div>
        <div className="absolute top-[220px] left-[6%] text-xl text-accent-yellow animate-float-3 z-0 pointer-events-none">
          <ThunderboltOutlined />
        </div>
        <div className="absolute top-[280px] right-[14%] text-2xl text-accent-green animate-float-1 z-0 pointer-events-none">
          <StarOutlined />
        </div>

        {/* Row 2 */}
        <div className="absolute top-[370px] left-[15%] text-2xl text-orange-400 animate-float-2 z-0 pointer-events-none">
          <CrownOutlined />
        </div>
        <div className="absolute top-[440px] right-[20%] text-xl text-purple-400 animate-float-3 z-0 pointer-events-none">
          <RocketOutlined />
        </div>
        <div className="absolute top-[520px] left-[8%] text-2xl text-red-500 animate-float-1 z-0 pointer-events-none">
          <FireOutlined />
        </div>
        <div className="absolute top-[590px] right-[10%] text-xl text-indigo-500 animate-float-2 z-0 pointer-events-none">
          <CompassOutlined />
        </div>

        {/* Row 3 */}
        <div className="absolute bottom-[360px] left-[10%] text-2xl text-emerald-500 animate-float-3 z-0 pointer-events-none">
          <BookOutlined />
        </div>
        <div className="absolute bottom-[280px] right-[12%] text-2xl text-pink-500 animate-float-1 z-0 pointer-events-none">
          <GiftOutlined />
        </div>
        <div className="absolute bottom-[210px] left-[18%] text-2xl text-accent-blue animate-float-2 z-0 pointer-events-none">
          <CloudOutlined />
        </div>
        <div className="absolute bottom-[140px] right-[6%] text-3xl text-accent-yellow animate-float-3 z-0 pointer-events-none">
          <TrophyOutlined />
        </div>

        {/* Extras */}
        <div className="absolute top-[300px] left-[25%] text-lg text-yellow-600 animate-float-1 z-0 pointer-events-none">
          <BulbOutlined />
        </div>
        <div className="absolute bottom-[440px] right-[25%] text-xl text-[#2C2C2C] animate-float-2 z-0 pointer-events-none">
          <CoffeeOutlined />
        </div>
        
        {/* Scroll Container */}
        <div 
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
        >
          /* Word Feed */
          <div className="flex-1 mt-2 relative z-10 flex flex-col min-h-0 animate-card-fade-in">
            <WordFeed />
          </div>
        </div>

        {/* Tabbar Navigation styled with high contrast border-t */}
        <div 
          className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-4 z-40 rounded-2xl shadow-nb-md"
          style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
        >
          
          {/* Tab: Home (ACTIVE) */}
          <a className="flex flex-col items-center gap-1 cursor-pointer text-text-primary transition-colors">
            <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-pink-bg border-3 border-border-color shadow-nb-sm transition-all">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">{t.common.tabHome}</span>
          </a>

          {/* Tab: Library */}
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

          {/* Tab: AI Scan */}
          <a
            className="flex flex-col items-center gap-1 cursor-pointer text-text-secondary transition-colors"
            onClick={() => router.push("/chat")}
          >
            <span className="w-10 h-10 flex items-center justify-center rounded-xl transition-all">
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

          {/* Tab: Profile */}
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
    </ConfigProvider>
  );
}
