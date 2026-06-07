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
    tabTopik: string;
    tabProfile: string;
    tabMore: string;
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
  topik: {
    title: string;
    selectType: string;
    topik1Label: string;
    topik1Desc: string;
    topik2Label: string;
    topik2Desc: string;
    reading: string;
    listening: string;
    questionOf: (n: number, total: number) => string;
    playAudio: string;
    replayAudio: string;
    next: string;
    submit: string;
    scoreTitle: string;
    scoreTotal: (correct: number, total: number) => string;
    readingScore: string;
    listeningScore: string;
    correct: string;
    incorrect: string;
    retry: string;
    changeType: string;
    backToSelection: string;
    startExam: string;
    filterAll: string;
    filterTopik1: string;
    filterTopik2: string;
    setName: (n: number) => string;
    difficultyBeginner: string;
    difficultyIntermediate: string;
    difficultyAdvanced: string;
    questionsCount: (count: number) => string;
    examPageBack: string;
    progress: (current: number, total: number) => string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    loginBtn: string;
    registerBtn: string;
    dontHaveAccount: string;
    alreadyHaveAccount: string;
    switchToRegister: string;
    switchToLogin: string;
    logoutBtn: string;
    loggedInAs: string;
    errorInvalidEmail: string;
    errorPasswordLength: string;
    errorPasswordMismatch: string;
    errorGeneric: string;
    successRegister: string;
    successLogin: string;
    successLogout: string;
    anonymousAccountNotice: string;
    backToProfile: string;
    googleBtn: string;
    guestBtn: string;
    successGuest: string;
  };
}

