'use client';

import { useLanguagePreference, type TranslationLanguage } from './useLanguagePreference';

/**
 * Single source of truth for user-facing UI copy.
 *
 * The app supports one language per session (Thai or English), chosen in
 * Profile and persisted via {@link useLanguagePreference}. Every screen should
 * pull its strings from here through {@link useStrings} instead of hardcoding
 * text, so a language switch flips the *whole* app consistently.
 */
export interface UIStrings {
  common: {
    tabHome: string;
    tabWord: string;
    tabAI: string;
    tabProfile: string;
    loading: string;
  };
  landing: {
    launching: string;
    loadingApp: string;
    openApp: string;
  };
  home: {
    greetingSubtitle: string;
  };
  learn: {
    title: string;
    subtitle: string;
    allWords: string;
    flashcard: string;
    noWords: string;
    scanNow: string;
    listenAria: string;
    deleteAria: string;
    /** Toast shown after deleting a word (before the undo window expires). */
    deleted: (word: string) => string;
    undo: string;
  };
  profile: {
    title: string;
    subtitle: string;
    settings: string;
  };
  scan: {
    closeAria: string;
    captureAria: string;
  };
  chat: {
    navLockedHint: string;
  };
}

const en: UIStrings = {
  common: {
    tabHome: 'Home',
    tabWord: 'Words',
    tabAI: 'AI',
    tabProfile: 'Profile',
    loading: 'Loading...',
  },
  landing: {
    launching: 'Launching Portal',
    loadingApp: 'Loading the app, please wait...',
    openApp: 'Open App',
  },
  home: {
    greetingSubtitle: 'Ready to learn Korean today?',
  },
  learn: {
    title: 'My Words',
    subtitle: 'Saved vocabulary for your Flashcards',
    allWords: 'All Words',
    flashcard: 'Flashcard',
    noWords: 'No saved words yet',
    scanNow: 'Scan Now',
    listenAria: 'Play pronunciation',
    deleteAria: 'Delete word',
    deleted: (word: string) => (word ? `Deleted “${word}”` : 'Word deleted'),
    undo: 'Undo',
  },
  profile: {
    title: 'Profile',
    subtitle: 'Customize your learning experience',
    settings: 'Settings',
  },
  scan: {
    closeAria: 'Close camera',
    captureAria: 'Take photo',
  },
  chat: {
    navLockedHint: 'Finish or end this session first',
  },
};

const th: UIStrings = {
  common: {
    tabHome: 'หน้าหลัก',
    tabWord: 'คำศัพท์',
    tabAI: 'AI',
    tabProfile: 'โปรไฟล์',
    loading: 'กำลังโหลด...',
  },
  landing: {
    launching: 'กำลังเปิดแอป',
    loadingApp: 'กำลังโหลดแอป กรุณารอสักครู่...',
    openApp: 'เปิดแอป',
  },
  home: {
    greetingSubtitle: 'พร้อมเรียนภาษาเกาหลีวันนี้หรือยัง?',
  },
  learn: {
    title: 'คำของฉัน',
    subtitle: 'คำศัพท์ที่บันทึกไว้สำหรับแฟลชการ์ด',
    allWords: 'คำทั้งหมด',
    flashcard: 'แฟลชการ์ด',
    noWords: 'ยังไม่มีคำที่บันทึกไว้',
    scanNow: 'สแกนเลย',
    listenAria: 'ฟังเสียง',
    deleteAria: 'ลบคำ',
    deleted: (word: string) => (word ? `ลบคำว่า “${word}” แล้ว` : 'ลบคำแล้ว'),
    undo: 'เลิกทำ',
  },
  profile: {
    title: 'โปรไฟล์',
    subtitle: 'ปรับแต่งประสบการณ์การเรียนของคุณ',
    settings: 'การตั้งค่า',
  },
  scan: {
    closeAria: 'ปิดกล้อง',
    captureAria: 'ถ่ายภาพ',
  },
  chat: {
    navLockedHint: 'เรียนหรือสนทนาให้จบ หรือกดสิ้นสุดก่อน',
  },
};

const STRINGS: Record<TranslationLanguage, UIStrings> = { thai: th, english: en };

/** Returns the UI string table for the current session language. */
export function useStrings(): UIStrings {
  const { language } = useLanguagePreference();
  return STRINGS[language];
}
