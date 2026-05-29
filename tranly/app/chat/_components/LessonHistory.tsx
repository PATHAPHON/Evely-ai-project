'use client';

import { useCallback, useState } from 'react';
import {
  DeleteOutlined,
  PlusOutlined,
  ReadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useLanguagePreference } from '@/app/_lib/useLanguagePreference';
import type { LessonRecord } from '../_lib/lessonTypes';

interface LessonHistoryProps {
  lessons: LessonRecord[];
  onSelectLesson: (lesson: LessonRecord) => void;
  onDeleteLesson: (lessonId: string) => void;
  onNewLesson: () => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PROFICIENCY_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function LessonHistory({
  lessons,
  onSelectLesson,
  onDeleteLesson,
  onNewLesson,
}: LessonHistoryProps) {
  const { language } = useLanguagePreference();
  const isThai = language === 'thai';
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, lessonId: string) => {
      e.stopPropagation();
      setConfirmingDeleteId(lessonId);
    },
    []
  );

  const handleConfirmDelete = useCallback(
    (e: React.MouseEvent, lessonId: string) => {
      e.stopPropagation();
      onDeleteLesson(lessonId);
      setConfirmingDeleteId(null);
    },
    [onDeleteLesson]
  );

  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDeleteId(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* New lesson button */}
      <div className="p-4 border-b-3 border-border-color">
        <button
          type="button"
          onClick={onNewLesson}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-accent-green px-4 py-3 text-white font-bold shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
        >
          <PlusOutlined style={{ fontSize: 18 }} />
          <span>{isThai ? 'บทเรียนใหม่' : 'New Lesson'}</span>
        </button>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {lessons.length === 0 ? (
          <p className="text-center text-text-secondary mt-8">
            {isThai ? 'ยังไม่มีบทเรียนที่บันทึกไว้' : 'No saved lessons yet'}
          </p>
        ) : (
          lessons.map((lesson) => (
            <div
              key={lesson.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectLesson(lesson)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectLesson(lesson);
                }
              }}
              className="w-full rounded-xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <ReadOutlined
                      style={{ fontSize: 16, color: '#52C41A' }}
                      aria-hidden
                    />
                    <h3 className="text-base font-bold text-text-primary truncate">
                      {lesson.topic}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                    <span className="inline-block rounded-md border-2 border-border-color bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-text-primary">
                      {PROFICIENCY_LABEL[lesson.proficiencyLevel] ??
                        lesson.proficiencyLevel}
                    </span>
                    {lesson.lastScore !== null && (
                      <span className="inline-flex items-center gap-1 rounded-md border-2 border-border-color bg-accent-yellow px-2 py-0.5 text-xs font-bold text-black">
                        <TrophyOutlined style={{ fontSize: 12 }} />
                        {lesson.lastScore}/{lesson.total}
                      </span>
                    )}
                    <span>{formatDate(lesson.createdAt)}</span>
                  </div>
                </div>

                {/* Delete button */}
                <div className="flex-shrink-0">
                  {confirmingDeleteId === lesson.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleConfirmDelete(e, lesson.id)}
                        aria-label="Confirm delete"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border-color bg-accent-red text-white text-xs font-bold shadow-nb-sm transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelDelete}
                        aria-label="Cancel delete"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border-color bg-gray-200 dark:bg-gray-700 text-text-primary text-xs font-bold shadow-nb-sm transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, lesson.id)}
                      aria-label="Delete lesson"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-border-color bg-card-bg text-accent-red shadow-nb-sm transition-all duration-100 active:translate-y-[1px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
                    >
                      <DeleteOutlined style={{ fontSize: 14 }} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