const en: UIStrings = {
  common: {
    tabHome: 'Daily',
    tabWord: 'Words',
    tabAI: 'AI',
    tabLibrary: 'Library',
    tabAIScan: 'Evely',
    tabTopik: 'TOPIK',
    tabProfile: 'Profile',
    tabMore: 'More',
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
  topik: {
    title: 'TOPIK Practice',
    selectType: 'Select Exam Level',
    topik1Label: 'TOPIK I (Beginner)',
    topik1Desc: 'Levels 1-2',
    topik2Label: 'TOPIK II (Intermediate-Advanced)',
    topik2Desc: 'Levels 3-6',
    reading: 'Reading',
    listening: 'Listening',
    questionOf: (n: number, total: number) => `Question ${n}/${total}`,
    playAudio: 'Play Audio',
    replayAudio: 'Replay Audio',
    next: 'Next',
    submit: 'Submit',
    scoreTitle: 'Your Score',
    scoreTotal: (correct: number, total: number) => `${correct}/${total}`,
    readingScore: 'Reading Score',
    listeningScore: 'Listening Score',
    correct: 'Correct',
    incorrect: 'Incorrect',
    retry: 'Try Again',
    changeType: 'Change Level',
    backToSelection: 'Back to Selection',
    startExam: 'Start Exam',
    filterAll: 'All',
    filterTopik1: 'TOPIK I',
    filterTopik2: 'TOPIK II',
    setName: (n) => `Mock Exam ${n}`,
    difficultyBeginner: 'Beginner',
    difficultyIntermediate: 'Intermediate',
    difficultyAdvanced: 'Advanced',
    questionsCount: (n) => `${n} questions`,
    examPageBack: 'Back',
    progress: (current, total) => `${current}/${total}`,
  },
  auth: {
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Log in to continue your Korean learning journey',
    registerTitle: 'Create Account',
    registerSubtitle: 'Save your progress and access your words anywhere',
    emailLabel: 'Email Address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 6 characters',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    loginBtn: 'Log In',
    registerBtn: 'Sign Up',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',
    switchToRegister: 'Sign Up',
    switchToLogin: 'Log In',
    logoutBtn: 'Log Out',
    loggedInAs: 'Signed in as',
    errorInvalidEmail: 'Please enter a valid email address.',
    errorPasswordLength: 'Password must be at least 6 characters.',
    errorPasswordMismatch: 'Passwords do not match.',
    errorGeneric: 'An error occurred. Please try again.',
    successRegister: 'Account created successfully! Check your email to confirm.',
    successLogin: 'Logged in successfully!',
    successLogout: 'Logged out successfully!',
    anonymousAccountNotice: 'You are currently a guest. Sign up to save your words permanently.',
    backToProfile: 'Back to Profile',
    googleBtn: 'Continue with Google',
    guestBtn: 'Continue as Guest',
    successGuest: 'Logged in as guest!',
  },
};

const th: UIStrings = {
  common: {
    tabHome: 'ประจำวัน',
    tabWord: 'คำศัพท์',
    tabAI: 'AI',
    tabLibrary: 'คลังข้อมูล',
    tabAIScan: 'Evely',
    tabTopik: 'TOPIK',
    tabProfile: 'โปรไฟล์',
    tabMore: 'เพิ่มเติม',
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
  topik: {
    title: 'ฝึกทำข้อสอบ TOPIK',
    selectType: 'เลือกระดับข้อสอบ',
    topik1Label: 'TOPIK I (ระดับต้น)',
    topik1Desc: 'ระดับ 1-2',
    topik2Label: 'TOPIK II (ระดับกลาง-สูง)',
    topik2Desc: 'ระดับ 3-6',
    reading: 'การอ่าน',
    listening: 'การฟัง',
    questionOf: (n: number, total: number) => `ข้อ ${n}/${total}`,
    playAudio: 'เล่นเสียง',
    replayAudio: 'เล่นเสียงอีกครั้ง',
    next: 'ข้อถัดไป',
    submit: 'ส่งคำตอบ',
    scoreTitle: 'ผลคะแนน',
    scoreTotal: (correct: number, total: number) => `${correct}/${total}`,
    readingScore: 'คะแนนอ่าน',
    listeningScore: 'คะแนนฟัง',
    correct: 'ถูก',
    incorrect: 'ผิด',
    retry: 'ทำใหม่',
    changeType: 'เปลี่ยนระดับ',
    backToSelection: 'กลับไปเลือกระดับ',
    startExam: 'เริ่มทำข้อสอบ',
    filterAll: 'ทั้งหมด',
    filterTopik1: 'TOPIK I',
    filterTopik2: 'TOPIK II',
    setName: (n) => `ข้อสอบจำลอง ${n}`,
    difficultyBeginner: 'ระดับต้น',
    difficultyIntermediate: 'ระดับกลาง',
    difficultyAdvanced: 'ระดับสูง',
    questionsCount: (n) => `${n} ข้อ`,
    examPageBack: 'กลับ',
    progress: (current, total) => `${current}/${total}`,
  },
  auth: {
    loginTitle: 'ยินดีต้อนรับกลับมา',
    loginSubtitle: 'เข้าสู่ระบบเพื่อเรียนภาษาเกาหลีต่อ',
    registerTitle: 'สมัครสมาชิก',
    registerSubtitle: 'บันทึกความก้าวหน้าและเข้าถึงคำศัพท์ได้จากทุกที่',
    emailLabel: 'อีเมล',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'รหัสผ่าน',
    passwordPlaceholder: 'อย่างน้อย 6 ตัวอักษร',
    confirmPasswordLabel: 'ยืนยันรหัสผ่าน',
    confirmPasswordPlaceholder: 'กรอกรหัสผ่านอีกครั้ง',
    loginBtn: 'เข้าสู่ระบบ',
    registerBtn: 'สมัครสมาชิก',
    dontHaveAccount: 'ยังไม่มีบัญชีใช่หรือไม่?',
    alreadyHaveAccount: 'มีบัญชีอยู่แล้วใช่หรือไม่?',
    switchToRegister: 'สมัครสมาชิก',
    switchToLogin: 'เข้าสู่ระบบ',
    logoutBtn: 'ออกจากระบบ',
    loggedInAs: 'เข้าสู่ระบบด้วย',
    errorInvalidEmail: 'กรุณากรอกอีเมลที่ถูกต้อง',
    errorPasswordLength: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
    errorPasswordMismatch: 'รหัสผ่านไม่ตรงกัน',
    errorGeneric: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
    successRegister: 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยัน',
    successLogin: 'เข้าสู่ระบบสำเร็จ!',
    successLogout: 'ออกจากระบบสำเร็จแล้ว!',
    anonymousAccountNotice: 'ขณะนี้คุณกำลังใช้งานในฐานะผู้ใช้ทั่วไป สมัครสมาชิกเพื่อบันทึกคำศัพท์อย่างถาวร',
    backToProfile: 'กลับไปยังโปรไฟล์',
    googleBtn: 'ดำเนินการต่อด้วย Google',
    guestBtn: 'เข้าใช้งานแบบผู้ใช้ทั่วไป (Guest)',
    successGuest: 'เข้าสู่ระบบในฐานะผู้ใช้ทั่วไปสำเร็จ!',
  },
};

const STRINGS: Record<TranslationLanguage, UIStrings> = { thai: th, english: en };

/** Returns the UI string table for the current session language. */
export function useStrings(): UIStrings {
  const { language } = useLanguagePreference();
  return STRINGS[language];
}
