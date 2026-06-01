"use client";

import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { BookOutlined, MessageOutlined, ReadOutlined, ArrowLeftOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Input, Checkbox, message } from "antd";
import Mascot from "./Mascot";
import type { SavedWord } from "../_lib/types";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";

interface FlashcardSetupGuideProps {
  savedWords: any[];
  onStartFlashcards: (filteredWords: any[]) => void;
  onCancel: () => void;
}

type Step = "intro" | "ai-strategy" | "ai-topic-input" | "ai-size" | "ai-confirm" | "manual-select";
type AIStrategy = "recent" | "random" | "oldest" | "topic";

function AIBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-[85%] items-end gap-2 self-start animate-fade-in">
      <Mascot size={40} state="idle" />
      <div className="rounded-2xl rounded-tl-md border-3 border-border-color bg-card-bg px-4 py-3 text-base font-bold text-text-primary shadow-nb-sm">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[85%] self-end rounded-2xl rounded-tr-md border-3 border-border-color bg-accent-green px-4 py-2 text-sm font-bold text-white shadow-nb-sm animate-fade-in">
      {children}
    </div>
  );
}

export default function FlashcardSetupGuide({
  savedWords,
  onStartFlashcards,
  onCancel
}: FlashcardSetupGuideProps) {
  const { language } = useLanguagePreference();
  const isThai = language === "thai";

  // Step-by-step wizard state
  const [currentStep, setCurrentStep] = useState<Step>("intro");
  const [history, setHistory] = useState<{ step: Step; question: string; answer: string }[]>([]);

  // Q&A Answers
  const [method, setMethod] = useState<"ai" | "manual" | null>(null);
  const [aiStrategy, setAIStrategy] = useState<AIStrategy | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [setSize, setSetSize] = useState<number | "all">(10);

  // Manual select state
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [manualSearchQuery, setManualSearchQuery] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat automatically as conversations advance
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentStep, history]);

  // Option B: filter words by manual search query
  const filteredManualWords = useMemo(() => {
    if (!savedWords) return [];
    return savedWords.filter((w) => {
      const q = manualSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (w.korean && w.korean.toLowerCase().includes(q)) ||
        (w.label && w.label.toLowerCase().includes(q)) ||
        (w.reading && w.reading.toLowerCase().includes(q)) ||
        (w.romanization && w.romanization.toLowerCase().includes(q)) ||
        (w.english && w.english.toLowerCase().includes(q))
      );
    });
  }, [savedWords, manualSearchQuery]);

  // Core smart curation logic for Option A (AI Curated)
  const getAICuratedWords = useCallback(() => {
    if (!savedWords || savedWords.length === 0) return [];
    let list = [...savedWords];

    // 1. Filter by Custom Topic if strategy is 'topic'
    if (aiStrategy === "topic" && customTopic.trim()) {
      const query = customTopic.toLowerCase().trim();
      list = list.filter((w) => {
        return (
          (w.label && w.label.toLowerCase().includes(query)) ||
          (w.english && w.english.toLowerCase().includes(query)) ||
          (w.korean && w.korean.toLowerCase().includes(query)) ||
          (w.reading && w.reading.toLowerCase().includes(query))
        );
      });
    }

    // 2. Apply Strategy Sorting
    if (aiStrategy === "recent") {
      // most recently scanned
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else if (aiStrategy === "oldest") {
      // oldest scanned (helps prevent forgetting)
      list.sort((a, b) => a.createdAt - b.createdAt);
    } else if (aiStrategy === "random") {
      // shuffle array using Fisher-Yates
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }

    // 3. Slice according to requested size
    if (setSize !== "all" && list.length > setSize) {
      list = list.slice(0, setSize);
    }

    return list;
  }, [savedWords, aiStrategy, customTopic, setSize]);

  // Handle choice of Creation Method (Intro Q1)
  const handleSelectMethod = (chosen: "ai" | "manual") => {
    setMethod(chosen);
    const question = isThai 
      ? "ยินดีต้อนรับสู่ห้องจัดบัตรคำศัพท์อัจฉริยะจ้า! วันนี้อยากฝึกจดจำคำศัพท์สะสมในคลังด้วยวิธีไหนดีจ๊ะ?" 
      : "Welcome to smart flashcard setup! How would you like to build your review set today?";
    const answer = chosen === "ai"
      ? (isThai ? "🤖 ให้ Evely ช่วยจัดเซ็ตคำศัพท์ให้" : "🤖 Let Evely curate it for me")
      : (isThai ? "📝 ฉันขอเลือกศัพท์ในคลังด้วยตัวเอง" : "📝 I want to select specific words myself");

    setHistory((prev) => [...prev, { step: "intro", question, answer }]);
    
    if (chosen === "ai") {
      setCurrentStep("ai-strategy");
    } else {
      setCurrentStep("manual-select");
    }
  };

  // Handle AI strategy selection
  const handleSelectStrategy = (strat: AIStrategy) => {
    setAIStrategy(strat);
    const question = isThai
      ? "อยากให้ Evely คัดศัพท์สะสมแนวไหนมาสุ่มเล่นดีจ๊ะ?"
      : "What sorting pattern should Evely use for your vocabulary bank?";
    
    let answer = "";
    if (strat === "recent") answer = isThai ? "🆕 คำศัพท์ล่าสุดที่เพิ่งสแกน" : "🆕 Most recently scanned";
    else if (strat === "random") answer = isThai ? "🔄 สุ่มผสมผสานทั้งหมดในคลัง" : "🔄 Random mix of vault";
    else if (strat === "oldest") answer = isThai ? "⏳ ศัพท์เก่าทวนความหลัง" : "⏳ Older words review";
    else answer = isThai ? "⌨ ระบุหมวดหมู่ค้นหาเอง" : "⌨ Search custom category";

    setHistory((prev) => [...prev, { step: "ai-strategy", question, answer }]);

    if (strat === "topic") {
      setCurrentStep("ai-topic-input");
    } else {
      setCurrentStep("ai-size");
    }
  };

  // Confirm custom topic text input
  const handleConfirmTopic = () => {
    if (!customTopic.trim()) {
      message.error(isThai ? "กรุณากรอกหัวข้อคำศัพท์ที่ต้องการค้นหาจ้า" : "Please enter a search topic first");
      return;
    }
    const question = isThai ? "พิมพ์ระบุหัวข้อคำศัพท์ที่ต้องการ:" : "Enter custom topic term:";
    const answer = `หมวดหมู่: "${customTopic}"`;
    setHistory((prev) => [...prev, { step: "ai-topic-input", question, answer }]);
    setCurrentStep("ai-size");
  };

  // Handle set size selection
  const handleSelectSize = (size: number | "all") => {
    setSetSize(size);
    const question = isThai ? "อยากทวนบัตรคำศัพท์รอบนี้กี่คำดีจ๊ะ? 🎯" : "How many cards do you want to play? 🎯";
    const answer = size === "all" 
      ? (isThai ? "ทั้งหมดที่มี" : "All available cards") 
      : `${size} ${isThai ? "คำ" : "words"}`;

    setHistory((prev) => [...prev, { step: "ai-size", question, answer }]);
    setCurrentStep("ai-confirm");
  };

  // Reset/Restart Q&A
  const handleReset = () => {
    setCurrentStep("intro");
    setHistory([]);
    setMethod(null);
    setAIStrategy(null);
    setCustomTopic("");
    setSetSize(10);
    setSelectedWordIds([]);
    setManualSearchQuery("");
  };

  // Run final Curated Flashcards Game
  const handleLaunchAICurated = () => {
    const filtered = getAICuratedWords();
    if (filtered.length === 0) {
      message.info(isThai ? "ไม่พบคำศัพท์สะสมในคลังที่ตรงกับเกณฑ์นี้เลยจ้า ลองสุ่มแบบอื่นดูนะ!" : "No matching words found for these criteria. Try a different setup!");
      return;
    }
    onStartFlashcards(filtered);
  };

  // Run final Manual Selection Game
  const handleLaunchManual = () => {
    if (selectedWordIds.length === 0) {
      message.error(isThai ? "กรุณาติ๊กเลือกคำศัพท์อย่างน้อย 1 คำนะจ๊ะ" : "Please select at least 1 word to start");
      return;
    }
    const filtered = savedWords.filter((w) => selectedWordIds.includes(w.id));
    onStartFlashcards(filtered);
  };

  // Toggle word selection in manual checkbox list
  const handleToggleManualWord = (id: string) => {
    setSelectedWordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#FFF9F0] dark:bg-[#1a1a2e]">
      
      {/* Scrollable chat board */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col min-h-0">
        
        {/* Render history conversation logs */}
        {history.map((h, i) => (
          <div key={i} className="flex flex-col gap-4">
            <AIBubble>{h.question}</AIBubble>
            <UserBubble>{h.answer}</UserBubble>
          </div>
        ))}

        {/* Current Active Step Question and Options */}
        {currentStep === "intro" && (
          <div className="flex flex-col gap-4">
            <AIBubble>
              {isThai 
                ? "ยินดีต้อนรับสู่ห้องจัดบัตรคำศัพท์อัจฉริยะจ้า! วันนี้อยากฝึกจดจำคำศัพท์สะสมในคลังด้วยวิธีไหนดีจ๊ะ? 🎴"
                : "Welcome to smart flashcard setup! How would you like to build your review set today? 🎴"}
            </AIBubble>
            
            <div className="flex flex-col gap-3.5 mt-2 pl-12 animate-fade-in w-full max-w-[85%] self-start">
              <button
                type="button"
                onClick={() => handleSelectMethod("ai")}
                className="w-full text-left rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-4 shadow-nb-sm hover:shadow-nb-md active:translate-y-[2px] cursor-pointer flex items-center gap-3"
              >
                <span className="text-xl">🤖</span>
                <div>
                  <div className="font-extrabold text-sm text-text-primary">
                    {isThai ? "ให้ Evely ช่วยจัดเซ็ตคำศัพท์ให้" : "Let Evely curate it for me"}
                  </div>
                  <div className="text-xs font-semibold text-text-secondary mt-0.5">
                    {isThai ? "คัดสรรศัพท์อัตโนมัติตาม หมวดหมู่ ล่าสุด หรือ สุ่มผสมปนปน" : "Auto-filter words by custom search, recents, randoms, etc."}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod("manual")}
                className="w-full text-left rounded-2xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-4 shadow-nb-sm hover:shadow-nb-md active:translate-y-[2px] cursor-pointer flex items-center gap-3"
              >
                <span className="text-xl">📝</span>
                <div>
                  <div className="font-extrabold text-sm text-text-primary">
                    {isThai ? "ฉันขอเลือกคำศัพท์ในคลังด้วยตัวเอง" : "I want to select words myself"}
                  </div>
                  <div className="text-xs font-semibold text-text-secondary mt-0.5">
                    {isThai ? "เปิดดูรายการคำศัพท์แล้วติ๊กเลือกคำที่อยากเล่นในเกมรอบนี้" : "Browse all saved vocabulary in your vault and pick exactly what to study"}
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {currentStep === "ai-strategy" && (
          <div className="flex flex-col gap-4">
            <AIBubble>
              {isThai
                ? "อยากให้ Evely คัดศัพท์สะสมแนวไหนมาสุ่มเล่นดีจ๊ะ? 🔄"
                : "What sorting pattern should Evely use for your vocabulary bank? 🔄"}
            </AIBubble>
            
            <div className="grid grid-cols-1 gap-3.5 mt-2 pl-12 animate-fade-in w-full max-w-[85%] self-start">
              <button
                type="button"
                onClick={() => handleSelectStrategy("recent")}
                className="w-full text-left rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3 shadow-nb-sm hover:shadow-nb-md cursor-pointer font-bold text-xs"
              >
                🆕 {isThai ? "คำศัพท์ล่าสุดที่เพิ่งสแกน" : "Most recently scanned"}
              </button>
              
              <button
                type="button"
                onClick={() => handleSelectStrategy("random")}
                className="w-full text-left rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3 shadow-nb-sm hover:shadow-nb-md cursor-pointer font-bold text-xs"
              >
                🔄 {isThai ? "สุ่มผสมผสานทั้งหมดในคลัง" : "Random mix of vault"}
              </button>

              <button
                type="button"
                onClick={() => handleSelectStrategy("oldest")}
                className="w-full text-left rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3 shadow-nb-sm hover:shadow-nb-md cursor-pointer font-bold text-xs"
              >
                ⏳ {isThai ? "ศัพท์เก่าทวนความหลัง (กันลืม)" : "Older words review"}
              </button>

              <button
                type="button"
                onClick={() => handleSelectStrategy("topic")}
                className="w-full text-left rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3 shadow-nb-sm hover:shadow-nb-md cursor-pointer font-bold text-xs"
              >
                ⌨ {isThai ? "ค้นหาคัดตามหมวดหมู่คำศัพท์ (Fuzzy Search)" : "Search custom category keyword"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "ai-topic-input" && (
          <div className="flex flex-col gap-4">
            <AIBubble>
              {isThai
                ? "พิมพ์ระบุคำหรือหัวข้อที่ต้องการค้นหาทวนได้เลยจ้า (เช่น อาหาร, สัตว์, บ้าน): 🗣️"
                : "Type custom search term to filter your vault (e.g. food, animal, family): 🗣️"}
            </AIBubble>
            
            <div className="flex flex-col gap-3 mt-2 pl-12 animate-fade-in w-full max-w-[85%] self-start">
              <Input
                placeholder={isThai ? "กรอกหัวข้อศัพท์ เช่น ผลไม้" : "e.g. fruit"}
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onPressEnter={handleConfirmTopic}
                maxLength={24}
                className="border-3 border-border-color rounded-xl"
              />
              <button
                type="button"
                onClick={handleConfirmTopic}
                className="rounded-xl border-3 border-border-color bg-accent-blue py-2 px-4 text-xs font-black text-white shadow-nb-sm active:translate-y-[1px] cursor-pointer"
              >
                {isThai ? "ค้นหาหมวดนี้" : "Apply Category Filter"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "ai-size" && (
          <div className="flex flex-col gap-4">
            <AIBubble>
              {isThai
                ? "อยากทวนบัตรคำศัพท์รอบนี้กี่คำดีจ๊ะ? 🎯"
                : "How many cards do you want to play? 🎯"}
            </AIBubble>
            
            <div className="grid grid-cols-2 gap-3.5 mt-2 pl-12 animate-fade-in w-full max-w-[85%] self-start">
              {[5, 10, 20].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSelectSize(size)}
                  className="rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3.5 shadow-nb-sm hover:shadow-nb-md cursor-pointer font-black text-sm"
                >
                  {size} {isThai ? "คำ" : "words"}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleSelectSize("all")}
                className="rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] p-3.5 shadow-nb-sm hover:shadow-nb-md cursor-pointer font-black text-sm"
              >
                {isThai ? "คำทั้งหมด" : "All Words"}
              </button>
            </div>
          </div>
        )}

        {currentStep === "ai-confirm" && (
          <div className="flex flex-col gap-4">
            <AIBubble>
              {isThai
                ? `ยอดเยี่ยมมากจ้า! Evely ทำการคัดกรองเซ็ตบัตรคำศัพท์แบบอัจฉริยะเสร็จสิ้นแล้ว พร้อมเริ่มเล่นหรือยังจ๊ะ? 🎉`
                : `Awesome! Evely successfully curated your custom flashcard set. Are you ready to play? 🎉`}
            </AIBubble>
            
            <div className="flex flex-col gap-3 mt-2 pl-12 animate-fade-in w-full max-w-[85%] self-start pb-4">
              <button
                type="button"
                onClick={handleLaunchAICurated}
                className="w-full rounded-2xl border-3 border-border-color bg-accent-yellow py-3.5 text-center font-black uppercase text-black text-sm shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm cursor-pointer animate-bounce"
              >
                🚀 {isThai ? "เริ่มเล่นบัตรคำศัพท์เลย!" : "Start review session now!"}
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="w-full text-center text-xs font-extrabold underline text-text-secondary cursor-pointer"
              >
                🔄 {isThai ? "ตั้งค่าใหม่" : "Setup another set"}
              </button>
            </div>
          </div>
        )}

        {/* Option B: Manual Word Selection list inline */}
        {currentStep === "manual-select" && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <AIBubble>
              {isThai
                ? `ติ๊กเลือกคำศัพท์ในคลังสะสมที่คุณต้องการทวนสำหรับรอบนี้ได้เลยจ้า (${selectedWordIds.length} คำที่เลือกแล้ว): 📝`
                : `Check the specific words in your vault you want to study for this round (${selectedWordIds.length} selected): 📝`}
            </AIBubble>
            
            <div className="flex flex-col gap-3 mt-2 pl-12 flex-1 min-h-0 w-full max-w-[90%] self-start">
              {/* Simple fuzzy search in selection screen */}
              <Input
                prefix={<SearchOutlined />}
                placeholder={isThai ? "ค้นหาคำศัพท์ในคลัง..." : "Search saved words..."}
                value={manualSearchQuery}
                onChange={(e) => setManualSearchQuery(e.target.value)}
                className="border-3 border-border-color rounded-xl"
              />

              {/* Saved Words List with Checkboxes */}
              <div className="flex-1 overflow-y-auto border-3 border-border-color rounded-xl p-2.5 bg-white dark:bg-[#2d2d44] flex flex-col gap-2 min-h-[220px]">
                {filteredManualWords.length === 0 ? (
                  <p className="text-center text-text-meta mt-12 text-xs font-semibold">
                    {isThai ? "ไม่พบคำศัพท์ที่ตรงเงื่อนไขการค้นหา" : "No words matching search term"}
                  </p>
                ) : (
                  filteredManualWords.map((word) => {
                    const imgUrl = word.imageBlob ? URL.createObjectURL(word.imageBlob) : "";
                    const romanization = word.romanization || word.korean || word.label;
                    return (
                      <div
                        key={word.id}
                        onClick={() => handleToggleManualWord(word.id)}
                        className={`flex items-center gap-3 p-2 rounded-xl border-2 border-border-color bg-[#FFF9F0] dark:bg-[#1a1a2e] cursor-pointer transition-all hover:bg-white ${
                          selectedWordIds.includes(word.id) ? "border-accent-green shadow-nb-sm" : "opacity-90"
                        }`}
                      >
                        <Checkbox
                          checked={selectedWordIds.includes(word.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleToggleManualWord(word.id)}
                        />
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={word.korean}
                            className="w-12 h-12 object-cover rounded-lg border-2 border-border-color"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg border-2 border-border-color bg-white flex items-center justify-center text-lg">
                            🍎
                          </div>
                        )}
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
                  })
                )}
              </div>

              {/* Start game action button */}
              <div className="pt-2 pb-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleLaunchManual}
                  disabled={selectedWordIds.length === 0}
                  className="w-full rounded-2xl border-3 border-border-color bg-accent-yellow py-3.5 text-center font-black uppercase text-black text-sm shadow-nb-md active:translate-y-[2px] active:shadow-nb-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🚀 {isThai ? `ทบทวนด้วยบัตรคำ (${selectedWordIds.length} คำ)` : `Play Flashcards (${selectedWordIds.length} words)`}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full text-center text-xs font-bold underline text-text-secondary cursor-pointer"
                >
                  🔄 {isThai ? "กลับไปตั้งค่าใหม่" : "Choose another method"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spacer helper anchor */}
        <div ref={chatEndRef} />
      </div>

      {/* Static Footer back option */}
      <div className="p-4 border-t-3 border-border-color bg-card-bg flex justify-between items-center z-10 shadow-nb-sm">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border-3 border-border-color bg-white dark:bg-[#2d2d44] px-4 py-2 text-xs font-black text-text-primary shadow-nb-sm active:translate-y-[1px] cursor-pointer"
        >
          <ArrowLeftOutlined />
          <span>{isThai ? "กลับหน้าแรก" : "Cancel"}</span>
        </button>
        <span className="text-[10px] font-black tracking-widest uppercase text-text-meta">
          Evely Flashcard Room
        </span>
      </div>
    </div>
  );
}
