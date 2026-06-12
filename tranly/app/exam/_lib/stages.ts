import type { CefrLevel } from './types';

/** One stage on the Duolingo-style exam path. */
export interface ExamStage {
  /** Stable id, e.g. 'a1-01-greetings' (also stored in exam_stage_progress) */
  id: string;
  level: CefrLevel;
  /** English topic phrase fed into the AI exam prompt */
  topic: string;
  emoji: string;
  titleEn: string;
  titleTh: string;
}



function stage(
  id: string,
  level: CefrLevel,
  topic: string,
  emoji: string,
  titleEn: string,
  titleTh: string
): ExamStage {
  return { id, level, topic, emoji, titleEn, titleTh };
}

/** The full ordered stage path: 8 stages per CEFR level, A1 → B2. */
export const EXAM_STAGES: ExamStage[] = [
  // A1
  stage('a1-01-greetings', 'A1', 'greetings and introductions', '👋', 'Greetings', 'ทักทาย'),
  stage('a1-02-numbers-time', 'A1', 'numbers, dates and telling the time', '🕐', 'Numbers & Time', 'ตัวเลขและเวลา'),
  stage('a1-03-family', 'A1', 'family members and relationships', '👨‍👩‍👧', 'Family', 'ครอบครัว'),
  stage('a1-04-food-drink', 'A1', 'food, drink and ordering at a restaurant', '🍜', 'Food & Drink', 'อาหารและเครื่องดื่ม'),
  stage('a1-05-colors-clothes', 'A1', 'colors and clothes', '👕', 'Colors & Clothes', 'สีและเสื้อผ้า'),
  stage('a1-06-daily-routine', 'A1', 'daily routines and habits', '⏰', 'Daily Routine', 'กิจวัตรประจำวัน'),
  stage('a1-07-places', 'A1', 'places in town and basic directions', '🏙️', 'Places in Town', 'สถานที่ในเมือง'),
  stage('a1-08-weather', 'A1', 'weather and seasons', '🌦️', 'Weather', 'สภาพอากาศ'),
  // A2
  stage('a2-01-shopping', 'A2', 'shopping, prices and money', '🛒', 'Shopping', 'ช้อปปิ้ง'),
  stage('a2-02-travel', 'A2', 'travel, transport and asking for directions', '✈️', 'Travel', 'การเดินทาง'),
  stage('a2-03-hobbies', 'A2', 'hobbies, sports and free time', '⚽', 'Hobbies', 'งานอดิเรก'),
  stage('a2-04-health', 'A2', 'health, body and seeing a doctor', '🩺', 'Health & Body', 'สุขภาพและร่างกาย'),
  stage('a2-05-school-work', 'A2', 'school, study and everyday work life', '🎒', 'School & Work', 'โรงเรียนและการทำงาน'),
  stage('a2-06-past-experiences', 'A2', 'talking about past experiences and events', '📸', 'Past Experiences', 'ประสบการณ์ในอดีต'),
  stage('a2-07-invitations', 'A2', 'invitations, arrangements and future plans', '📅', 'Invitations & Plans', 'นัดหมายและแผนการ'),
  stage('a2-08-home', 'A2', 'houses, rooms and things at home', '🏠', 'House & Home', 'บ้านและที่อยู่อาศัย'),
  // B1
  stage('b1-01-opinions', 'B1', 'expressing opinions and feelings', '💬', 'Opinions & Feelings', 'ความเห็นและความรู้สึก'),
  stage('b1-02-news-media', 'B1', 'news, media and social networks', '📰', 'News & Media', 'ข่าวและสื่อ'),
  stage('b1-03-environment', 'B1', 'environment and nature', '🌱', 'Environment', 'สิ่งแวดล้อม'),
  stage('b1-04-technology', 'B1', 'technology and the internet in daily life', '💻', 'Technology', 'เทคโนโลยี'),
  stage('b1-05-culture', 'B1', 'culture, traditions and festivals', '🎎', 'Culture & Festivals', 'วัฒนธรรมและเทศกาล'),
  stage('b1-06-advice', 'B1', 'giving advice and solving everyday problems', '🧭', 'Advice & Problems', 'คำแนะนำและการแก้ปัญหา'),
  stage('b1-07-careers', 'B1', 'jobs, careers and applying for work', '💼', 'Jobs & Careers', 'งานและอาชีพ'),
  stage('b1-08-storytelling', 'B1', 'narratives and telling stories', '📖', 'Storytelling', 'การเล่าเรื่อง'),
  // B2
  stage('b2-01-business', 'B2', 'business and the economy', '📈', 'Business & Economy', 'ธุรกิจและเศรษฐกิจ'),
  stage('b2-02-science', 'B2', 'science, research and discovery', '🔬', 'Science & Discovery', 'วิทยาศาสตร์และการค้นพบ'),
  stage('b2-03-society', 'B2', 'society and social issues', '🏛️', 'Society', 'สังคม'),
  stage('b2-04-art', 'B2', 'art, literature and film', '🎨', 'Art & Literature', 'ศิลปะและวรรณกรรม'),
  stage('b2-05-debate', 'B2', 'debate, argument and persuasion', '⚖️', 'Debate & Argument', 'การโต้แย้งและโน้มน้าว'),
  stage('b2-06-abstract', 'B2', 'abstract ideas such as success, happiness and ethics', '💡', 'Abstract Ideas', 'แนวคิดเชิงนามธรรม'),
  stage('b2-07-idioms', 'B2', 'idioms, phrasal verbs and nuanced vocabulary', '🗝️', 'Idioms & Nuance', 'สำนวนและความหมายแฝง'),
  stage('b2-08-global', 'B2', 'global issues and current affairs', '🌍', 'Global Issues', 'ประเด็นระดับโลก'),
];

/** Index of a stage in the path, or -1 if unknown. */
export function getStageIndex(stageId: string): number {
  return EXAM_STAGES.findIndex((s) => s.id === stageId);
}

/**
 * A stage is unlocked when it is the first stage, already completed,
 * or the previous stage has been completed.
 */
export function isStageUnlocked(
  stageId: string,
  completedIds: ReadonlySet<string>
): boolean {
  const index = getStageIndex(stageId);
  if (index < 0) return false;
  if (index === 0 || completedIds.has(stageId)) return true;
  return completedIds.has(EXAM_STAGES[index - 1].id);
}

/** The first uncompleted stage id, or null when every stage is done. */
export function getCurrentStageId(
  completedIds: ReadonlySet<string>
): string | null {
  const current = EXAM_STAGES.find((s) => !completedIds.has(s.id));
  return current?.id ?? null;
}
