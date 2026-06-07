import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type { LessonCategory, LessonCategoryGroup, PreLoadedLesson } from './types';
import { supabase } from '@/app/_lib/supabaseClient';

/**
 * Pre-loaded Korean language lessons for Thai speakers.
 * Grouped by category: greetings, travel, food, daily.
 */
export const koreanLessons: PreLoadedLesson[] = [
  // ─── Greetings ───────────────────────────────────────────────
  {
    id: 'kr-greetings-basic',
    titleTh: 'ทักทายเบื้องต้น',
    titleEn: 'Basic Greetings',
    category: 'greetings',
    proficiencyLevel: 'beginner',
    targetLanguage: 'korean',
    descriptionTh: 'ฝึกทักทาย แนะนำตัว และถามสารทุกข์สุขดิบในภาษาเกาหลี',
    descriptionEn:
      'Practice greeting, introducing yourself, and asking how someone is doing in Korean.',
    wordContext: [
      '안녕하세요 (สวัสดี)',
      '감사합니다 (ขอบคุณ)',
      '만나서 반갑습니다 (ยินดีที่ได้รู้จัก)',
      '이름 (ชื่อ)',
      '저 (ฉัน/ผม)',
    ],
    goal: 'สามารถทักทายและแนะนำตัวเองได้สำเร็จ',
    systemContext:
      'This is a beginner lesson about basic Korean greetings. Guide the learner through greeting phrases, self-introduction, and polite exchanges. Use simple vocabulary and short sentences. Encourage the learner to practice 안녕하세요, 감사합니다, and self-introduction patterns like 저는 [name]입니다.',
    icon: 'SmileOutlined',
  },
  {
    id: 'kr-greetings-formal',
    titleTh: 'ทักทายแบบทางการ',
    titleEn: 'Formal Greetings & Farewells',
    category: 'greetings',
    proficiencyLevel: 'intermediate',
    targetLanguage: 'korean',
    descriptionTh: 'เรียนรู้การทักทายและลาในสถานการณ์ทางการ เช่น ที่ทำงานหรือพบผู้ใหญ่',
    descriptionEn:
      'Learn formal greetings and farewells for workplace or meeting elders.',
    wordContext: [
      '안녕히 가세요 (สวัสดีครับ/ค่ะ - คนไป)',
      '안녕히 계세요 (สวัสดีครับ/ค่ะ - คนอยู่)',
      '실례합니다 (ขอโทษครับ/ค่ะ)',
      '처음 뵙겠습니다 (พบท่านเป็นครั้งแรก)',
      '수고하셨습니다 (เหนื่อยแล้วนะครับ/ค่ะ)',
    ],
    goal: 'สามารถใช้คำทักทายทางการได้ถูกสถานการณ์',
    systemContext:
      'This is an intermediate lesson about formal Korean greetings and farewells. Teach the difference between 안녕히 가세요 and 안녕히 계세요, and when to use formal speech levels. Create scenarios like meeting a boss, greeting an elder, or saying goodbye after work.',
    icon: 'TeamOutlined',
  },

  // ─── Travel ──────────────────────────────────────────────────
  {
    id: 'kr-travel-directions',
    titleTh: 'ถามทางเดินทาง',
    titleEn: 'Asking for Directions',
    category: 'travel',
    proficiencyLevel: 'beginner',
    targetLanguage: 'korean',
    descriptionTh: 'ฝึกถามทาง บอกทิศทาง และระบุสถานที่ในภาษาเกาหลี',
    descriptionEn:
      'Practice asking for directions, giving directions, and naming places in Korean.',
    wordContext: [
      '어디 (ที่ไหน)',
      '오른쪽 (ขวา)',
      '왼쪽 (ซ้าย)',
      '직진 (ตรงไป)',
      '지하철역 (สถานีรถไฟใต้ดิน)',
      '가까워요 (ใกล้)',
    ],
    goal: 'สามารถถามทางและเข้าใจคำตอบเกี่ยวกับทิศทางได้',
    systemContext:
      'This is a beginner travel lesson. Simulate scenarios where the learner needs to ask for directions in Korea (e.g., finding a subway station, convenience store, or tourist spot). Use simple direction words: 오른쪽, 왼쪽, 직진, and distance indicators.',
    icon: 'CompassOutlined',
  },
  {
    id: 'kr-travel-transport',
    titleTh: 'ใช้ขนส่งสาธารณะ',
    titleEn: 'Using Public Transport',
    category: 'travel',
    proficiencyLevel: 'intermediate',
    targetLanguage: 'korean',
    descriptionTh:
      'เรียนรู้การซื้อตั๋ว ถามเส้นทาง และใช้รถไฟใต้ดิน/รถบัสในเกาหลี',
    descriptionEn:
      'Learn to buy tickets, ask about routes, and use the subway/bus in Korea.',
    wordContext: [
      '표 (ตั๋ว)',
      '몇 번 (หมายเลขอะไร)',
      '갈아타다 (เปลี่ยนสาย)',
      '내리다 (ลงรถ)',
      '타다 (ขึ้นรถ)',
      '얼마예요 (เท่าไหร่)',
    ],
    goal: 'สามารถซื้อตั๋วและสอบถามเส้นทางขนส่งสาธารณะได้',
    systemContext:
      'This is an intermediate travel lesson about Korean public transport. Simulate buying subway tickets, asking which line to take, transferring between lines, and understanding announcements. Include vocabulary for bus and subway usage.',
    icon: 'CarOutlined',
  },

  // ─── Food ────────────────────────────────────────────────────
  {
    id: 'kr-food-ordering',
    titleTh: 'สั่งอาหารที่ร้าน',
    titleEn: 'Ordering Food at a Restaurant',
    category: 'food',
    proficiencyLevel: 'beginner',
    targetLanguage: 'korean',
    descriptionTh:
      'ฝึกสั่งอาหาร ถามเมนู และชำระเงินเป็นภาษาเกาหลีในร้านอาหาร',
    descriptionEn:
      'Practice ordering food, asking about the menu, and paying at a Korean restaurant.',
    wordContext: [
      '메뉴 (เมนู)',
      '주문 (สั่ง)',
      '이거 주세요 (ขอสิ่งนี้)',
      '맛있어요 (อร่อย)',
      '계산 (จ่ายเงิน)',
      '물 (น้ำ)',
    ],
    goal: 'สามารถสั่งอาหารและเครื่องดื่มในร้านอาหารเกาหลีได้',
    systemContext:
      'This is a beginner food lesson. Role-play as a restaurant server. Help the learner order food using 주세요, ask about the menu, request water, and pay the bill. Use common restaurant phrases and food vocabulary.',
    icon: 'CoffeeOutlined',
  },
  {
    id: 'kr-food-preferences',
    titleTh: 'บอกความชอบอาหาร',
    titleEn: 'Discussing Food Preferences',
    category: 'food',
    proficiencyLevel: 'intermediate',
    targetLanguage: 'korean',
    descriptionTh:
      'เรียนรู้การบอกว่าชอบหรือไม่ชอบอาหาร ถามรสชาติ และแนะนำอาหาร',
    descriptionEn:
      'Learn to express food likes/dislikes, ask about flavors, and recommend dishes.',
    wordContext: [
      '좋아해요 (ชอบ)',
      '싫어해요 (ไม่ชอบ)',
      '매워요 (เผ็ด)',
      '달아요 (หวาน)',
      '추천 (แนะนำ)',
      '알레르기 (แพ้)',
    ],
    goal: 'สามารถสนทนาเกี่ยวกับความชอบอาหารและแนะนำเมนูได้',
    systemContext:
      'This is an intermediate food lesson about food preferences. Engage the learner in conversation about their food likes and dislikes, favorite Korean dishes, spiciness levels, and dietary restrictions. Practice using 좋아해요/싫어해요 and taste adjectives.',
    icon: 'HeartOutlined',
  },

  // ─── Daily ───────────────────────────────────────────────────
  {
    id: 'kr-daily-shopping',
    titleTh: 'ช้อปปิ้งในร้านสะดวกซื้อ',
    titleEn: 'Shopping at a Convenience Store',
    category: 'daily',
    proficiencyLevel: 'beginner',
    targetLanguage: 'korean',
    descriptionTh:
      'ฝึกซื้อของในร้านสะดวกซื้อ ถามราคา และขอถุง/ใบเสร็จ',
    descriptionEn:
      'Practice buying things at a convenience store, asking prices, and requesting bags/receipts.',
    wordContext: [
      '편의점 (ร้านสะดวกซื้อ)',
      '얼마예요 (เท่าไหร่)',
      '봉투 (ถุง)',
      '영수증 (ใบเสร็จ)',
      '카드 (บัตร)',
      '현금 (เงินสด)',
    ],
    goal: 'สามารถซื้อของและชำระเงินในร้านสะดวกซื้อได้',
    systemContext:
      'This is a beginner daily-life lesson about shopping at a Korean convenience store. Simulate a transaction: the learner picks items, asks the price, chooses payment method (card/cash), and asks for a receipt or bag. Use natural convenience store dialogue.',
    icon: 'ShoppingOutlined',
  },
  {
    id: 'kr-daily-weather',
    titleTh: 'พูดคุยเรื่องอากาศ',
    titleEn: 'Talking About the Weather',
    category: 'daily',
    proficiencyLevel: 'beginner',
    targetLanguage: 'korean',
    descriptionTh:
      'ฝึกสนทนาเกี่ยวกับสภาพอากาศ ฤดูกาล และการแต่งตัวตามสภาพอากาศ',
    descriptionEn:
      'Practice talking about weather, seasons, and dressing for the weather.',
    wordContext: [
      '날씨 (อากาศ)',
      '더워요 (ร้อน)',
      '추워요 (หนาว)',
      '비 (ฝน)',
      '우산 (ร่ม)',
      '오늘 (วันนี้)',
    ],
    goal: 'สามารถสนทนาเรื่องอากาศและแสดงความเห็นเกี่ยวกับสภาพอากาศได้',
    systemContext:
      "This is a beginner daily-life lesson about weather conversation. Start a casual chat about today's weather, ask the learner about their preference for seasons, and discuss dressing appropriately. Practice weather vocabulary and basic adjectives.",
    icon: 'CloudOutlined',
  },
];

