'use client';

import { useState, useEffect } from 'react';
import type { GameProps } from '../gameTypes';
import { TypingRound } from '../gameTypes';
import { useGameExit } from '../useGameExit';

type AnswerState = 'idle' | 'correct' | 'wrong';

export default function TypingGame(props: GameProps) {
  const { word, thai, imageUrl } = props;
  const [input, setInput] = useState('');
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [quality, setQuality] = useState(0);
  const { isExiting, round } = useGameExit(
    (roundProps, onExitStart) => new TypingRound(roundProps, onExitStart),
    props,
  );

  // Auto-advance after a correct answer's green glow.
  useEffect(() => {
    if (answerState !== 'correct') return;
    const t = setTimeout(() => round.finish(quality), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerState]);

  function check() {
    if (!input.trim() || answerState !== 'idle') return;
    const q = round.score(input, word);
    setQuality(q);
    setAnswerState(q >= 3 ? 'correct' : 'wrong');
  }

  function giveUp() {
    if (answerState !== 'idle') return;
    setQuality(0);
    setAnswerState('wrong');
  }

  const cardBorder =
    answerState === 'correct' ? 'border-correct shadow-[0_0_20px] shadow-correct/30 bg-correct/5' :
    answerState === 'wrong' ? 'border-incorrect shadow-[0_0_20px] shadow-incorrect/30 bg-incorrect/5' :
    'border-border-color';

  const cardAnim = isExiting ? 'animate-card-out' : 'animate-card-in';

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative mt-4 mb-6 w-full" style={{ height: 300 }}>
        <div className="absolute inset-x-3 rounded-3xl bg-card-bg/60 border border-border-color/40" style={{ top: 8, bottom: -8 }} />
        <div className="absolute inset-x-1 rounded-3xl bg-card-bg/85 border border-border-color/60" style={{ top: 4, bottom: -4 }} />
        <div
          className={`${cardAnim} absolute inset-x-0 top-0 bottom-0 rounded-3xl bg-card-bg border flex items-center justify-center overflow-hidden transition-colors duration-300 ${cardBorder}`}
        >
          {imageUrl ? (
            <div className="flex flex-col items-center justify-center p-3 w-full h-full select-none">
              <img
                src={imageUrl}
                alt={thai || "illustration"}
                className="max-h-[175px] max-w-[175px] object-contain rounded-2xl"
              />
              {thai && (
                <span className="text-2xl font-bold text-foreground mt-2 text-center tracking-wide">
                  {thai}
                </span>
              )}
            </div>
          ) : (
            <span className="text-3xl font-bold text-foreground">{thai}</span>
          )}
        </div>
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && check()}
        disabled={answerState !== 'idle'}
        placeholder="พิมพ์คำภาษาอังกฤษ..."
        className={`w-full py-4 px-5 rounded-2xl border bg-card-bg text-foreground text-lg outline-none transition-all duration-300
          ${answerState === 'correct' ? 'border-correct text-correct' : ''}
          ${answerState === 'wrong' ? 'border-incorrect text-incorrect' : ''}
          ${answerState === 'idle' ? 'border-border-color focus:border-primary/60 focus:ring-2 focus:ring-primary/20' : ''}
        `}
      />

      <div className="mt-auto pt-6">
        {answerState === 'idle' && (
          <>
            <button
              onClick={check}
              disabled={!input.trim()}
              className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-lg disabled:opacity-30 active:scale-95 transition-all cursor-pointer shadow-soft-sm"
            >
              ตรวจ
            </button>
            <button
              onClick={giveUp}
              className="mt-3 w-full text-foreground/50 hover:text-foreground text-sm transition-colors cursor-pointer"
            >
              แสดงคำตอบ
            </button>
          </>
        )}
        {answerState === 'wrong' && !isExiting && (
          <div>
            <div className="text-center mb-3">
              <p className="font-semibold text-incorrect text-base">
                ❌ คำตอบที่ถูก: <span className="font-bold">{word}</span>
              </p>
              {thai && (
                <p className="text-foreground/60 text-sm mt-0.5">
                  ความหมาย: {thai}
                </p>
              )}
            </div>
            <button
              onClick={() => round.finish(quality)}
              className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white dark:text-gray-900 font-bold text-lg active:scale-95 transition-transform cursor-pointer shadow-soft-sm"
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

