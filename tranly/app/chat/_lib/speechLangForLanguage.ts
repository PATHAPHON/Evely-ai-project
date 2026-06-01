import type { TargetLanguage } from '@/app/_lib/wordTypes';
import type { SpeechLang } from './types';

/**
 * Map the active learning language to the BCP-47 code used by TTS/STT. Mirrors
 * the mapping in `app/home/_components/WordCard.tsx`.
 */
const SPEECH_LANG_BY_LANGUAGE: Record<TargetLanguage, SpeechLang> = {
  korean: 'ko-KR',
  japanese: 'ja-JP',
  chinese: 'zh-CN',
  english: 'en-US',
};

export function speechLangForLanguage(language: TargetLanguage): SpeechLang {
  return SPEECH_LANG_BY_LANGUAGE[language];
}
