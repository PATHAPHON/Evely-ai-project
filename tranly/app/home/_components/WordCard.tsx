"use client";

import { useCallback } from "react";
import type { FeedWordRecord } from "../_lib/types";
import WordRenderer from "@/app/_components/WordRenderer";

interface WordCardProps {
  word: FeedWordRecord;
  activeImageIndex: number;
  setActiveImageIndex: React.Dispatch<React.SetStateAction<number>>;
}

/** The native-script primary word for the record's language. */
function getPrimaryWord(word: FeedWordRecord): string {
  return word.word ?? '';
}

/** The pronunciation guide line for the record's language. */
function getPronunciation(word: FeedWordRecord): string {
  return word.ipa ?? '';
}



/**
 * Displays a single vocabulary word card for the active learning language with:
 * - Native-script word, pronunciation guide, Thai translation
 * - Audio button (cloud TTS with Web Speech fallback) for the native word
 *
 * Styled with Neobrutalist design system.
 */
export default function WordCard({ word, activeImageIndex, setActiveImageIndex }: WordCardProps) {


  const primaryWord = getPrimaryWord(word);
  const pronunciation = getPronunciation(word);

  const images = word.imageUrls && word.imageUrls.length > 0
    ? word.imageUrls
    : word.imageUrl
    ? [word.imageUrl]
    : [];

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const setIndex = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex(index);
  }, []);

  return (
    <div className="relative w-full h-[58vh] max-h-[500px] rounded-3xl border-3 border-black dark:border-[#4a4a6a] bg-black overflow-hidden shadow-nb-lg">
      
      {/* Top Header Image Carousel */}
      {images.length > 0 && (
        <div
          className={`image-carousel absolute inset-0 w-full h-full select-none overflow-hidden z-0 ${
            images.length > 1 ? "cursor-pointer" : ""
          }`}
          onClick={images.length > 1 ? handleNextImage : undefined}
        >
          {/* Active Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[activeImageIndex]}
            alt={`${primaryWord} - context ${activeImageIndex + 1}`}
            className="w-full h-full object-cover select-none pointer-events-none transition-all duration-300"
            key={images[activeImageIndex]}
          />


          {/* Top Dotted Indicator Overlay (Tinder/NGL style) */}
          {images.length > 1 && (
            <div className="absolute top-3 left-4 right-4 flex gap-1 z-20">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => setIndex(idx, e)}
                  className={`h-1 flex-1 rounded-full border border-black/10 transition-all cursor-pointer ${
                    idx === activeImageIndex ? "bg-white" : "bg-white/40"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Dark Gradient Shadow for text contrast */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10" />

      {/* Content Section (Overlaid on Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 pt-6 px-6 pb-24 z-20 text-white flex flex-col gap-1.5 pointer-events-auto">
        
        {/* Part of speech badge (Pulse active capsule) */}
        {word.partOfSpeech && (
          <div className="flex mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 border-black bg-[#E6FFFB] text-[#08979C] shadow-nb-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#08979C] animate-pulse" />
              {word.partOfSpeech}
            </span>
          </div>
        )}

        {/* Native-script word */}
        <h2 className="text-3xl font-black tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] m-0">
          <WordRenderer text={primaryWord} textClassName="text-3xl font-black tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </h2>

        {/* Pronunciation guide */}
        <p className="text-sm text-gray-300 font-bold italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] m-0">
          {pronunciation}
        </p>

        {/* Translation */}
        <p className="text-base text-white font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] m-0">
          {word.thai}
        </p>
      </div>
    </div>
  );
}
