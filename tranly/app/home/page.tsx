"use client";

import { ConfigProvider } from "antd";
import useIllustrationTheme from "@/app/theme/useIllustrationTheme";
import WordFeed from "@/app/home/_components/WordFeed";
import GeminiLayout from "@/app/_components/GeminiLayout";

export default function HomePage() {
  const configProps = useIllustrationTheme();

  return (
    <ConfigProvider {...configProps}>
      <GeminiLayout title="หน้าหลัก">
        {/* Style injection for fade animation */}
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

        <div className="flex-1 overflow-y-auto flex flex-col p-4 bg-white dark:bg-[#131314]">
          <div className="flex-1 relative z-10 flex flex-col animate-card-fade-in max-w-2xl mx-auto w-full">
            <WordFeed />
          </div>
        </div>
      </GeminiLayout>
    </ConfigProvider>
  );
}
