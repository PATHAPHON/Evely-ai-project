"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import ElephantMascot from "@/shared/components/mascots/ElephantMascot";

export default function Hero() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const runAnimation = () => {
      if (animStep === 0) {
        timer = setTimeout(() => setAnimStep(1), 1500); // AI finishes typing
      } else if (animStep === 1) {
        timer = setTimeout(() => setAnimStep(2), 2500); // User message appears
      } else if (animStep === 2) {
        timer = setTimeout(() => setAnimStep(3), 2500); // Highlight word & show tooltip
      } else if (animStep === 3) {
        timer = setTimeout(() => setAnimStep(4), 4500); // Hold state
      } else if (animStep === 4) {
        timer = setTimeout(() => setAnimStep(0), 1500); // Restart loop
      }
    };
    runAnimation();
    return () => clearTimeout(timer);
  }, [animStep]);

  return (
    <section className="dot-grid-bg relative flex flex-col items-center overflow-hidden px-6 pt-16 text-center sm:pt-24 pb-0 min-h-[calc(100dvh-4.5rem)]">
      {/* Content wrapper */}
      <div className="flex flex-col items-center max-w-3xl mb-auto z-10">
        <h1 className="max-w-3xl text-5xl font-black leading-tight text-foreground sm:text-7xl">
          คุยกับ AI เป็น<span className="text-primary">ภาษาอังกฤษ</span>
          <br />
          แตะทุกคำที่ไม่รู้
        </h1>

        <p className="max-w-xl text-lg font-semibold text-foreground/70 mt-6">
          ฝึกสนทนาภาษาอังกฤษกับ AI ทุกวัน แตะคำไหนก็ได้เพื่อดูความหมาย
          เก็บลงคลังคำ แล้วทบทวนด้วยระบบ spaced repetition
        </p>

        <div className="flex flex-col gap-3 sm:flex-row mt-8">
          <button
            type="button"
            onClick={() => router.push("/auth")}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold uppercase tracking-wide text-white shadow-soft-md transition-transform hover:bg-primary-hover active:scale-[0.98] dark:text-gray-900 cursor-pointer"
          >
            <Rocket size={18} />
            เริ่มเรียนฟรี
          </button>
          <a
            href="#pricing"
            className="flex items-center justify-center rounded-xl border border-border-color bg-card-bg px-6 py-3 font-semibold text-foreground/80 transition-colors hover:text-foreground"
          >
            ดูราคา
          </a>
        </div>
      </div>

      {/* Spacer to prevent overlaps and push content up slightly */}
      <div className="h-[200px] sm:h-[260px] w-full shrink-0" />

      {/* desktop app window mockup */}
      <div
        className="absolute bottom-0 left-1/2 w-[320px] h-[240px] sm:w-[560px] sm:h-[360px] flex flex-col rounded-t-2xl border-t border-x border-white/20 dark:border-white/10 bg-card-bg/40 backdrop-blur-xl shadow-soft-xl transition-transform duration-100 ease-out z-10 overflow-hidden"
        style={{
          transform: `translateX(-50%) translateY(${Math.max(0, 50 - scrollY * 0.15)}%) scale(${Math.min(1, 0.9 + (scrollY / 400) * 0.1)})`,
        }}
      >
        {/* Window Top Header Bar */}
        <div className="flex items-center h-10 border-b border-border-color bg-background/20 px-4 shrink-0 justify-between select-none">
          {/* Windows controls */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          {/* App title */}
          <div className="text-[10px] font-bold text-foreground/50 tracking-wider">
            Tarnly AI Desk
          </div>
          {/* Placeholder for symmetry */}
          <div className="w-12" />
        </div>

        {/* Window Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Mock Left Sidebar (Desktop Only) */}
          <div className="hidden sm:flex w-1/3 border-r border-border-color bg-background/10 flex-col p-3 gap-2 select-none">
            <div className="text-[10px] font-bold text-foreground/40 uppercase tracking-wide px-2 mb-1">
              แชนแนลฝึกฝน
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-xs">
              <ElephantMascot state="happy" size={16} />
              <span>Tarnly AI</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground/60 text-xs hover:bg-foreground/5">
              <span>Daily Challenge</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground/60 text-xs hover:bg-foreground/5">
              <span>Grammar Helper</span>
            </div>
          </div>

          {/* Mock Chat Area (Main Area) */}
          <div className="flex-1 flex flex-col bg-background/20 relative overflow-hidden">
            {/* Chat message list */}
            <div className="flex-1 p-3 flex flex-col gap-2.5 overflow-y-auto text-[11px] sm:text-xs">
              
              {/* Step 0: AI Typing */}
              {animStep === 0 && (
                <div className="self-start max-w-[85%] rounded-xl rounded-tl-sm bg-primary-bg px-3 py-2 text-foreground text-left shadow-sm">
                  {/* Typing Dots Animation */}
                  <div className="flex items-center gap-1 py-1 px-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Step 1+: AI Message */}
              {animStep >= 1 && (
                <div className="self-start max-w-[85%] rounded-xl rounded-tl-sm bg-primary-bg px-3 py-2 text-foreground text-left shadow-sm relative">
                  What did you do{" "}
                  <span className={`transition-all duration-300 ${animStep >= 3 ? 'bg-primary/20 rounded px-1 font-bold' : 'underline decoration-primary decoration-2 underline-offset-2'}`}>
                    yesterday
                  </span>
                  ?
                </div>
              )}

              {/* Step 2+: User Message */}
              {animStep >= 2 && (
                <div className="self-end max-w-[85%] rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-white dark:text-gray-900 text-left shadow-sm">
                  I went to the market.
                </div>
              )}

              {/* Step 3: Tooltip Definition */}
              {animStep >= 3 && (
                <div className="mt-1 self-start rounded-lg border border-border-color bg-card-bg p-2 text-left shadow-soft-md animate-word-reveal max-w-[90%]">
                  <div className="font-bold text-primary text-[10px] sm:text-[11px] mb-0.5">yesterday</div>
                  <div className="text-[10px] text-foreground/80 leading-normal">
                    คำวิเศษณ์ บอกเวลา แปลว่า &ldquo;เมื่อวาน&rdquo;
                  </div>
                </div>
              )}
            </div>

            {/* Mock Bottom Chat Input */}
            <div className="p-2 border-t border-border-color bg-background/30 flex items-center gap-2 select-none">
              <div className="flex-1 bg-background/50 rounded-full px-3 py-1 text-[10px] sm:text-[11px] text-foreground/30 text-left border border-border-color">
                พิมพ์ข้อความภาษาอังกฤษ...
              </div>
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white dark:text-gray-900 font-bold text-[10px]">
                →
              </div>
            </div>

            {/* Custom Mouse Cursor Simulation (Step 3 animation) */}
            <div
              className="absolute pointer-events-none transition-all duration-1000 ease-out z-20 flex flex-col items-start"
              style={{
                top: animStep === 3 ? '22%' : '75%',
                left: animStep === 3 ? '34%' : '80%',
                opacity: animStep === 3 ? 1 : 0,
              }}
            >
              {/* cursor hand dot */}
              <div className="relative">
                <div className="w-5 h-5 rounded-full bg-primary/30 border border-primary flex items-center justify-center shadow-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                </div>
                {/* click ripple indicator in Step 3 */}
                {animStep === 3 && (
                  <div className="absolute inset-0 w-5 h-5 rounded-full bg-primary/40 animate-ping" />
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
