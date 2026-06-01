'use client';

import type { WordRecord } from '../_lib/wordTypes';
import type { TargetLanguage } from '../_lib/wordTypes';

/**
 * Represents a single display field on a word card.
 * - `label`: human-readable field name (e.g., "漢字", "Hangul")
 * - `value`: the field value (empty string means the field is missing)
 * - `role`: semantic role for styling differentiation
 */
export interface WordCardField {
  label: string;
  value: string;
  role: 'native-script' | 'pronunciation' | 'translation';
}

/**
 * Returns the ordered display fields for a WordRecord based on its language.
 * Order: native script → pronunciation guide → translation.
 *
 * This function is exported separately so it can be tested independently
 * (e.g., in property-based tests for field ordering).
 */
export function getWordCardFields(record: WordRecord): WordCardField[] {
  switch (record.language) {
    case 'japanese':
      return [
        { label: '漢字', value: record.kanji, role: 'native-script' },
        { label: 'ひらがな / Romaji', value: record.hiragana || record.romaji, role: 'pronunciation' },
        { label: 'คำแปล', value: record.thaiTranslation, role: 'translation' },
      ];
    case 'korean':
      return [
        { label: '한글', value: record.hangul, role: 'native-script' },
        { label: 'การอ่าน / Romanization', value: record.thaiReading || record.romanization, role: 'pronunciation' },
        { label: 'คำแปล', value: record.thaiTranslation, role: 'translation' },
      ];
    case 'chinese':
      return [
        { label: '汉字', value: record.hanzi, role: 'native-script' },
        { label: 'Pinyin', value: record.pinyin, role: 'pronunciation' },
        { label: 'คำแปล', value: record.thaiTranslation, role: 'translation' },
      ];
    case 'english':
      return [
        { label: 'Word', value: record.word, role: 'native-script' },
        { label: 'IPA', value: record.ipa, role: 'pronunciation' },
        { label: 'คำแปล', value: record.thaiTranslation, role: 'translation' },
      ];
  }
}

/**
 * Returns the ordered display fields for a given language type.
 * Useful for determining field ordering without a full record.
 */
export function getFieldOrderForLanguage(language: TargetLanguage): WordCardField['role'][] {
  return ['native-script', 'pronunciation', 'translation'];
}

interface LanguageWordCardProps {
  record: WordRecord;
  /** Optional: show the word image if available */
  showImage?: boolean;
  /** Optional: compact mode for list views */
  compact?: boolean;
}

/**
 * A reusable word card component that renders fields based on the word record's
 * language type. Displays fields in order: native script → pronunciation → translation.
 * Empty required fields show a placeholder indicator (dashed border with "—").
 *
 * Styled with the app's neobrutalist design system.
 */
export default function LanguageWordCard({
  record,
  showImage = false,
  compact = false,
}: LanguageWordCardProps) {
  const fields = getWordCardFields(record);
  const imageUrl = record.imageBlob ? URL.createObjectURL(record.imageBlob) : null;

  return (
    <div
      className={`rounded-2xl border-3 border-border-color bg-card-bg shadow-nb-md ${
        compact ? 'p-3' : 'p-4'
      }`}
      data-testid="language-word-card"
      data-language={record.language}
    >
      <div className={showImage && imageUrl ? 'flex gap-3 items-start' : ''}>
        {/* Optional image */}
        {showImage && imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="w-20 h-20 object-cover rounded-xl border-3 border-border-color flex-shrink-0"
          />
        )}

        {/* Fields rendered in order */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {fields.map((field) => (
            <WordCardFieldRow
              key={field.role}
              field={field}
              compact={compact}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WordCardFieldRow({
  field,
  compact,
}: {
  field: WordCardField;
  compact: boolean;
}) {
  const isEmpty = !field.value || field.value.trim() === '';

  if (isEmpty) {
    return (
      <div
        className="flex items-center gap-2"
        data-testid={`field-${field.role}`}
        data-empty="true"
      >
        <span className="text-xs font-semibold text-text-meta">{field.label}</span>
        <span
          className="flex-1 h-7 rounded-lg border-2 border-dashed border-border-color/40 flex items-center justify-center"
          aria-label={`${field.label} is empty`}
        >
          <span className="text-sm text-text-meta">—</span>
        </span>
      </div>
    );
  }

  // Style varies by role
  const textStyles = getTextStyles(field.role, compact);

  return (
    <div
      className="flex flex-col"
      data-testid={`field-${field.role}`}
      data-empty="false"
    >
      <span className="text-[10px] font-semibold text-text-meta uppercase tracking-wide">
        {field.label}
      </span>
      <span className={textStyles}>{field.value}</span>
    </div>
  );
}

function getTextStyles(role: WordCardField['role'], compact: boolean): string {
  switch (role) {
    case 'native-script':
      return compact
        ? 'text-lg font-extrabold text-text-primary truncate'
        : 'text-2xl font-extrabold text-text-primary';
    case 'pronunciation':
      return compact
        ? 'text-sm font-bold text-text-secondary truncate'
        : 'text-base font-bold text-text-secondary';
    case 'translation':
      return compact
        ? 'text-sm font-semibold text-text-secondary truncate'
        : 'text-base font-semibold text-text-secondary';
  }
}
