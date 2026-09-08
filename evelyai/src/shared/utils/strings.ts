'use client';


/**
 * Single source of truth for user-facing UI copy. Thai-only for now —
 * every screen should pull its strings from here via {@link useStrings}
 * instead of hardcoding text.
 */
export interface UIStrings {
  common: {
    tabHome: string;
    tabWord: string;
    tabAI: string;
    tabLibrary: string;
    tabProfile: string;
    tabMore: string;
    loading: string;
    /** Divider word between form and social login (e.g. "หรือ"). */
    or: string;
    appName: string;
    appNameEn: string;
  };
  layout: {
    backAria: string;
    menuAria: string;
    loadingMenu: string;
    /** Header titles for specific routes. */
    wordsTitle: string;
    profileTitle: string;
  };
  words: {
    title: string;
    searchPlaceholder: string;
    countUnit: string;
    notFound: string;
    sortLabels: readonly [string, string, string, string];
    sortAria: (label: string) => string;
  };
  errors: {
    wordStatusUnavailable: string;
    addWordFailed: string;
    removeWordFailed: string;
    reviewFailed: string;
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
    showTranslation: string;
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
    badgeMember: string;
    badgeGuest: string;
    billing: string;
    usage: string;
    voice: string;
    /** Billing + usage (Phase E). */
    planFree: string;
    planPremium: string;
    upgradePremium: string;
    manageBilling: string;
    expiresOn: string;
    usageToday: string;
    usageResetMidnight: string;
    legalTerms: string;
    legalPrivacy: string;
    /** Edit-profile form. */
    changePhoto: string;
    displayNameLabel: string;
    handleLabel: string;
    save: string;
    cancel: string;
    saved: string;
    deleteAccount: string;
    deleteAccountWarning: string;
    deleteAccountConfirmWord: string;
    deleteAccountConfirmPrompt: (word: string) => string;
    deleteAccountBtn: string;
    infoAria: string;
    themeToLight: string;
    themeToDark: string;
    /** Stat strip. */
    statWords: string;
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
  chat: {
    navLockedHint: string;
    /** Input bar. */
    inputPlaceholder: string;
    inputAria: string;
    micStart: string;
    micStop: string;
    voiceModeAria: string;
    sendAria: string;
    optionsMenuAria: string;
    guidedLearning: string;
    removeWordAria: (word: string) => string;
    /** Message list. */
    messagesAria: string;
    retry: string;
    retryAria: string;
    /** AI message actions. */
    likeAria: string;
    dislikeAria: string;
    copyAria: string;
    moreAria: string;
    playAria: string;
    /** User message grammar feedback. */
    grammarCorrect: string;
    grammarErrorHint: string;
    grammarErrorToggleAria: string;
    grammarErrorTitle: string;
    yourSentence: string;
    closeDetailsAria: string;
    close: string;
    /** Reply suggestions. */
    suggestPrompt: string;
    collapse: string;
    customAnswerPlaceholder: string;
    customAnswerAria: string;
    customAnswerBtn: string;
    skip: string;
    submitAnswer: string;
  };
  drawer: {
    newChat: string;
    navChat: string;
    navWords: string;
    navGem: string;
    navRefresh: string;
    recent: string;
    allChats: string;
    untitledChat: string;
    settingsAria: string;
  };
  recents: {
    title: string;
    searchPlaceholder: string;
    empty: string;
    deleteChatAria: string;
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
    errorInvalidCredentials: string;
    errorEmailNotConfirmed: string;
    errorEmailAlreadyRegistered: string;
    errorTooManyRequests: string;
    successRegister: string;
    successLogin: string;
    successLogout: string;
    backToProfile: string;
    googleBtn: string;
    forgotPassword: string;
    resetPasswordTitle: string;
    resetPasswordSubtitle: string;
    resetPasswordBtn: string;
    resetPasswordEmailSent: string;
    updatePasswordTitle: string;
    updatePasswordBtn: string;
    updatePasswordSuccess: string;
    tosPrefix: string;
    tosTerms: string;
    tosAnd: string;
    tosPrivacy: string;
    tosError: string;
  };
}

export const th: UIStrings = {
  common: {
    tabHome: 'ประจำวัน',
    tabWord: 'คำศัพท์',
    tabAI: 'AI',
    tabLibrary: 'คลังข้อมูล',
    tabProfile: 'โปรไฟล์',
    tabMore: 'เพิ่มเติม',
    loading: 'กำลังโหลด...',
    or: 'หรือ',
    appName: 'EvelyAI',
    appNameEn: 'EvelyAI',
  },
  layout: {
    backAria: 'ย้อนกลับ',
    menuAria: 'เปิดเมนู',
    loadingMenu: 'กำลังโหลดเมนู...',
    wordsTitle: 'คำศัพท์สะสม',
    profileTitle: 'โปรไฟล์ของคุณ',
  },
  words: {
    title: 'คลังคำศัพท์',
    searchPlaceholder: 'ค้นหาคำศัพท์',
    countUnit: 'คำ',
    notFound: 'ไม่พบคำที่ค้นหา',
    sortLabels: ['ใหม่สุด', 'เก่าสุด', 'A → Z', 'Z → A'],
    sortAria: (label) => `จัดเรียงตาม: ${label}`,
  },
  errors: {
    wordStatusUnavailable: 'ดูสถานะคำไม่ได้ชั่วคราว ทุกคำจะแสดงเป็นยังไม่รู้จัก',
    addWordFailed: 'เพิ่มคำไม่สำเร็จ ลองอีกครั้ง',
    removeWordFailed: 'ลบคำไม่สำเร็จ ลองอีกครั้ง',
    reviewFailed: 'บันทึกการทบทวนไม่สำเร็จ ลองอีกครั้ง',
  },
  landing: {
    launching: 'กำลังเปิดแอป',
    loadingApp: 'กำลังโหลดแอป กรุณารอสักครู่...',
    openApp: 'เปิดแอป',
  },
  home: {
    greetingSubtitle: 'พร้อมเรียนภาษาอังกฤษวันนี้หรือยัง?',
  },
  learn: {
    title: 'คำของฉัน',
    subtitle: 'คำศัพท์ที่บันทึกไว้สำหรับแฟลชการ์ด',
    allWords: 'คำทั้งหมด',
    flashcard: 'แฟลชการ์ด',
    noWords: 'ยังไม่มีคำที่บันทึกไว้',
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
    showTranslation: 'แสดงคำแปลภาษาไทย',
    editProfile: 'แก้ไขโปรไฟล์',
    shareProfile: 'แชร์',
    shareCopied: 'คัดลอกลิงก์โปรไฟล์แล้ว',
    viewProfileAria: 'ดูโปรไฟล์แบบเต็ม',
    settingsAria: 'ตั้งค่า',
    closeAria: 'ปิด',
    account: 'บัญชี',
    accountItem: 'บัญชีและโปรไฟล์',
    accountDesc: 'จัดการข้อมูลส่วนตัว',
    badgeMember: 'สมาชิก',
    badgeGuest: 'ผู้ใช้ทั่วไป',
    billing: 'การเรียกเก็บเงิน',
    usage: 'การใช้งาน',
    voice: 'เสียง',
    planFree: 'ฟรี',
    planPremium: 'Premium ✓',
    upgradePremium: 'อัปเกรด Premium',
    manageBilling: 'จัดการ',
    expiresOn: 'หมดอายุ',
    usageToday: 'งบ AI วันนี้',
    usageResetMidnight: 'รีเซ็ตเที่ยงคืน',
    legalTerms: 'ข้อกำหนด',
    legalPrivacy: 'นโยบายความเป็นส่วนตัว',
    changePhoto: 'เปลี่ยนรูปโปรไฟล์',
    displayNameLabel: 'ชื่อที่แสดง',
    handleLabel: 'ชื่อผู้ใช้',
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    saved: 'บันทึกโปรไฟล์แล้ว',
    deleteAccount: 'ลบบัญชี',
    deleteAccountWarning: 'การลบบัญชีจะลบข้อมูลทั้งหมดของคุณอย่างถาวร ไม่สามารถย้อนกลับได้',
    deleteAccountConfirmWord: 'ยืนยัน',
    deleteAccountConfirmPrompt: (word) => `พิมพ์ “${word}” เพื่อยืนยันการลบ`,
    deleteAccountBtn: 'ลบบัญชีถาวร',
    infoAria: 'ข้อมูลแอป',
    themeToLight: 'สลับเป็นโหมดสว่าง',
    themeToDark: 'สลับเป็นโหมดมืด',
    statWords: 'คำศัพท์',
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
  chat: {
    navLockedHint: 'เรียนหรือสนทนาให้จบ หรือกดสิ้นสุดก่อน',
    inputPlaceholder: 'ถามจีจีจบล่ะ',
    inputAria: 'ช่องพิมพ์ข้อความ',
    micStart: 'เริ่มพูด',
    micStop: 'หยุดพูด',
    voiceModeAria: 'เปิดโหมดสนทนาด้วยเสียง',
    sendAria: 'ส่งข้อความ',
    optionsMenuAria: 'เปิดเมนูตัวเลือก',
    guidedLearning: 'การเรียนรู้แบบมีคำแนะนำ',
    removeWordAria: (word) => `ลบ ${word}`,
    messagesAria: 'ข้อความในบทสนทนา',
    retry: 'ลองใหม่อีกครั้ง',
    retryAria: 'ส่งข้อความอีกครั้ง',
    likeAria: 'ถูกใจคำตอบนี้',
    dislikeAria: 'ไม่ถูกใจคำตอบนี้',
    copyAria: 'คัดลอกข้อความ',
    moreAria: 'ตัวเลือกเพิ่มเติม',
    playAria: 'ฟังเสียงอ่าน',
    grammarCorrect: 'ไวยากรณ์ถูกต้อง',
    grammarErrorHint: 'พบจุดที่ไวยากรณ์ผิด แตะเพื่อดูรายละเอียด',
    grammarErrorToggleAria: 'ดูรายละเอียดจุดที่ผิด',
    grammarErrorTitle: 'จุดที่ไวยากรณ์ผิด',
    yourSentence: 'ประโยคของคุณ',
    closeDetailsAria: 'ปิดรายละเอียด',
    close: 'ปิด',
    suggestPrompt: 'เลือกหรือพิมพ์ตอบได้เลย',
    collapse: 'พับเก็บ',
    customAnswerPlaceholder: 'พิมพ์คำตอบของคุณ...',
    customAnswerAria: 'พิมพ์คำตอบเอง',
    customAnswerBtn: 'พิมพ์คำตอบเอง',
    skip: 'ข้าม',
    submitAnswer: 'ส่งคำตอบ',
  },
  drawer: {
    newChat: 'แชทใหม่',
    navChat: 'แชทหลัก',
    navWords: 'คลังคำศัพท์',
    navGem: 'Gem',
    navRefresh: 'โหมดการเล่น',
    recent: 'ล่าสุด',
    allChats: 'แชททั้งหมด',
    untitledChat: 'คุยทั่วไป',
    settingsAria: 'ตั้งค่า',
  },
  recents: {
    title: 'แชท',
    searchPlaceholder: 'ค้นหาแชท',
    empty: 'ยังไม่มีแชท',
    deleteChatAria: 'ลบแชท',
  },
  auth: {
    loginTitle: 'ยินดีต้อนรับกลับมา',
    loginSubtitle: 'เข้าสู่ระบบเพื่อเรียนภาษาอังกฤษต่อ',
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
    errorInvalidCredentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    errorEmailNotConfirmed: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
    errorEmailAlreadyRegistered: 'อีเมลนี้ถูกใช้งานแล้ว',
    errorTooManyRequests: 'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
    successRegister: 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยัน',
    successLogin: 'เข้าสู่ระบบสำเร็จ!',
    successLogout: 'ออกจากระบบสำเร็จแล้ว!',
    backToProfile: 'กลับไปยังโปรไฟล์',
    googleBtn: 'ดำเนินการต่อด้วย Google',
    forgotPassword: 'ลืมรหัสผ่าน?',
    resetPasswordTitle: 'รีเซ็ตรหัสผ่าน',
    resetPasswordSubtitle: 'กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้',
    resetPasswordBtn: 'ส่งลิงก์รีเซ็ตรหัสผ่าน',
    resetPasswordEmailSent: 'ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบอีเมลของคุณ',
    updatePasswordTitle: 'ตั้งรหัสผ่านใหม่',
    updatePasswordBtn: 'บันทึกรหัสผ่านใหม่',
    updatePasswordSuccess: 'เปลี่ยนรหัสผ่านสำเร็จ!',
    tosPrefix: 'ยอมรับ',
    tosTerms: 'ข้อกำหนดการใช้บริการ',
    tosAnd: 'และ',
    tosPrivacy: 'นโยบายความเป็นส่วนตัว',
    tosError: 'กรุณายอมรับข้อกำหนดการใช้บริการและนโยบายความเป็นส่วนตัว',
  },
};

/** Returns the UI string table (Thai). */
export function useStrings(): UIStrings {
  return th;
}
