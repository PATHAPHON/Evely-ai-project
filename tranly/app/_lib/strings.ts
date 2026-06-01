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
    tabLibrary: string;
    tabAIScan: string;
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
  library: {
    title: string;
    subtitle: string;
    wordsTab: string;
    flashcardsTab: string;
    lessonsTab: string;
    chatsTab: string;
    noLessons: string;
    noChats: string;
    noFlashcards: string;
    replayLesson: string;
    readChat: string;
    playFlashcard: string;
    createSet: string;
  };
  profile: {
    title: string;
    subtitle: string;
    settings: string;
    generalSection: string;
    aiSection: string;
    dangerZone: string;
    learningLanguage: string;
    translationLanguage: string;
    darkMode: string;
  };
  scan: {
    closeAria: string;
    captureAria: string;
    errPermissionDenied: string;
    errNotFound: string;
    errStreamInterrupted: string;
    errCaptureFailed: string;
    btnTryAgain: string;
    btnDismiss: string;
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
    tabLibrary: 'Library',
    tabAIScan: 'Evely',
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
  library: {
    title: 'My Vault',
    subtitle: 'Track your vocabulary, lessons, and chats',
    wordsTab: 'Word Bank',
    flashcardsTab: 'Flashcards',
    lessonsTab: 'AI Lessons',
    chatsTab: 'Chat Logs',
    noLessons: 'No lessons generated yet',
    noChats: 'No chat transcripts saved yet',
    noFlashcards: 'No flashcard sets created yet',
    replayLesson: 'Replay Lesson',
    readChat: 'Read Chat',
    playFlashcard: 'Play Set',
    createSet: 'Create Set',
  },
  profile: {
    title: 'Profile',
    subtitle: 'Customize your learning experience',
    settings: 'Settings',
    generalSection: 'General & Learning',
    aiSection: 'AI Assistant Settings',
    dangerZone: 'Danger Zone',
    learningLanguage: 'Learning Language',
    translationLanguage: 'Translation Language',
    darkMode: 'Dark Mode',
  },
  scan: {
    closeAria: 'Close camera',
    captureAria: 'Take photo',
    errPermissionDenied: 'Please allow camera access in your device settings.',
    errNotFound: 'No camera found on this device.',
    errStreamInterrupted: 'Camera connection lost.',
    errCaptureFailed: 'Capture failed. Please try again.',
    btnTryAgain: 'Try again',
    btnDismiss: 'Dismiss',
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
    tabLibrary: 'คลังข้อมูล',
    tabAIScan: 'Evely',
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
  library: {
    title: 'คลังการเรียนรู้ 📚',
    subtitle: 'ประวัติคำศัพท์ บทเรียน และการสนทนากับ AI ของคุณ',
    wordsTab: 'คำศัพท์สะสม',
    flashcardsTab: 'บัตรคำศัพท์',
    lessonsTab: 'บทเรียน AI',
    chatsTab: 'บันทึกสนทนา',
    noLessons: 'ยังไม่มีบทเรียนที่ถูกสร้างขึ้น',
    noChats: 'ยังไม่มีประวัติการแชทบันทึกไว้',
    noFlashcards: 'ยังไม่มีชุดบัตรคำที่สร้างไว้',
    replayLesson: 'เรียนอีกครั้ง',
    readChat: 'อ่านแชท',
    playFlashcard: 'เล่นบัตรคำ',
    createSet: 'สร้างชุดบัตรคำ',
  },
  profile: {
    title: 'โปรไฟล์',
    subtitle: 'ปรับแต่งประสบการณ์การเรียนของคุณ',
    settings: 'การตั้งค่า',
    generalSection: 'ทั่วไปและการเรียนรู้',
    aiSection: 'การตั้งค่าปัญญาประดิษฐ์ AI',
    dangerZone: 'พื้นที่อันตราย',
    learningLanguage: 'ภาษาหลักที่เรียน',
    translationLanguage: 'ภาษาของคำแปล',
    darkMode: 'โหมดมืด',
  },
  scan: {
    closeAria: 'ปิดกล้อง',
    captureAria: 'ถ่ายภาพ',
    errPermissionDenied: 'กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าอุปกรณ์',
    errNotFound: 'ไม่พบกล้องบนอุปกรณ์นี้',
    errStreamInterrupted: 'การเชื่อมต่อกล้องขาดหาย',
    errCaptureFailed: 'ถ่ายภาพไม่สำเร็จ กรุณาลองอีกครั้ง',
    btnTryAgain: 'ลองอีกครั้ง',
    btnDismiss: 'ปิด',
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
