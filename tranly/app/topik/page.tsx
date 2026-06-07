"use client";

import { ConfigProvider } from "antd";
import useIllustrationTheme from "@/app/theme/illustrationTheme";
import BottomNav from "@/app/_components/BottomNav";
import StatsBar from "@/app/_components/StatsBar";
import TopikPractice from "@/app/home/_components/TopikPractice/TopikPractice";

export default function TopikPage() {
  const configProps = useIllustrationTheme();

  return (
    <ConfigProvider {...configProps}>
      <div className="w-full h-dvh dot-grid-bg text-[#2C2C2C] dark:text-white flex flex-col relative overflow-hidden font-sans select-none">
        <div
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))" }}
        >
          <StatsBar />
          <div className="px-4 pb-4 mt-2 flex-1">
            <TopikPractice />
          </div>
        </div>

        <BottomNav active="topik" />
      </div>
    </ConfigProvider>
  );
}
