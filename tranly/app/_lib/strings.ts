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
    generalDesc: string;
    aiSection: string;
    aiDesc: string;
    dangerZone: string;
    dangerDesc: string;
    dangerWarning: string;
    learningLanguage: string;
    translationLanguage: string;
    darkMode: string;
    /** Header actions + viewer. */
    editProfile: string;
    shareProfile: string;
    shareCopied: string;
    viewProfileAria: string;
    settingsAria: string;
    closeAria: string;
    account: string;
    accountItem: string;
    accountDesc: string;
    /** Edit-profile form. */
    changePhoto: string;
    displayNameLabel: string;
    handleLabel: string;
    roleLabel: string;
    rolePlaceholder: string;
    bioLabel: string;
    bioPlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    save: string;
    cancel: string;
    saved: string;
    noBio: string;
    /** Stat strip. */
    statWords: string;
    statFlashcards: string;
    statSessions: string;
    statStreak: string;
    /** Learning heatmap. */
    heatTitle: (days: number) => string;
    heatSubtitle: (days: number, period: string) => string;
    period3m: string;
    period6m: string;
    period1y: string;
    legendLess: string;
    legendMore: string;
    heatTapHint: string;
    heatStudied: (dateStr: string, cards: number) => string;
    heatRest: (dateStr: string) => string;
    monthsShort: string[];
    /** Streak card. */
    streakTitle: (days: number) => string;
    streakRecord: (max: number, toBeat: number) => string;
    streakNew: (days: number) => string;
    weekdays: string[];
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
    generalDesc: 'Change learning language, dark mode, and translations',
    aiSection: 'AI Assistant Settings',
    aiDesc: 'Configure API key and model version for AI assistant',
    dangerZone: 'Danger Zone',
    dangerDesc: 'Delete or reset all of your learning history data',
    dangerWarning:
      'Permanently delete all your learning stats, vocabulary, study sessions, and AI assistant chat transcripts. This action is irreversible.',
    learningLanguage: 'Learning Language',
    translationLanguage: 'Translation Language',
    darkMode: 'Dark Mode',
    editProfile: 'Edit Profile',
    shareProfile: 'Share',
    shareCopied: 'Profile link copied',
    viewProfileAria: 'View full profile',
    settingsAria: 'Settings',
    closeAria: 'Close',
    account: 'Account',
    accountItem: 'Account & Profile',
    accountDesc: 'Manage your personal info',
    changePhoto: 'Change photo',
    displayNameLabel: 'Display name',
    handleLabel: 'Username',
    roleLabel: 'Status / Learning',
    rolePlaceholder: 'e.g. Learning Korean N4',
    bioLabel: 'Bio',
    bioPlaceholder: 'Tell us a little about yourself',
    locationLabel: 'Location',
    locationPlaceholder: 'e.g. Bangkok',
    save: 'Save',
    cancel: 'Cancel',
    saved: 'Profile saved',
    noBio: 'No bio yet — tap Edit Profile to add one.',
    statWords: 'Words',
    statFlashcards: 'Flashcards',
    statSessions: 'Sessions',
    statStreak: 'Day streak',
    heatTitle: (days) => `${days} days studied`,
    heatSubtitle: (days, period) => `Studied ${days} days in the last ${period}`,
    period3m: '3mo',
    period6m: '6mo',
    period1y: '1yr',
    legendLess: 'Less',
    legendMore: 'More',
    heatTapHint: 'Tap a cell to see that day’s activity',
    heatStudied: (dateStr, cards) =>
      `${dateStr} · reviewed ${cards} ${cards === 1 ? 'card' : 'cards'}`,
    heatRest: (dateStr) => `${dateStr} · rest day, no study`,
    monthsShort: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ],
    streakTitle: (days) => `${days}-day streak`,
    streakRecord: (max, toBeat) =>
      toBeat > 0
        ? `Best ${max} days · ${toBeat} more to beat it!`
        : `Best ${max} days · new record! 🎉`,
    streakNew: (days) => `${days} days in a row — keep it up!`,
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
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
    generalDesc: 'เปลี่ยนภาษาหลัก โหมดมืด และคำแปล',
    aiSection: 'การตั้งค่าปัญญาประดิษฐ์ AI',
    aiDesc: 'ตั้งค่าคีย์ API และเวอร์ชันโมเดลสำหรับผู้ช่วย AI',
    dangerZone: 'พื้นที่อันตราย',
    dangerDesc: 'ลบหรือล้างข้อมูลประวัติการเรียนทั้งหมดของคุณ',
    dangerWarning:
      'ลบประวัติการเรียนรู้ คำศัพท์ที่บันทึกไว้ทั้งหมด รวมถึงบทสนทนาและประวัติแชทกับ AI (คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้)',
    learningLanguage: 'ภาษาหลักที่เรียน',
    translationLanguage: 'ภาษาของคำแปล',
    darkMode: 'โหมดมืด',
    editProfile: 'แก้ไขโปรไฟล์',
    shareProfile: 'แชร์',
    shareCopied: 'คัดลอกลิงก์โปรไฟล์แล้ว',
    viewProfileAria: 'ดูโปรไฟล์แบบเต็ม',
    settingsAria: 'ตั้งค่า',
    closeAria: 'ปิด',
    account: 'บัญชี',
    accountItem: 'บัญชีและโปรไฟล์',
    accountDesc: 'จัดการข้อมูลส่วนตัว',
    changePhoto: 'เปลี่ยนรูปโปรไฟล์',
    displayNameLabel: 'ชื่อที่แสดง',
    handleLabel: 'ชื่อผู้ใช้',
    roleLabel: 'สถานะ / กำลังเรียน',
    rolePlaceholder: 'เช่น กำลังเรียนภาษาเกาหลี N4',
    bioLabel: 'แนะนำตัว',
    bioPlaceholder: 'เล่าเกี่ยวกับตัวคุณสักนิด',
    locationLabel: 'ที่อยู่',
    locationPlaceholder: 'เช่น กรุงเทพฯ',
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    saved: 'บันทึกโปรไฟล์แล้ว',
    noBio: 'ยังไม่มีคำแนะนำตัว — แตะแก้ไขโปรไฟล์เพื่อเพิ่ม',
    statWords: 'คำศัพท์',
    statFlashcards: 'แฟลชการ์ด',
    statSessions: 'รอบเรียน',
    statStreak: 'วันต่อเนื่อง',
    heatTitle: (days) => `${days} วันที่เรียน`,
    heatSubtitle: (days, period) => `เรียนไป ${days} วันในช่วง ${period}ที่ผ่านมา`,
    period3m: '3ด.',
    period6m: '6ด.',
    period1y: '1ปี',
    legendLess: 'น้อย',
    legendMore: 'มาก',
    heatTapHint: 'แตะที่ช่องเพื่อดูกิจกรรมของวันนั้น',
    heatStudied: (dateStr, cards) => `${dateStr} · ทบทวนไป ${cards} คำ`,
    heatRest: (dateStr) => `${dateStr} · หยุดพัก ไม่ได้เรียน`,
    monthsShort: [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ],
    streakTitle: (days) => `ต่อเนื่อง ${days} วัน`,
    streakRecord: (max, toBeat) =>
      toBeat > 0
        ? `สถิติสูงสุด ${max} วัน · อีก ${toBeat} วันทำลายสถิติ!`
        : `สถิติสูงสุด ${max} วัน · สถิติใหม่! 🎉`,
    streakNew: (days) => `ต่อเนื่อง ${days} วันแล้ว — สู้ต่อไป!`,
    weekdays: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'],
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
