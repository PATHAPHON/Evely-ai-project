import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LanguageWordCard, {
  getWordCardFields,
  getFieldOrderForLanguage,
} from '../LanguageWordCard';
import type { WordRecord } from '../../_lib/wordTypes';

// --- Test data factories ---

function makeJapaneseRecord(overrides: Partial<WordRecord> = {}): WordRecord {
  return {
    id: 'jp-1',
    language: 'japanese',
    kanji: '猫',
    hiragana: 'ねこ',
    romaji: 'neko',
    thaiTranslation: 'แมว',
    imageBlob: null,
    createdAt: Date.now(),
    ...overrides,
  } as WordRecord;
}

function makeKoreanRecord(overrides: Partial<WordRecord> = {}): WordRecord {
  return {
    id: 'kr-1',
    language: 'korean',
    hangul: '사과',
    thaiReading: 'ซากวา',
    romanization: 'sagwa',
    thaiTranslation: 'แอปเปิ้ล',
    imageBlob: null,
    createdAt: Date.now(),
    ...overrides,
  } as WordRecord;
}

function makeChineseRecord(overrides: Partial<WordRecord> = {}): WordRecord {
  return {
    id: 'cn-1',
    language: 'chinese',
    hanzi: '猫',
    pinyin: 'māo',
    thaiTranslation: 'แมว',
    imageBlob: null,
    createdAt: Date.now(),
    ...overrides,
  } as WordRecord;
}

function makeEnglishRecord(overrides: Partial<WordRecord> = {}): WordRecord {
  return {
    id: 'en-1',
    language: 'english',
    word: 'cat',
    ipa: '/kæt/',
    thaiTranslation: 'แมว',
    imageBlob: null,
    createdAt: Date.now(),
    ...overrides,
  } as WordRecord;
}

// --- getWordCardFields tests ---

describe('getWordCardFields', () => {
  it('returns fields in correct order for Japanese: kanji → hiragana/romaji → translation', () => {
    const fields = getWordCardFields(makeJapaneseRecord());
    expect(fields).toHaveLength(3);
    expect(fields[0].role).toBe('native-script');
    expect(fields[0].value).toBe('猫');
    expect(fields[1].role).toBe('pronunciation');
    expect(fields[1].value).toBe('ねこ');
    expect(fields[2].role).toBe('translation');
    expect(fields[2].value).toBe('แมว');
  });

  it('returns fields in correct order for Korean: hangul → thaiReading/romanization → translation', () => {
    const fields = getWordCardFields(makeKoreanRecord());
    expect(fields).toHaveLength(3);
    expect(fields[0].role).toBe('native-script');
    expect(fields[0].value).toBe('사과');
    expect(fields[1].role).toBe('pronunciation');
    expect(fields[1].value).toBe('ซากวา');
    expect(fields[2].role).toBe('translation');
    expect(fields[2].value).toBe('แอปเปิ้ล');
  });

  it('returns fields in correct order for Chinese: hanzi → pinyin → translation', () => {
    const fields = getWordCardFields(makeChineseRecord());
    expect(fields).toHaveLength(3);
    expect(fields[0].role).toBe('native-script');
    expect(fields[0].value).toBe('猫');
    expect(fields[1].role).toBe('pronunciation');
    expect(fields[1].value).toBe('māo');
    expect(fields[2].role).toBe('translation');
    expect(fields[2].value).toBe('แมว');
  });

  it('returns fields in correct order for English: word → ipa → translation', () => {
    const fields = getWordCardFields(makeEnglishRecord());
    expect(fields).toHaveLength(3);
    expect(fields[0].role).toBe('native-script');
    expect(fields[0].value).toBe('cat');
    expect(fields[1].role).toBe('pronunciation');
    expect(fields[1].value).toBe('/kæt/');
    expect(fields[2].role).toBe('translation');
    expect(fields[2].value).toBe('แมว');
  });

  it('returns empty string for missing fields', () => {
    const record = makeJapaneseRecord({ kanji: '' } as any);
    const fields = getWordCardFields(record);
    expect(fields[0].value).toBe('');
  });

  it('falls back to romaji when hiragana is empty for Japanese', () => {
    const record = makeJapaneseRecord({ hiragana: '', romaji: 'neko' } as any);
    const fields = getWordCardFields(record);
    expect(fields[1].value).toBe('neko');
  });

  it('falls back to romanization when thaiReading is empty for Korean', () => {
    const record = makeKoreanRecord({ thaiReading: '', romanization: 'sagwa' } as any);
    const fields = getWordCardFields(record);
    expect(fields[1].value).toBe('sagwa');
  });
});

describe('getFieldOrderForLanguage', () => {
  it('returns the same ordering for all languages', () => {
    const languages = ['english', 'japanese', 'korean', 'chinese'] as const;
    for (const lang of languages) {
      const order = getFieldOrderForLanguage(lang);
      expect(order).toEqual(['native-script', 'pronunciation', 'translation']);
    }
  });
});

// --- LanguageWordCard component rendering tests ---

describe('LanguageWordCard', () => {
  it('renders all fields for a Japanese word record', () => {
    render(<LanguageWordCard record={makeJapaneseRecord()} />);
    expect(screen.getByText('猫')).toBeInTheDocument();
    expect(screen.getByText('ねこ')).toBeInTheDocument();
    expect(screen.getByText('แมว')).toBeInTheDocument();
  });

  it('renders all fields for a Korean word record', () => {
    render(<LanguageWordCard record={makeKoreanRecord()} />);
    expect(screen.getByText('사과')).toBeInTheDocument();
    expect(screen.getByText('ซากวา')).toBeInTheDocument();
    expect(screen.getByText('แอปเปิ้ล')).toBeInTheDocument();
  });

  it('renders all fields for a Chinese word record', () => {
    render(<LanguageWordCard record={makeChineseRecord()} />);
    expect(screen.getByText('猫')).toBeInTheDocument();
    expect(screen.getByText('māo')).toBeInTheDocument();
    expect(screen.getByText('แมว')).toBeInTheDocument();
  });

  it('renders all fields for an English word record', () => {
    render(<LanguageWordCard record={makeEnglishRecord()} />);
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.getByText('/kæt/')).toBeInTheDocument();
    expect(screen.getByText('แมว')).toBeInTheDocument();
  });

  it('shows placeholder for empty required fields', () => {
    const record = makeJapaneseRecord({ kanji: '' } as any);
    render(<LanguageWordCard record={record} />);

    const nativeField = screen.getByTestId('field-native-script');
    expect(nativeField).toHaveAttribute('data-empty', 'true');
    expect(nativeField).toHaveTextContent('—');
  });

  it('still renders non-empty fields when some fields are empty', () => {
    const record = makeJapaneseRecord({ kanji: '' } as any);
    render(<LanguageWordCard record={record} />);

    // Pronunciation and translation should still render
    expect(screen.getByText('ねこ')).toBeInTheDocument();
    expect(screen.getByText('แมว')).toBeInTheDocument();
  });

  it('sets data-language attribute on the card', () => {
    render(<LanguageWordCard record={makeKoreanRecord()} />);
    const card = screen.getByTestId('language-word-card');
    expect(card).toHaveAttribute('data-language', 'korean');
  });

  it('renders in compact mode with smaller text', () => {
    const { container } = render(
      <LanguageWordCard record={makeKoreanRecord()} compact />
    );
    const card = container.querySelector('[data-testid="language-word-card"]');
    expect(card?.className).toContain('p-3');
  });
});
