"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigProvider, message, Drawer, Avatar, Modal, Input, Checkbox } from "antd";
import {
  BookOutlined,
  ReadOutlined,
  MessageOutlined,
  TrophyOutlined,
  DeleteOutlined,
  SoundOutlined,
  PlayCircleOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  TranslationOutlined,
  CreditCardOutlined
} from "@ant-design/icons";
import useIllustrationTheme from "@/app/theme/illustrationTheme";
import { useStrings } from "@/app/_lib/strings";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";
import { useActiveLanguage } from "@/app/_lib/ActiveLanguageContext";
import { useWordStorage, type WordRecord } from "@/app/learn/_lib/useWordStorage";
import { useLessonHistory } from "@/app/chat/_lib/useLessonHistory";
import { useConversationHistory } from "@/app/chat/_lib/useConversationHistory";
import { useFlashcardSets, type FlashcardSet } from "@/app/learn/_lib/useFlashcardSets";
import type { LessonRecord } from "@/app/chat/_lib/lessonTypes";
import type { ConversationSessionRecord, ChatMessage } from "@/app/chat/_lib/types";
import { useTTS } from "@/app/chat/_lib/useTTS";
import BottomNav from "@/app/_components/BottomNav";
import { FlashcardMode } from "@/app/learn/_components/FlashcardMode";

type TabType = "words" | "flashcards" | "lessons" | "chats";

