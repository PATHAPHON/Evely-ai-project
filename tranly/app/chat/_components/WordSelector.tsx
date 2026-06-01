"use client";

import { useCallback } from "react";
import { CloseOutlined, CheckOutlined } from "@ant-design/icons";
import type { SavedWord } from "../_lib/types";
import { useLanguagePreference } from "@/app/_lib/useLanguagePreference";

const MAX_SELECTION = 10;

interface WordSelectorProps {
  savedWords: SavedWord[];
  selectedWords: SavedWord[];
  onSelectionChange: (words: SavedWord[]) => void;
  onClose: () => void;
}

/**
 * Modal/drawer component showing saved words for selection.
 * Allows multi-select with a maximum of 10 words.
 * Styled with Neobrutalist design system.
 */
export default function WordSelector({
  savedWords,
  selectedWords,
  onSelectionChange,
  onClose,
}: WordSelectorProps) {
  const isAtCap = selectedWords.length >= MAX_SELECTION;
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';

  const isSelected = useCallback(
    (word: SavedWord) => selectedWords.some((w) => w.id === word.id),
    [selectedWords]
  );

  const handleToggle = useCallback(
    (word: SavedWord) => {
      if (isSelected(word)) {
        onSelectionChange(selectedWords.filter((w) => w.id !== word.id));
      } else if (!isAtCap) {
        onSelectionChange([...selectedWords, word]);
      }
    },
    [selectedWords, isAtCap, isSelected, onSelectionChange]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md rounded-t-2xl border-3 border-border-color bg-card-bg shadow-nb-md flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-3 border-border-color p-4">
          <h2 className="text-lg font-bold text-text-primary">
            {isThai ? 'เลือกคำศัพท์' : 'Select Words'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-secondary">
              {selectedWords.length}/{MAX_SELECTION}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close word selector"
              className="flex h-8 w-8 items-center justify-center rounded-lg border-3 border-border-color bg-card-bg text-text-primary shadow-nb-sm transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
            >
              <CloseOutlined style={{ fontSize: 14 }} />
            </button>
          </div>
        </div>

        {/* Cap warning */}
        {isAtCap && (
          <div className="px-4 py-2 bg-[#FFF7E6] dark:bg-[#3d3520] border-b-3 border-border-color">
            <p className="text-sm text-[#D46B08] dark:text-[#FAAD14] font-medium">
              {isThai ? `เลือกได้สูงสุด ${MAX_SELECTION} คำแล้ว` : `Max ${MAX_SELECTION} words selected`}
            </p>
          </div>
        )}

        {/* Scrollable word list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedWords.length === 0 ? (
            <p className="text-center text-text-secondary py-8">
              {isThai ? 'ไม่มีคำศัพท์ที่บันทึกไว้' : 'No saved words yet'}
            </p>
          ) : (
            savedWords.map((word) => {
              const selected = isSelected(word);
              const disabled = !selected && isAtCap;

              return (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => handleToggle(word)}
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={`${selected ? "Deselect" : "Select"} ${word.korean}`}
                  className={`w-full rounded-xl border-3 border-border-color p-3 text-left transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer ${
                    selected
                      ? "bg-[#E6F4FF] dark:bg-[#1a3a5c] shadow-nb-sm"
                      : disabled
                        ? "bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed shadow-nb-sm"
                        : "bg-card-bg shadow-nb-sm hover:bg-gray-50 dark:hover:bg-[#3d3d5c]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-text-primary truncate">
                        {word.korean}
                      </p>
                      <p className="text-sm text-text-secondary truncate">
                        {isThai ? (word.thai || word.reading) : word.english}
                      </p>
                    </div>
                    {selected && (
                      <div className="ml-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-border-color bg-[#4096FF]">
                        <CheckOutlined
                          style={{ fontSize: 12, color: "white" }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer with done / skip buttons */}
        <div className="flex flex-col gap-2 border-t-3 border-border-color p-4">
          {/* Opt out of using saved words entirely — clears any selection then
              closes, which advances the guide just like finishing. */}
          <button
            type="button"
            onClick={() => {
              onSelectionChange([]);
              onClose();
            }}
            className="w-full rounded-xl border-3 border-border-color bg-card-bg py-3 text-base font-bold text-text-primary shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
          >
            {isThai ? 'ไม่ใช้คำศัพท์' : "Don't use words"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border-3 border-border-color bg-[#4096FF] py-3 text-base font-bold text-white shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
          >
            {isThai
              ? `เสร็จสิ้น (${selectedWords.length} คำ)`
              : `Done (${selectedWords.length} word${selectedWords.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  );
}
