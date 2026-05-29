'use client';

import { useCallback, useState } from 'react';
import {
  DeleteOutlined,
  PlusOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ConversationSessionRecord } from '../_lib/types';

interface SessionHistoryProps {
  sessions: ConversationSessionRecord[];
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewConversation: () => void;
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

function proficiencyLabel(level: string): string {
  switch (level) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'advanced':
      return 'Advanced';
    default:
      return level;
  }
}

export default function SessionHistory({
  sessions,
  onSelectSession,
  onDeleteSession,
  onNewConversation,
}: SessionHistoryProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      setConfirmingDeleteId(sessionId);
    },
    []
  );

  const handleConfirmDelete = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      onDeleteSession(sessionId);
      setConfirmingDeleteId(null);
    },
    [onDeleteSession]
  );

  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDeleteId(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* New conversation button - always visible */}
      <div className="p-4 border-b-3 border-border-color">
        <button
          type="button"
          onClick={onNewConversation}
          aria-label="New conversation"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-3 border-border-color bg-accent-green px-4 py-3 text-white font-bold shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
        >
          <PlusOutlined style={{ fontSize: 18 }} />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sessions.length === 0 ? (
          <p className="text-center text-text-secondary mt-8">
            No conversation history yet
          </p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSession(session.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSession(session.id);
                }
              }}
              className="w-full rounded-xl border-3 border-border-color bg-card-bg p-4 shadow-nb-md transition-all duration-100 active:translate-y-[2px] active:shadow-[1px_1px_0_var(--shadow-color)] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                {/* Session info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Completion indicator */}
                    {session.completed ? (
                      <CheckCircleFilled
                        style={{ fontSize: 16, color: '#52C41A' }}
                        aria-label="Completed"
                      />
                    ) : (
                      <ClockCircleOutlined
                        style={{ fontSize: 16, color: '#FAAD14' }}
                        aria-label="In progress"
                      />
                    )}
                    <h3 className="text-base font-bold text-text-primary truncate">
                      {session.topic}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="inline-block rounded-md border-2 border-border-color bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-text-primary">
                      {proficiencyLabel(session.proficiencyLevel)}
                    </span>
                    <span>{formatDate(session.createdAt)}</span>
                  </div>
                </div>

                {/* Delete button */}
                <div className="flex-shrink-0">
                  {confirmingDeleteId === session.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleConfirmDelete(e, session.id)}
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
                      onClick={(e) => handleDeleteClick(e, session.id)}
                      aria-label="Delete session"
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