function formatDate(ts: number | string) {
  const d = new Date(ts);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LibraryPage() {
  const configProps = useIllustrationTheme();
  const router = useRouter();
  const t = useStrings();
  const { language } = useLanguagePreference();
  const isThai = language === "thai";
  const { activeLanguage } = useActiveLanguage();
  const [messageApi, contextHolder] = message.useMessage();
  const [isTabLoading, setIsTabLoading] = useState(false);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<TabType>("words");

  // Inline study mode
  const [studyingSet, setStudyingSet] = useState<FlashcardSet | null>(null);
  const [flashcardStudying, setFlashcardStudying] = useState(false);

  // Modal state for creating new set
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);

  // TTS for word pronunciation
  const { speak } = useTTS("ko-KR");

  // DB Storage Hooks
  const { listByLanguage, remove: removeWord } = useWordStorage();
  const { lessons, loadLessons, deleteLesson, isLoading: lessonsLoading } = useLessonHistory();
  const { sessions: conversations, loadSessions: loadConversations, deleteSession, loadSessionMessages, isLoading: chatsLoading } = useConversationHistory();
  const { sets: flashcardSets, createSet, removeSet } = useFlashcardSets();

  // State
  const [words, setWords] = useState<WordRecord[] | null>(null);
  const [selectedChat, setSelectedChat] = useState<ConversationSessionRecord | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Soft Deletion handling for words
  const pendingDeletes = useRef(new Map<string, () => void>());

  // Load database items on mount/tab change
  useEffect(() => {
    let cancelled = false;
    setIsTabLoading(true);

    // Guarantee a minimum of 600ms loading duration for a smooth, premium feel
    const minDelay = new Promise((resolve) => setTimeout(resolve, 600));

    const loadData = async () => {
      try {
        if (activeTab === "words" || activeTab === "flashcards") {
          const list = await listByLanguage();
          if (!cancelled) setWords(list);
        }
        if (activeTab === "lessons") {
          await loadLessons();
        } else if (activeTab === "chats") {
          await loadConversations();
        }
      } catch {
        // ignore load failures
      } finally {
        await minDelay;
        if (!cancelled) {
          setIsTabLoading(false);
        }
      }
    };
    loadData();
    return () => {
      cancelled = true;
    };
  }, [activeTab, listByLanguage, loadLessons, loadConversations]);

  // Clean up pending deletes when leaving screen
  useEffect(() => {
    const pending = pendingDeletes.current;
    return () => {
      pending.forEach((commit) => commit());
      pending.clear();
    };
  }, []);

  // Filter words belonging to the studying flashcard set
  const studyWords = useMemo(() => {
    if (!studyingSet || !words) return [];
    return words.filter((w) => studyingSet.wordIds.includes(w.id));
  }, [studyingSet, words]);

  // Handle word deletion (Soft delete with Undo)
  const handleDeleteWord = (id: string) => {
    const target = words?.find((w) => w.id === id);
    if (!target) return;
    const index = words!.indexOf(target);
    const korean = target.korean || target.label || "";
    const key = `delete-${id}`;

    // Optimistically remove from list view
    setWords((prev) => prev?.filter((w) => w.id !== id) ?? null);

    const commit = () => {
      if (!pendingDeletes.current.has(id)) return;
      pendingDeletes.current.delete(id);
      clearTimeout(timer);
      messageApi.destroy(key);
      removeWord(id).catch(() => {});
    };

    const undo = () => {
      if (!pendingDeletes.current.has(id)) return;
      pendingDeletes.current.delete(id);
      clearTimeout(timer);
      messageApi.destroy(key);
      setWords((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, target);
        return next;
      });
    };

    const timer = setTimeout(commit, 5000);
    pendingDeletes.current.set(id, commit);

    messageApi.open({
      key,
      type: "success",
      duration: 0,
      content: (
        <span className="inline-flex items-center gap-3">
          {t.learn.deleted(korean)}
          <button
            type="button"
            onClick={undo}
            className="font-extrabold underline underline-offset-2 cursor-pointer"
          >
            {t.learn.undo}
          </button>
        </span>
      ),
    });
  };

  // Replay Lesson redirect
  const handleReplayLesson = (record: LessonRecord) => {
    sessionStorage.setItem("tarnly:replay-lesson", JSON.stringify(record));
    router.push("/tutor");
  };

  // Open Chat transcript in read-only Drawer
  const handleOpenChatLog = async (session: ConversationSessionRecord) => {
    setSelectedChat(session);
    setLoadingChat(true);
    try {
      const messages = await loadSessionMessages(session.id);
      setChatMessages(messages);
    } catch {
      messageApi.error(isThai ? "โหลดบทสนทนาล้มเหลว" : "Failed to load chat history");
    } finally {
      setLoadingChat(false);
    }
  };

  const handleCloseChatLog = () => {
    setSelectedChat(null);
    setChatMessages([]);
  };

  // Delete Lesson Handler
  const handleDeleteLesson = async (id: string) => {
    try {
      await deleteLesson(id);
      messageApi.success(isThai ? "ลบบทเรียนสำเร็จ" : "Lesson deleted successfully");
    } catch {
      messageApi.error(isThai ? "ลบบทเรียนล้มเหลว" : "Failed to delete lesson");
    }
  };

  // Delete Conversation Handler
  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteSession(id);
      messageApi.success(isThai ? "ลบประวัติสนทนาสำเร็จ" : "Conversation deleted successfully");
    } catch {
      messageApi.error(isThai ? "ลบประวัติสนทนาล้มเหลว" : "Failed to delete conversation");
    }
  };

  // Create Flashcard Set Handler
  const handleCreateFlashcardSet = async () => {
    if (!newSetName.trim()) {
      messageApi.error(isThai ? "กรุณากรอกชื่อชุดบัตรคำ" : "Please enter a set name");
      return;
    }
    if (selectedWordIds.length === 0) {
      messageApi.error(isThai ? "กรุณาเลือกคำศัพท์อย่างน้อย 1 คำ" : "Please select at least 1 word");
      return;
    }
    try {
      await createSet(newSetName, selectedWordIds);
      messageApi.success(isThai ? "สร้างชุดบัตรคำสำเร็จ" : "Flashcard set created successfully");
      setIsCreateModalOpen(false);
      setNewSetName("");
      setSelectedWordIds([]);
    } catch {
      messageApi.error(isThai ? "สร้างชุดบัตรคำล้มเหลว" : "Failed to create flashcard set");
    }
  };

  // Toggle word selection inside create set modal
  const handleToggleWord = (wordId: string) => {
    setSelectedWordIds((prev) =>
      prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]
    );
  };

  // Render high-fidelity skeleton for words tab
  const renderWordsSkeleton = () => (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i, index) => (
        <div 
          key={i}
          className="rounded-2xl border-3 border-border-color bg-card-bg p-3 shadow-nb-md flex gap-3 items-center animate-card-fade-in"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          {/* Image Placeholder */}
          <div className="w-24 h-24 rounded-xl border-3 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shrink-0 animate-pulse" />
          
          {/* Text Details Placeholder */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="w-1/2 h-5 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
            <div className="w-1/3 h-4 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
            <div className="w-2/3 h-3 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
            <div className="w-1/4 h-2.5 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
          </div>
          
          {/* Action Buttons Placeholder */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl border-3 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm animate-pulse" />
            <div className="w-9 h-9 rounded-xl border-3 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  // Render high-fidelity skeleton for flashcards tab
  const renderFlashcardsSkeleton = () => (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i, index) => (
        <div
          key={i}
          className="rounded-xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex justify-between items-start gap-3 animate-card-fade-in"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded bg-gray-200 dark:bg-[#3d3d5c] flex items-center justify-center text-sm">🎴</span>
              <div className="w-1/2 h-5 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <div className="w-16 h-5 rounded border-2 border-border-color bg-gray-100 dark:bg-[#2d2d44] animate-pulse" />
              <div className="w-20 h-3 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end shrink-0">
            <div className="w-24 h-8 rounded-lg border-2 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm animate-pulse" />
            <div className="w-7 h-7 rounded-lg border-2 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  // Render high-fidelity skeleton for lessons tab
  const renderLessonsSkeleton = () => (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i, index) => (
        <div
          key={i}
          className="rounded-xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex justify-between items-start gap-3 animate-card-fade-in"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
              <div className="w-2/3 h-5 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <div className="w-12 h-5 rounded border-2 border-border-color bg-gray-100 dark:bg-[#2d2d44] animate-pulse" />
              <div className="w-14 h-5 rounded border-2 border-border-color bg-gray-100 dark:bg-[#2d2d44] animate-pulse" />
              <div className="w-20 h-3 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end shrink-0">
            <div className="w-28 h-8 rounded-lg border-2 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm animate-pulse" />
            <div className="w-7 h-7 rounded-lg border-2 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  // Render high-fidelity skeleton for chats tab
  const renderChatsSkeleton = () => (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i, index) => (
        <div
          key={i}
          className="rounded-xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex justify-between items-start gap-3 animate-card-fade-in"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
              <div className="w-1/2 h-5 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
            </div>
            <div className="w-3/4 h-3.5 rounded bg-gray-200 dark:bg-[#3d3d5c] mt-1.5 animate-pulse" />
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <div className="w-12 h-5 rounded border-2 border-border-color bg-gray-100 dark:bg-[#2d2d44] animate-pulse" />
              <div className="w-20 h-3 rounded bg-gray-200 dark:bg-[#3d3d5c] animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end shrink-0">
            <div className="w-24 h-8 rounded-lg border-2 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm animate-pulse" />
            <div className="w-7 h-7 rounded-lg border-2 border-border-color bg-gray-200 dark:bg-[#3d3d5c] shadow-nb-sm animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  // Navigation Lock check

  return (
    <ConfigProvider {...configProps}>
      {contextHolder}
      <div className="w-full h-dvh dot-grid-bg text-[#2C2C2C] dark:text-white flex flex-col relative overflow-hidden font-sans select-none">
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
          @keyframes elementFadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-card-fade-in {
            animation: cardFadeInUp 0.45s cubic-bezier(0.215, 0.61, 0.355, 1) both;
          }
          .animate-card-content {
            animation: elementFadeIn 0.35s cubic-bezier(0.215, 0.61, 0.355, 1) both;
          }
          .animate-card-actions {
            animation: elementFadeIn 0.35s cubic-bezier(0.215, 0.61, 0.355, 1) both;
          }
        `}</style>
        
        {/* Core Scroll Container */}
        <div 
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ paddingBottom: "calc(180px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex-1 flex flex-col animate-card-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 p-[20px_16px_0]">
            {studyingSet && !flashcardStudying && (
              <button
                type="button"
                onClick={() => setStudyingSet(null)}
                aria-label="Back to library"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-3 border-border-color bg-card-bg shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer text-text-primary mt-6"
              >
                <ArrowLeftOutlined style={{ fontSize: 18 }} />
              </button>
            )}
            <div className="flex-1" />
          </div>

          {/* Render inline study player if active */}
          {studyingSet ? (
            <div className="px-4 mt-2 flex-1 flex flex-col">
              {studyWords.length > 0 ? (
                <FlashcardMode
                  words={studyWords.map((w: any) => ({
                    id: w.id,
                    imageBlob: w.imageBlob || new Blob(),
                    label: w.thai || w.translation || w.label || "",
                    language: w.language || "korean",
                    korean: w.korean || "",
                    reading: w.reading || "",
                    romanization: w.romanization || "",
                    english: w.english || "",
                    createdAt: w.createdAt || Date.now()
                  }))}
                  onStudyingChange={setFlashcardStudying}
                />
              ) : (
                <p className="text-center text-text-secondary mt-12">
                  {isThai ? "ชุดคำศัพท์นี้ไม่มีคำศัพท์เหลืออยู่" : "No words left in this flashcard set"}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Tab Contents */}
              <div className="px-4 mt-6 flex flex-col gap-4 flex-1">
                
                {/* 1. Words Tab */}
                {activeTab === "words" && (
                  <>
                    {(words === null || isTabLoading) ? (
                      renderWordsSkeleton()
                    ) : words.length === 0 ? (
                      <div className="mt-12 flex flex-col items-center gap-4 text-center animate-card-fade-in">
                        <p className="text-base font-bold text-text-secondary">
                          {t.learn.noWords}
                        </p>
                        <button
                          type="button"
                          onClick={() => router.push("/chat")}
                          className="rounded-xl border-3 border-border-color bg-accent-green px-5 py-3 font-extrabold text-white shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm cursor-pointer"
                        >
                          {t.learn.scanNow}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {words.map((word, index) => {
                          const imgUrl = word.imageBlob ? URL.createObjectURL(word.imageBlob) : "";
                          const romanization = word.romanization || word.reading || word.korean || word.label;
                          const translation = language === "thai" ? word.label : (word.english || "");
                          const hasKorean = Boolean(word.korean);
                          const baseDelay = Math.min(index, 8) * 60;

                          return (
                            <div 
                              key={word.id}
                              className="rounded-2xl border-3 border-border-color bg-card-bg p-3 shadow-nb-md flex gap-3 items-center animate-card-fade-in"
                              style={{ animationDelay: `${baseDelay}ms` }}
                            >
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={word.korean || word.label}
                                  className="w-24 h-24 object-cover rounded-xl border-3 border-border-color bg-white animate-card-content"
                                  style={{ animationDelay: `${baseDelay + 60}ms` }}
                                />
                              ) : (
                                <div 
                                  className="w-24 h-24 rounded-xl border-3 border-border-color bg-white flex items-center justify-center text-2xl animate-card-content"
                                  style={{ animationDelay: `${baseDelay + 60}ms` }}
                                >
                                  🍎
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p 
                                  className="text-lg font-extrabold text-text-primary truncate animate-card-content"
                                  style={{ animationDelay: `${baseDelay + 120}ms` }}
                                >
                                  {romanization}
                                </p>
                                {word.korean && (
                                  <p 
                                    className="text-sm font-bold text-text-primary truncate mt-0.5 animate-card-content"
                                    style={{ animationDelay: `${baseDelay + 170}ms` }}
                                  >
                                    {word.korean}
                                  </p>
                                )}
                                {language === "thai" && word.reading && (
                                  <p 
                                    className="text-xs font-semibold text-text-secondary truncate mt-0.5 animate-card-content"
                                    style={{ animationDelay: `${baseDelay + 210}ms` }}
                                  >
                                    {word.reading}
                                  </p>
                                )}
                                <p 
                                  className="text-xs font-semibold text-text-secondary truncate animate-card-content"
                                  style={{ animationDelay: `${baseDelay + 250}ms` }}
                                >
                                  {translation}
                                </p>
                                <p 
                                  className="text-[10px] font-medium text-text-meta mt-1 animate-card-content"
                                  style={{ animationDelay: `${baseDelay + 290}ms` }}
                                >
                                  {formatDate(word.createdAt)}
                                </p>
                              </div>
                              <div 
                                className="flex flex-col gap-2 animate-card-actions"
                                style={{ animationDelay: `${baseDelay + 340}ms` }}
                              >
                                <button
                                  type="button"
                                  onClick={() => hasKorean && speak(word.korean!)}
                                  disabled={!hasKorean}
                                  className="w-9 h-9 rounded-xl border-3 border-border-color bg-accent-blue text-white font-extrabold shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                                  aria-label={t.learn.listenAria}
                                >
                                  <SoundOutlined />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWord(word.id)}
                                  className="w-9 h-9 rounded-xl border-3 border-black dark:border-[#4a4a6a] bg-[#FFF0F6] dark:bg-[#3d2d44] text-black dark:text-white font-extrabold shadow-nb-sm active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer flex items-center justify-center"
                                  aria-label={t.learn.deleteAria}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* 2. Flashcards Tab */}
                {activeTab === "flashcards" && (
                  <>
                    {(flashcardSets === null || isTabLoading) ? (
                      renderFlashcardsSkeleton()
                    ) : flashcardSets.length === 0 ? (
                      <div className="mt-8 text-center animate-card-fade-in">
                        <p className="text-base font-bold text-text-secondary">
                          {t.library.noFlashcards}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {flashcardSets.map((set, index) => {
                          const baseDelay = Math.min(index, 8) * 60;
                          return (
                            <div
                              key={set.id}
                              className="rounded-xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex justify-between items-start gap-3 animate-card-fade-in"
                              style={{ animationDelay: `${baseDelay}ms` }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span 
                                    className="text-xl animate-card-content"
                                    style={{ animationDelay: `${baseDelay + 60}ms` }}
                                  >
                                    🎴
                                  </span>
                                  <h3 
                                    className="text-base font-black text-text-primary truncate animate-card-content"
                                    style={{ animationDelay: `${baseDelay + 120}ms` }}
                                  >
                                    {set.name}
                                  </h3>
                                </div>
                                <div 
                                  className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-1.5 animate-card-content"
                                  style={{ animationDelay: `${baseDelay + 180}ms` }}
                                >
                                  <span className="inline-block rounded-md border-2 border-border-color bg-accent-pink-bg px-2 py-0.5 font-bold text-text-primary">
                                    {set.wordIds.length} {isThai ? "คำ" : "words"}
                                  </span>
                                  <span className="text-[10px] font-medium text-text-meta">{formatDate(set.createdAt)}</span>
                                </div>
                              </div>

                              <div 
                                className="flex flex-col gap-2 items-end animate-card-actions"
                                style={{ animationDelay: `${baseDelay + 240}ms` }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setStudyingSet(set)}
                                  className="h-8 rounded-lg border-2 border-border-color bg-accent-green text-white px-3 text-xs font-bold shadow-nb-sm active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] flex items-center gap-1 cursor-pointer"
                                >
                                  <PlayCircleOutlined />
                                  <span>{t.library.playFlashcard}</span>
                                </button>
                                
                                {confirmDeleteId === set.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => removeSet(set.id)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-border-color bg-accent-red text-white text-xs font-bold shadow-nb-sm cursor-pointer"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-border-color bg-gray-200 dark:bg-gray-700 text-text-primary text-xs font-bold shadow-nb-sm cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(set.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-border-color bg-card-bg text-accent-red shadow-nb-sm cursor-pointer"
                                  >
                                    <DeleteOutlined style={{ fontSize: 12 }} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* 3. Lessons Tab */}
                {activeTab === "lessons" && (
                  <>
                    {(lessonsLoading || isTabLoading) ? (
                      renderLessonsSkeleton()
                    ) : lessons.length === 0 ? (
                      <div className="mt-12 flex flex-col items-center gap-4 text-center animate-card-fade-in">
                        <p className="text-base font-bold text-text-secondary">
                          {t.library.noLessons}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {lessons.map((lesson, index) => {
                          const baseDelay = Math.min(index, 8) * 60;
                          return (
                            <div
                              key={lesson.id}
                              className="rounded-xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex justify-between items-start gap-3 animate-card-fade-in"
                              style={{ animationDelay: `${baseDelay}ms` }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span 
                                    className="inline-block animate-card-content"
                                    style={{ animationDelay: `${baseDelay + 60}ms` }}
                                  >
                                    <ReadOutlined style={{ fontSize: 16, color: "var(--accent-green)" }} />
                                  </span>
                                  <h3 
                                    className="text-base font-black text-text-primary truncate animate-card-content"
                                    style={{ animationDelay: `${baseDelay + 120}ms` }}
                                  >
                                    {lesson.topic}
                                  </h3>
                                </div>
                                <div 
                                  className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-1.5 animate-card-content"
                                  style={{ animationDelay: `${baseDelay + 180}ms` }}
                                >
                                  <span className="inline-block rounded-md border-2 border-border-color bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-bold text-text-primary">
                                    {lesson.proficiencyLevel.toUpperCase()}
                                  </span>
                                  {lesson.lastScore !== null && (
                                    <span className="inline-flex items-center gap-1 rounded-md border-2 border-border-color bg-accent-yellow px-2 py-0.5 font-bold text-black">
                                      <TrophyOutlined style={{ fontSize: 12 }} />
                                      {lesson.lastScore}/{lesson.total}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-medium text-text-meta">{formatDate(lesson.createdAt)}</span>
                                </div>
                              </div>

                              <div 
                                className="flex flex-col gap-2 items-end animate-card-actions"
                                style={{ animationDelay: `${baseDelay + 240}ms` }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleReplayLesson(lesson)}
                                  className="h-8 rounded-lg border-2 border-border-color bg-accent-green text-white px-3 text-xs font-bold shadow-nb-sm active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] flex items-center gap-1 cursor-pointer"
                                >
                                  <PlayCircleOutlined />
                                  <span>{t.library.replayLesson}</span>
                                </button>
                                
                                {confirmDeleteId === lesson.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLesson(lesson.id)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-border-color bg-accent-red text-white text-xs font-bold shadow-nb-sm cursor-pointer"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-border-color bg-gray-200 dark:bg-gray-700 text-text-primary text-xs font-bold shadow-nb-sm cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(lesson.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-border-color bg-card-bg text-accent-red shadow-nb-sm cursor-pointer"
                                  >
                                    <DeleteOutlined style={{ fontSize: 12 }} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* 4. Chats Tab */}
                {activeTab === "chats" && (
                  <>
                    {(chatsLoading || isTabLoading) ? (
                      renderChatsSkeleton()
                    ) : conversations.length === 0 ? (
                      <div className="mt-12 flex flex-col items-center gap-4 text-center animate-card-fade-in">
                        <p className="text-base font-bold text-text-secondary">
                          {t.library.noChats}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {conversations.map((session, index) => {
                          const baseDelay = Math.min(index, 8) * 60;
                          return (
                            <div
                              key={session.id}
                              className="rounded-xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md flex justify-between items-start gap-3 animate-card-fade-in"
                              style={{ animationDelay: `${baseDelay}ms` }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span 
                                    className="inline-block animate-card-content"
                                    style={{ animationDelay: `${baseDelay + 60}ms` }}
                                  >
                                    <MessageOutlined style={{ fontSize: 16, color: "var(--accent-blue)" }} />
                                  </span>
                                  <h3 
                                    className="text-base font-black text-text-primary truncate animate-card-content"
                                    style={{ animationDelay: `${baseDelay + 120}ms` }}
                                  >
                                    {session.topic}
                                  </h3>
                                </div>
                                <p 
                                  className="text-xs text-text-secondary truncate mt-0.5 animate-card-content"
                                  style={{ animationDelay: `${baseDelay + 180}ms` }}
                                >
                                  {session.goal || (isThai ? "การสนทนาปลายเปิด" : "Open-ended Chat")}
                                </p>
                                <div 
                                  className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-1.5 animate-card-content"
                                  style={{ animationDelay: `${baseDelay + 220}ms` }}
                                >
                                  <span className="inline-block rounded-md border-2 border-border-color bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-bold text-text-primary">
                                    {session.proficiencyLevel.toUpperCase()}
                                  </span>
                                  <span className="text-[10px] font-medium text-text-meta">{formatDate(session.createdAt)}</span>
                                </div>
                              </div>

                              <div 
                                className="flex flex-col gap-2 items-end animate-card-actions"
                                style={{ animationDelay: `${baseDelay + 280}ms` }}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenChatLog(session)}
                                  className="h-8 rounded-lg border-2 border-border-color bg-accent-blue text-white px-3 text-xs font-bold shadow-nb-sm active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] flex items-center gap-1 cursor-pointer"
                                >
                                  <BookOutlined />
                                  <span>{t.library.readChat}</span>
                                </button>
                                
                                {confirmDeleteId === session.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteConversation(session.id)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-border-color bg-accent-red text-white text-xs font-bold shadow-nb-sm cursor-pointer"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-border-color bg-gray-200 dark:bg-gray-700 text-text-primary text-xs font-bold shadow-nb-sm cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(session.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-border-color bg-card-bg text-accent-red shadow-nb-sm cursor-pointer"
                                  >
                                    <DeleteOutlined style={{ fontSize: 12 }} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

              </div>
            </>
          )}
          </div>
        </div>

        {/* Create Flashcard Set Modal */}
        <Modal
          title={<span className="font-black text-lg">{isThai ? "สร้างชุดบัตรคำศัพท์อัจฉริยะ 🎴" : "Create Smart Flashcard Set 🎴"}</span>}
          open={isCreateModalOpen}
          onOk={handleCreateFlashcardSet}
          onCancel={() => {
            setIsCreateModalOpen(false);
            setNewSetName("");
            setSelectedWordIds([]);
          }}
          okText={isThai ? "สร้างชุดบัตรคำ" : "Create Set"}
          cancelText={isThai ? "ยกเลิก" : "Cancel"}
          className="illustration-modal"
          styles={{
            body: { padding: "12px 0 0" }
          }}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-black text-text-primary block mb-1">
                {isThai ? "ชื่อชุดบัตรคำศัพท์:" : "Flashcard Set Name:"}
              </label>
              <Input
                placeholder={isThai ? "เช่น ผลไม้เกาหลี, สแกนวันนี้" : "e.g. Korean Fruits, Scanned Today"}
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                maxLength={32}
              />
            </div>
            <div>
              <label className="text-xs font-black text-text-primary block mb-2">
                {isThai ? "เลือกคำศัพท์ที่จะบรรจุลงชุดบัตรคำ:" : "Select Words to Include:"}
              </label>
              <div className="max-h-[220px] overflow-y-auto border-3 border-border-color rounded-xl p-2 bg-[#FFF9F0] dark:bg-[#1a1a2e] flex flex-col gap-1.5">
                {words && words.map((word) => {
                  const romanization = word.romanization || word.korean || word.label;
                  return (
                    <div
                      key={word.id}
                      onClick={() => handleToggleWord(word.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border-2 border-border-color bg-white dark:bg-[#2d2d44] cursor-pointer transition-all ${
                        selectedWordIds.includes(word.id) ? "border-accent-green shadow-nb-sm" : "opacity-80"
                      }`}
                    >
                      <Checkbox
                        checked={selectedWordIds.includes(word.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => handleToggleWord(word.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-sm text-text-primary truncate block">
                          {romanization}
                        </span>
                        {word.korean && (
                          <span className="font-bold text-xs text-text-secondary truncate block mt-0.5">
                            {word.korean} ({isThai ? word.reading : word.english})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>

        {/* Read-Only Conversation Drawer / Overlay */}
        <Drawer
          title={selectedChat ? (isThai ? `ประวัติสนทนา: ${selectedChat.topic}` : `Chat History: ${selectedChat.topic}`) : ""}
          placement="bottom"
          height="80dvh"
          onClose={handleCloseChatLog}
          open={selectedChat !== null}
          styles={{
            body: { padding: "16px", backgroundColor: "#FFF9F0" },
            header: { borderBottom: "3px solid #2C2C2C" }
          }}
          className="illustration-drawer"
        >
          {loadingChat ? (
            <div className="flex justify-center items-center h-full">
              <p className="font-bold text-text-secondary">{t.common.loading}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto pb-8 h-full">
              {chatMessages.length === 0 ? (
                <p className="text-center text-text-meta mt-12">
                  {isThai ? "ไม่มีข้อความในประวัตินี้" : "No messages in this chat history"}
                </p>
              ) : (
                chatMessages.map((msg) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${
                        isAssistant ? "self-start items-start" : "self-end items-end"
                      }`}
                    >
                      <div
                        className={`rounded-2xl border-3 border-border-color p-3 shadow-nb-sm relative ${
                          isAssistant
                            ? "bg-white text-text-primary rounded-tl-md"
                            : "bg-accent-green text-white rounded-tr-md"
                        }`}
                      >
                        {isAssistant && msg.korean && (
                          <div className="text-base font-black mb-1">{msg.korean}</div>
                        )}
                        {isAssistant && msg.reading && (
                          <div className="text-xs font-bold text-text-secondary mb-1">
                            [{msg.reading}]
                          </div>
                        )}
                        {!isAssistant && msg.rawText && (
                          <div className="text-base font-bold">{msg.rawText}</div>
                        )}
                        {isAssistant && (
                          <div className="text-xs font-semibold text-text-primary">
                            {language === "thai" ? msg.translation : (msg.english || msg.translation)}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-medium text-text-meta mt-1 px-1">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Drawer>

        {/* Floating tab switcher — sits just above the bottom nav bar */}
        {!studyingSet && !flashcardStudying && (
        <div
          className="absolute left-4 right-4 z-40"
          style={{ bottom: "calc(104px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto flex w-fit rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-1 shadow-nb-sm gap-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("words")}
              aria-label={t.library.wordsTab}
              className={`rounded-lg p-2 transition-all cursor-pointer flex items-center justify-center ${
                activeTab === "words"
                  ? "bg-accent-pink-bg text-black dark:text-white border-2 border-border-color shadow-nb-sm"
                  : "text-text-secondary border-2 border-transparent"
              }`}
            >
              <TranslationOutlined style={{ fontSize: 16 }} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("flashcards")}
              aria-label={t.library.flashcardsTab}
              className={`rounded-lg p-2 transition-all cursor-pointer flex items-center justify-center ${
                activeTab === "flashcards"
                  ? "bg-accent-pink-bg text-black dark:text-white border-2 border-border-color shadow-nb-sm"
                  : "text-text-secondary border-2 border-transparent"
              }`}
            >
              <CreditCardOutlined style={{ fontSize: 16 }} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("lessons")}
              aria-label={t.library.lessonsTab}
              className={`rounded-lg p-2 transition-all cursor-pointer flex items-center justify-center ${
                activeTab === "lessons"
                  ? "bg-accent-pink-bg text-black dark:text-white border-2 border-border-color shadow-nb-sm"
                  : "text-text-secondary border-2 border-transparent"
              }`}
            >
              <ReadOutlined style={{ fontSize: 16 }} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("chats")}
              aria-label={t.library.chatsTab}
              className={`rounded-lg p-2 transition-all cursor-pointer flex items-center justify-center ${
                activeTab === "chats"
                  ? "bg-accent-pink-bg text-black dark:text-white border-2 border-border-color shadow-nb-sm"
                  : "text-text-secondary border-2 border-transparent"
              }`}
            >
              <MessageOutlined style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>
        )}

        {/* Global Neobrutalist Navigation Tabbar */}
        {!flashcardStudying && <BottomNav active="library" />}

      </div>
    </ConfigProvider>
  );
}
