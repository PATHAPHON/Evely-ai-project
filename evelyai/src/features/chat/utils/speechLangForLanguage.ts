import type { TargetLanguage } from '@/shared/types/wordTypes';
import type { SpeechLang } from '@/shared/types/chatTypes';

/**
 * Map the active learning language to the BCP-47 code used by TTS/STT.
 */
const SPEECH_LANG_BY_LANGUAGE: Record<TargetLanguage, SpeechLang> = {
  english: 'en-US',
};

export function speechLangForLanguage(language: TargetLanguage): SpeechLang {
  return SPEECH_LANG_BY_LANGUAGE[language];
}