/**
 * Category label map for Thai and English display names.
 */
const categoryLabelMap: Record<LessonCategory, { labelTh: string; labelEn: string }> = {
  greetings: { labelTh: 'ทักทาย', labelEn: 'Greetings' },
  travel: { labelTh: 'การเดินทาง', labelEn: 'Travel' },
  food: { labelTh: 'อาหาร', labelEn: 'Food' },
  daily: { labelTh: 'ชีวิตประจำวัน', labelEn: 'Daily Life' },
  shopping: { labelTh: 'ช้อปปิ้ง', labelEn: 'Shopping' },
  culture: { labelTh: 'วัฒนธรรม', labelEn: 'Culture' },
};

/**
 * Filters lessons by target language and groups them by category.
 *
 * @param language - The target language to filter lessons for.
 * @returns An array of LessonCategoryGroup, each containing lessons for one category.
 */
export function getLessonsByLanguage(language: TargetLanguage): LessonCategoryGroup[] {
  // Collect all lesson data sources (currently only Korean; extend here for future languages)
  const allLessons: PreLoadedLesson[] = [...koreanLessons];

  // Filter lessons matching the specified target language
  const filtered = allLessons.filter((lesson) => lesson.targetLanguage === language);

  // Group filtered lessons by category
  const groupMap = new Map<LessonCategory, PreLoadedLesson[]>();
  for (const lesson of filtered) {
    const existing = groupMap.get(lesson.category);
    if (existing) {
      existing.push(lesson);
    } else {
      groupMap.set(lesson.category, [lesson]);
    }
  }

  // Convert the map into LessonCategoryGroup[]
  const groups: LessonCategoryGroup[] = [];
  for (const [category, lessons] of groupMap) {
    const labels = categoryLabelMap[category];
    groups.push({
      category,
      labelTh: labels.labelTh,
      labelEn: labels.labelEn,
      lessons,
    });
  }

  return groups;
}

