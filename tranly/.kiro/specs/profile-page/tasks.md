# Implementation Plan

## Overview

เพิ่มฟีเจอร์ในหน้า Profile ของ Tarnly Korean: User header, learning stats, AI config, dark mode, data management, และ app info โดยแบ่งเป็น 7 tasks หลัก

## Tasks

- [x] 1. Setup Dark Mode Infrastructure
  - [x] 1.1 Update `tailwind.config.ts` to add `darkMode: 'class'`
  - [x] 1.2 Create `app/profile/_lib/useTheme.ts` hook that reads/writes theme to localStorage key `tarnly:theme` and toggles `dark` class on `document.documentElement`
  - [x] 1.3 Update `app/layout.tsx` to add inline script that applies saved theme class before hydration (prevent flash)
  - [x] 1.4 Update `app/globals.css` to add dark mode CSS custom properties and base dark styles
- [x] 2. Create User Profile Hook & Header Component
  - [x] 2.1 Create `app/profile/_lib/useUserProfile.ts` hook that manages display name in localStorage key `tarnly:display-name` with "Learner" default and derives avatar initial from first character
  - [x] 2.2 Create `app/profile/_components/UserHeader.tsx` component with avatar circle (64px, neobrutalist border), display name, and inline edit on tap (Enter/blur to save)
- [x] 3. Create Learning Stats Hook & Component
  - [x] 3.1 Create `app/profile/_lib/useLearningStats.ts` hook that reads word count from `words` store and conversation count from `conversations` store in IndexedDB
  - [x] 3.2 Create `app/profile/_components/LearningStats.tsx` component with 3 stat cards in a grid layout (Words, Conversations, Scans) with loading skeleton
- [x] 4. Create AI Configuration
  - [x] 4.1 Create `app/profile/_lib/useAIConfig.ts` hook that manages API key and model selection in localStorage keys `tarnly:ai-api-key` and `tarnly:ai-model`, with key masking function
  - [x] 4.2 Create `app/profile/_components/AIConfigPanel.tsx` component with password input for API key (show/hide toggle), model dropdown (gemini-2.5-flash-lite, gemini-2.5-flash, gemini-2.5-pro, gpt-4o-mini, gpt-4o), and Save/Clear buttons
  - [x] 4.3 Update `app/api/chat/route.ts` to read `x-custom-api-key` and `x-custom-model` headers, using them when present instead of env defaults
  - [x] 4.4 Update `app/api/feed/route.ts` to read `x-custom-api-key` and `x-custom-model` headers, using them when present instead of env defaults
  - [x] 4.5 Update chat and feed client-side fetch calls to include custom headers from localStorage when available
- [x] 5. Create Settings Components
  - [x] 5.1 Create `app/profile/_components/LanguageSelector.tsx` by extracting existing translation language UI from current `page.tsx`
  - [x] 5.2 Create `app/profile/_components/ThemeToggle.tsx` component with neobrutalist toggle switch (sun/moon icons) using useTheme hook
  - [x] 5.3 Create `app/profile/_lib/useDataReset.ts` hook that clears all IndexedDB stores and localStorage tarnly:* keys
  - [x] 5.4 Create `app/profile/_components/DataManagement.tsx` component with red "Reset All Data" button and confirmation modal
  - [x] 5.5 Create `app/profile/_components/AppInfo.tsx` component displaying "Tarnly Korean" and version from package.json
- [x] 6. Assemble Profile Page
  - [x] 6.1 Create `app/profile/_components/SettingsSection.tsx` as a container component with section title
  - [x] 6.2 Refactor `app/profile/page.tsx` to compose all new components: UserHeader → LearningStats → SettingsSection (LanguageSelector, AIConfigPanel, ThemeToggle, DataManagement) → AppInfo
  - [x] 6.3 Add dark mode variant styles (`dark:`) to all profile components for proper dark theme rendering
- [x] 7. Add Dark Mode Support to Existing Pages
  - [x] 7.1 Add dark mode styles to `app/home/page.tsx` (background, text, cards, nav bar)
  - [x] 7.2 Add dark mode styles to `app/learn/page.tsx` (background, text, word cards, nav bar)
  - [x] 7.3 Add dark mode styles to `app/chat/page.tsx` (background, text, chat bubbles, nav bar)
  - [x] 7.4 Add dark mode styles to `app/scan/` pages (background, overlays, buttons)
  - [x] 7.5 Add dark mode styles to the bottom navigation bar component across all pages

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "3.2", "4.1", "4.2", "4.3", "4.4", "4.5", "5.1", "5.2", "5.3", "5.4", "5.5"] },
    { "id": 2, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 3, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5"] }
  ]
}
```

- Wave 1: Task 1 (Dark Mode Infrastructure) — no dependencies
- Wave 2: Tasks 2, 3, 4, 5 — can run in parallel, Task 5.2 depends on Task 1
- Wave 3: Task 6 (Assemble Profile Page) — depends on all of wave 1 and 2
- Wave 4: Task 7 (Dark Mode Other Pages) — depends on Task 1 and Task 6

## Notes

- แอปใช้ KKU IntelSphere API (OpenAI-compatible) ปัจจุบัน key อยู่ใน `.env.local` ฝั่ง server
- AI Config จะส่ง custom key/model ผ่าน request headers เพื่อไม่ต้องแก้ API route signature มาก
- Dark mode ใช้ Tailwind `class` strategy เพื่อให้ toggle ได้จาก JavaScript
- ข้อมูลทั้งหมดเก็บ client-side (localStorage + IndexedDB) ไม่มี backend auth
