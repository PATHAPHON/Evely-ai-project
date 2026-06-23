"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigProvider } from "antd";
import useIllustrationTheme from "@/app/theme/useIllustrationTheme";
import WordDetailView from "./WordDetailView";
import { DETAIL_WORD_STORAGE_KEY, type FeedWordRecord } from "@/app/_lib/types/wordTypes";

function readDetailWord(): FeedWordRecord | null {
  try {
    const raw = sessionStorage.getItem(DETAIL_WORD_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FeedWordRecord) : null;
  } catch {
    return null;
  }
}

export default function WordDetailClient() {
  const router = useRouter();
  const configProps = useIllustrationTheme();
  const [word] = useState<FeedWordRecord | null>(readDetailWord);

  // No word handed off (direct visit / refresh after storage cleared) → go to chat
  useEffect(() => {
    if (!word) router.replace("/chat");
  }, [word, router]);

  if (!word) return null;

  return (
    <ConfigProvider {...configProps}>
      <WordDetailView word={word} onClose={() => router.back()} />
    </ConfigProvider>
  );
}
