'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2, Pencil } from 'lucide-react';

import GeminiLayout from '@/app/_components/GeminiLayout';
import { useConversationHistory } from '@/app/chat/_lib/hooks/useConversationHistory';
import { useStrings } from '@/app/_lib/utils/strings';
import { relativeTimeTh } from '@/app/_lib/utils/relativeTime';

type SortMode = 0 | 1 | 2 | 3; // newest, oldest, A→Z, Z→A
const SORT_LABELS = ["ใหม่สุด", "เก่าสุด", "A → Z", "Z → A"] as const;

export default function RecentsPage() {
  const router = useRouter();
  const t = useStrings();
  const { sessions, loadSessions, deleteSession } = useConversationHistory();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(0);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) =>
      (s.topic || t.drawer.untitledChat).toLowerCase().includes(q)
    );
  }, [sessions, query, t.drawer.untitledChat]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const name = (s: typeof sessions[0]) => (s.topic || t.drawer.untitledChat).toLowerCase();
    switch (sortMode) {
      case 0:
        return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case 1:
        return arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case 2:
        return arr.sort((a, b) => name(a).localeCompare(name(b)));
      case 3:
        return arr.sort((a, b) => name(b).localeCompare(name(a)));
    }
  }, [filtered, sortMode, t.drawer.untitledChat]);

  const sortButton = sessions && sessions.length > 0 ? (
    <button
      type="button"
      onClick={() => setSortMode((m) => (((m + 1) % 4) as SortMode))}
      aria-label={`จัดเรียงตาม: ${SORT_LABELS[sortMode]}`}
      title={`จัดเรียงตาม: ${SORT_LABELS[sortMode]}`}
      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-card-bg active:scale-95 cursor-pointer"
    >
      {sortMode === 0 && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="sort-grad-0" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f8df7" />
              <stop offset="100%" stopColor="#1b62d1" />
            </linearGradient>
          </defs>
          <circle cx="9" cy="12" r="7" stroke="url(#sort-grad-0)" />
          <polyline points="9 9 9 12 12 13.5" stroke="url(#sort-grad-0)" />
          <path d="M19 8v8M19 16l-3-3M19 16l3-3" stroke="url(#sort-grad-0)" />
        </svg>
      )}
      {sortMode === 1 && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="sort-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f8df7" />
              <stop offset="100%" stopColor="#1b62d1" />
            </linearGradient>
          </defs>
          <circle cx="9" cy="12" r="7" stroke="url(#sort-grad-1)" />
          <polyline points="9 9 9 12 12 13.5" stroke="url(#sort-grad-1)" />
          <path d="M19 16V8M19 8l-3 3M19 8l3-3" stroke="url(#sort-grad-1)" />
        </svg>
      )}
      {sortMode === 2 && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="sort-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f8df7" />
              <stop offset="100%" stopColor="#1b62d1" />
            </linearGradient>
          </defs>
          <path d="M4 11V6h4v5M4 9h4" stroke="url(#sort-grad-2)" />
          <path d="M4 14h4L4 19h4" stroke="url(#sort-grad-2)" />
          <path d="M19 8v8M19 16l-3-3M19 16l3-3" stroke="url(#sort-grad-2)" />
        </svg>
      )}
      {sortMode === 3 && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="sort-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f8df7" />
              <stop offset="100%" stopColor="#1b62d1" />
            </linearGradient>
          </defs>
          <path d="M4 6h4L4 11h4" stroke="url(#sort-grad-3)" />
          <path d="M4 19V14h4v5M4 17h4" stroke="url(#sort-grad-3)" />
          <path d="M19 8v8M19 16l-3-3M19 16l3-3" stroke="url(#sort-grad-3)" />
        </svg>
      )}
    </button>
  ) : undefined;

  return (
    <GeminiLayout title={t.recents.title} rightElement={sortButton}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center gap-2.5 rounded-full border border-border-color bg-card-bg/50 px-4 h-12 shadow-soft-sm">
            <Search className="text-foreground/40 shrink-0" size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.recents.searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-foreground/45"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {sorted.length === 0 ? (
            <p className="text-center text-sm text-foreground/50 mt-12">
              {t.recents.empty}
            </p>
          ) : (
            <ul className="flex flex-col">
              {sorted.map((s) => (
                <li
                  key={s.id}
                  className="group relative flex items-center justify-between gap-3 py-3.5 cursor-pointer border-b border-border-color/40 hover:bg-card-bg/30 px-2 rounded-xl transition-all"
                  onClick={() => router.push(`/chat/${s.id}`)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[17px] text-foreground font-semibold">
                      {s.topic || t.drawer.untitledChat}
                    </p>
                    <p className="text-[13px] text-foreground/60 mt-0.5">
                      {relativeTimeTh(s.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteSession(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-foreground/40 hover:text-incorrect p-2 rounded-full transition-all cursor-pointer flex-shrink-0"
                    aria-label={t.recents.deleteChatAria}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Floating New chat */}
        <button
          type="button"
          onClick={() => router.push('/new')}
          className="absolute bottom-6 right-5 z-40 flex items-center gap-2.5 pl-5 pr-6 h-14 rounded-full bg-gradient-to-br from-[#4f8df7] to-[#1b62d1] text-white shadow-soft-lg transition-all hover:scale-105 active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-blue-500/20 hover:brightness-105"
        >
          <Pencil size={18} />
          <span className="text-[15px] font-semibold">{t.drawer.newChat}</span>
        </button>
      </div>
    </GeminiLayout>
  );
}
