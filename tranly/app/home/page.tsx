"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigProvider, Avatar } from "antd";
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

export default function HomePage() {
  const configProps = useIllustrationTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Home");

  return (
    <ConfigProvider {...configProps}>
      {/* Injected CSS Animations for Playful Bouncing Icons & Meteor Showers */}
      <style>{`
        @keyframes floatAndFade1 {
          0% { transform: translate(0px, 0px) rotate(0deg); opacity: 0.08; }
          33% { transform: translate(70px, -50px) rotate(120deg); opacity: 0.35; }
          66% { transform: translate(-50px, 80px) rotate(240deg); opacity: 0.2; }
          100% { transform: translate(0px, 0px) rotate(360deg); opacity: 0.08; }
        }
        @keyframes floatAndFade2 {
          0% { transform: translate(0px, 0px) scale(0.9) rotate(0deg); opacity: 0.12; }
          25% { transform: translate(-80px, 60px) scale(1.15) rotate(-90deg); opacity: 0.45; }
          50% { transform: translate(60px, -90px) scale(0.95) rotate(-180deg); opacity: 0.25; }
          75% { transform: translate(-40px, 70px) scale(1.08) rotate(-270deg); opacity: 0.5; }
          100% { transform: translate(0px, 0px) scale(0.9) rotate(-360deg); opacity: 0.12; }
        }
        @keyframes floatAndFade3 {
          0% { transform: translate(0px, 0px) rotate(0deg); opacity: 0.15; }
          50% { transform: translate(90px, 60px) rotate(180deg); opacity: 0.45; }
          100% { transform: translate(0px, 0px) rotate(360deg); opacity: 0.15; }
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
      `}</style>

      {/* Container matches the absolute screen viewport of the mobile app */}
      <div className="w-full h-dvh bg-white dark:bg-[#1a1a2e] text-[#2C2C2C] dark:text-white flex flex-col relative overflow-hidden font-sans select-none">
        
        {/* Dynamic Meteor Shower - Animated Spinning Icons (Z-0) */}
        <div className="icon-meteor text-[#FFD93D] text-2xl" style={{ top: '8%', right: '5%', animationDelay: '0s', animationDuration: '6s' }}><StarOutlined /></div>
        <div className="icon-meteor text-[#52C41A] text-xl" style={{ top: '18%', right: '18%', animationDelay: '2.5s', animationDuration: '8s' }}><ThunderboltOutlined /></div>
        <div className="icon-meteor text-[#FA5252] text-2xl" style={{ top: '2%', right: '32%', animationDelay: '4s', animationDuration: '5.5s' }}><StarOutlined /></div>
        <div className="icon-meteor text-[#4DABF7] text-xl" style={{ top: '28%', right: '12%', animationDelay: '1.2s', animationDuration: '7s' }}><FireOutlined /></div>
        
        {/* Playful Background Stickers - Auto Wandering Loop (Z-0) */}
        {/* Row 1 */}
        <div className="absolute top-[75px] left-[12%] text-2xl text-[#4DABF7] animate-float-1 z-0 pointer-events-none">
          <SmileOutlined />
        </div>
        <div className="absolute top-[140px] right-[8%] text-3xl text-[#FA5252] animate-float-2 z-0 pointer-events-none">
          <HeartOutlined />
        </div>
        <div className="absolute top-[220px] left-[6%] text-xl text-[#FFD93D] animate-float-3 z-0 pointer-events-none">
          <ThunderboltOutlined />
        </div>
        <div className="absolute top-[280px] right-[14%] text-2xl text-[#52C41A] animate-float-1 z-0 pointer-events-none">
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
        <div className="absolute bottom-[210px] left-[18%] text-2xl text-[#4DABF7] animate-float-2 z-0 pointer-events-none">
          <CloudOutlined />
        </div>
        <div className="absolute bottom-[140px] right-[6%] text-3xl text-[#FFD93D] animate-float-3 z-0 pointer-events-none">
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
          {/* Head Section */}
          <div className="p-[20px_16px_0]">
            <div className="flex items-start justify-between pt-[10px]">
              <div>
                <div 
                  className="font-extrabold text-[28px] tracking-tight leading-[1.1] text-black dark:text-white"
                  style={{ fontFamily: "var(--font-outfit), sans-serif" }}
                >
                  안녕하세요! 👋
                </div>
                <div className="text-black dark:text-white/80 text-sm mt-1 font-bold">
                  Ready to learn Korean today?
                </div>
              </div>
              
              {/* Avatar Pill styled with design.md Neobrutalist theme */}
              <Avatar 
                size={44}
                style={{ 
                  backgroundColor: 'var(--accent-pink-bg)', 
                  color: 'var(--text-primary)', 
                  border: '3px solid var(--border-color)',
                  boxShadow: '2.5px 2.5px 0 var(--shadow-color)',
                  fontSize: '15px',
                  fontWeight: 900,
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                ปา
              </Avatar>
            </div>
          </div>

          {/* Word Feed */}
          <div className="flex-1 mt-2 relative z-10 flex flex-col min-h-0">
            <WordFeed />
          </div>
        </div>

        {/* Tabbar Navigation styled with high contrast border-t */}
        <div 
          className="absolute left-4 right-4 h-[80px] bg-card-bg border-3 border-border-color p-[8px_8px_14px] grid grid-cols-5 z-40 rounded-2xl shadow-[4px_4px_0_#000000] dark:shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
          style={{ bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
        >
          
          {/* Tab: Home */}
          <a 
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === "Home" ? "text-text-primary" : "text-text-secondary"}`}
            onClick={() => setActiveTab("Home")}
          >
            <span className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeTab === "Home" ? "bg-accent-pink-bg border-3 border-border-color shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)]" : "bg-transparent"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">Home</span>
          </a>

          {/* Tab: Learn */}
          <a
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === "Learn" ? "text-text-primary" : "text-text-secondary"}`}
            onClick={() => {
              setActiveTab("Learn");
              router.push("/learn");
            }}
          >
            <span className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeTab === "Learn" ? "bg-accent-pink-bg border-3 border-border-color shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)]" : "bg-transparent"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">Word</span>
          </a>

          {/* Tab: Scan (Camera / File input fallback) */}
          <ScanButton />

          {/* Tab: AI */}
          <a
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === "AI" ? "text-text-primary" : "text-text-secondary"}`}
            onClick={() => {
              setActiveTab("AI");
              router.push("/chat");
            }}
          >
            <span className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeTab === "AI" ? "bg-accent-pink-bg border-3 border-border-color shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)]" : "bg-transparent"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v2" />
                <path d="M12 19v2" />
                <path d="M5 12H3" />
                <path d="M21 12h-2" />
                <path d="M6.3 6.3 4.9 4.9" />
                <path d="M19.1 19.1 17.7 17.7" />
                <path d="M6.3 17.7 4.9 19.1" />
                <path d="M19.1 4.9 17.7 6.3" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">AI</span>
          </a>

          {/* Tab: Profile */}
          <a
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === "Profile" ? "text-text-primary" : "text-text-secondary"}`}
            onClick={() => { setActiveTab("Profile"); router.push("/profile"); }}
          >
            <span className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeTab === "Profile" ? "bg-accent-pink-bg border-3 border-border-color shadow-[2px_2px_0_#000000] dark:shadow-[2px_2px_0_rgba(0,0,0,0.4)]" : "bg-transparent"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            </span>
            <span className="text-[11px] font-bold tracking-wider">Profile</span>
          </a>

        </div>

      </div>
    </ConfigProvider>
  );
}