export async function fetchLessonsByLanguage(language: TargetLanguage): Promise<LessonCategoryGroup[]> {
  const allLessons: PreLoadedLesson[] = [...koreanLessons];

  try {
    const { data, error } = await supabase
      .from('catalog_lessons')
      .select('*')
      .eq('target_language', language)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch custom catalog lessons:', error);
    } else if (data) {
      const customLessons: PreLoadedLesson[] = data.map((row) => ({
        id: row.id,
        titleTh: row.title_th,
        titleEn: row.title_en,
        category: row.category as LessonCategory,
        proficiencyLevel: row.proficiency_level,
        targetLanguage: row.target_language as TargetLanguage,
        descriptionTh: row.description_th,
        descriptionEn: row.description_en,
        wordContext: row.word_context || [],
        goal: row.goal,
        systemContext: row.system_context || '',
        icon: row.icon || 'BookOutlined',
        type: row.type as 'ai' | 'choice',
      }));
      allLessons.push(...customLessons);
    }
  } catch (err) {
    console.error('Error fetching catalog lessons:', err);
  }

  // Group by category
  const groupMap = new Map<LessonCategory, PreLoadedLesson[]>();
  for (const lesson of allLessons) {
    const existing = groupMap.get(lesson.category);
    if (existing) {
      existing.push(lesson);
    } else {
      groupMap.set(lesson.category, [lesson]);
    }
  }

  // Convert map to groups
  const groups: LessonCategoryGroup[] = [];
  for (const [category, lessons] of groupMap) {
    const labels = categoryLabelMap[category] || { labelTh: category, labelEn: category };
    groups.push({
      category,
      labelTh: labels.labelTh,
      labelEn: labels.labelEn,
      lessons,
    });
  }

  return groups;
}

