"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigProvider, message } from "antd";
import useIllustrationTheme from "@/app/theme/useIllustrationTheme";
import { useStrings } from "@/app/_lib/utils/strings";
import { useWordStorage, type WordRecord } from "@/app/_lib/hooks/useWordStorage";
import { useTTS } from "@/app/chat/_lib/hooks/useTTS";
import { DETAIL_WORD_STORAGE_KEY, type FeedWordRecord } from "@/app/_lib/types/wordTypes";
import { useActiveLanguage } from "@/app/_lib/contexts/ActiveLanguageContext";
import GeminiLayout from "@/app/_components/GeminiLayout";

function getLocalDateString(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayHeader(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

interface CompactWordCardProps {
  word: WordRecord;
  onSpeak: (text: string) => void;
  onSelect: (word: WordRecord) => void;
  baseDelay: number;
}

function CompactWordCard({ word, onSpeak, onSelect, baseDelay }: CompactWordCardProps) {
  const wordText = word.english || word.label;
  const handleSelect = () => onSelect(word);

  return (
    <div
      className="relative flex flex-col items-center w-full bg-gray-50 dark:bg-[#202124] rounded-2xl p-3 border border-gray-200/60 dark:border-gray-800/40 hover:shadow-md hover:scale-[1.02] transition-all duration-300 animate-card-fade-in text-left"
      style={{ animationDelay: `${baseDelay}ms` }}
    >
      {/* Label and Audio Speak Button */}
      <div className="flex items-center justify-between w-full mt-3 px-1">
        <span
          onClick={handleSelect}
          className="text-sm font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
        >
          {wordText}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSpeak(wordText);
          }}
          className="shrink-0 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
          aria-label="เล่นเสียง"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function WordsPage() {
  const configProps = useIllustrationTheme();
  const router = useRouter();
  const t = useStrings();
  const [, contextHolder] = message.useMessage();

  const { speak } = useTTS("en-US");
  const { listByLanguage } = useWordStorage();
  const { activeLanguage } = useActiveLanguage();

  const [words, setWords] = useState<WordRecord[] | null>(null);

  // Open the saved word in the full-page /word-detail view
  const openWordDetail = (w: WordRecord) => {
    const detailWord: FeedWordRecord = {
      id: w.id,
      language: w.language ?? activeLanguage,
      generatedDate: getLocalDateString(w.createdAt),
      thai: w.label,
      bookmarked: true,
      createdAt: w.createdAt,
      partOfSpeech: w.partOfSpeech,
      word: w.english || w.label,
      ipa: w.reading,
    };
    try {
      sessionStorage.setItem(DETAIL_WORD_STORAGE_KEY, JSON.stringify(detailWord));
    } catch {
      return;
    }
    router.push("/word-detail");
  };

  // Load saved words on mount with Stale-While-Revalidate caching
  useEffect(() => {
    let cancelled = false;
    const cacheKey = `tarnly:words:cache:${activeLanguage}`;

    const cachedDataStr = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    let cachedList: WordRecord[] = [];
    if (cachedDataStr) {
      try {
        cachedList = JSON.parse(cachedDataStr);
        // Stale-while-revalidate: paint cached words after mount (avoids SSR mismatch)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWords(cachedList);
      } catch (e) {
        console.error("Failed to parse cached words:", e);
      }
    }

    const loadData = async () => {
      try {
        const list = await listByLanguage();
        if (!cancelled) {
          const newStringified = JSON.stringify(list);
          if (cachedDataStr !== newStringified) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(cacheKey, newStringified);
            }
            setWords(list);
          } else {
            setWords((current) => (current === null ? list : current));
          }
        }
      } catch {
        if (!cancelled && !cachedDataStr) {
          setWords([]);
        }
      }
    };
    void loadData();

    return () => {
      cancelled = true;
    };
  }, [listByLanguage, activeLanguage]);

  // Grouping by local date
  const groupsMap: { [dateStr: string]: WordRecord[] } = {};
  if (words) {
    words.forEach((word) => {
      const dateStr = getLocalDateString(word.createdAt);
      if (!groupsMap[dateStr]) {
        groupsMap[dateStr] = [];
      }
      groupsMap[dateStr].push(word);
    });
  }

  const sortedKeys = Object.keys(groupsMap).sort((a, b) => b.localeCompare(a));

  sortedKeys.forEach((key) => {
    groupsMap[key].sort((a, b) => a.createdAt - b.createdAt);
  });

  return (
    <ConfigProvider {...configProps}>
      {contextHolder}
      <GeminiLayout title="คลังคำศัพท์">
        <style>{`
          @keyframes cardFadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-card-fade-in {
            animation: cardFadeInUp 0.45s cubic-bezier(0.215, 0.61, 0.355, 1) both;
          }
        `}</style>

        <div className="flex-1 overflow-y-auto flex flex-col p-4 pb-24 bg-white dark:bg-[#131314] relative">
          <div className="flex-1 flex flex-col animate-card-fade-in max-w-2xl mx-auto w-full">
            {words === null ? null : words.length === 0 ? (
              <div className="mt-12 flex flex-col items-center gap-4 text-center animate-card-fade-in">
                <p className="text-sm font-semibold text-gray-500">
                  {t.learn.noWords}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {sortedKeys.map((dateStr) => {
                  const groupWords = groupsMap[dateStr];
                  const dateLabel = formatDayHeader(dateStr);

                  return (
                    <div key={dateStr} className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 flex items-center gap-2">
                        <span className="w-1.5 h-3.5 rounded bg-blue-600 inline-block"></span>
                        {dateLabel}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {groupWords.map((word, wordIndex) => (
                          <CompactWordCard
                            key={word.id}
                            word={word}
                            onSpeak={speak}
                            onSelect={openWordDetail}
                            baseDelay={wordIndex * 40}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </GeminiLayout>
    </ConfigProvider>
  );
}
