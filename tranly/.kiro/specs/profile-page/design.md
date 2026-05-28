# Design Document

## Overview

ออกแบบหน้า Profile ของ Tarnly Korean ให้ครบถ้วน โดยเพิ่มส่วนแสดงข้อมูลผู้ใช้ สถิติการเรียน การตั้งค่า AI, Dark Mode, และการจัดการข้อมูล ทั้งหมดเก็บข้อมูลใน localStorage และ IndexedDB (client-side only) ใช้ดีไซน์ Neobrutalist ที่สอดคล้องกับหน้าอื่นๆ ของแอป

## Architecture

### Component Structure

```
app/profile/
├── page.tsx                          # Main profile page (updated)
├── _components/
│   ├── UserHeader.tsx                # Avatar + display name + edit
│   ├── LearningStats.tsx             # Stats cards (words, chats, scans)
│   ├── SettingsSection.tsx           # Container for all settings
│   ├── LanguageSelector.tsx          # Translation language (extracted from current page)
│   ├── AIConfigPanel.tsx             # API key input + model selector
│   ├── ThemeToggle.tsx               # Dark/Light mode switch
│   ├── DataManagement.tsx            # Reset data button + confirmation
│   └── AppInfo.tsx                   # App name + version
├── _lib/
│   ├── useUserProfile.ts            # Hook: display name persistence
│   ├── useLearningStats.ts          # Hook: read stats from IndexedDB
│   ├── useAIConfig.ts               # Hook: API key + model persistence
│   ├── useTheme.ts                  # Hook: theme persistence + application
│   └── useDataReset.ts              # Hook: clear all data
```

### Data Flow

```
localStorage keys:
├── tarnly:display-name              # string (display name)
├── tarnly:translation-language      # "thai" | "english" (existing)
├── tarnly:ai-api-key                # string (API key)
├── tarnly:ai-model                  # string (selected model ID)
├── tarnly:theme                     # "light" | "dark"

IndexedDB (read-only from profile):
├── words store                      # count for stats
├── conversations store              # count for stats
```

### Theme Implementation

Dark mode ใช้ CSS class strategy ของ Tailwind:
- เพิ่ม `class="dark"` บน `<html>` element เมื่อเปิด dark mode
- ใช้ Tailwind dark mode strategy: `class` (ไม่ใช่ media query)
- สี dark mode: bg-[#1a1a2e], text-white, border-[#4a4a6a], card bg-[#2d2d44]
- Inline script ใน layout.tsx เพื่อ apply theme ก่อน hydration (ป้องกัน flash)

### AI Config Flow

```
Client (Profile) → saves key + model to localStorage
                ↓
Client (Chat/Feed page) → reads from localStorage
                ↓
API Route → receives key + model in request headers
                ↓
If custom key exists → use custom key + model
If no custom key → use server env KKU_API_KEY + default model
```

## Components and Interfaces

### UserHeader Component

| Prop | Type | Description |
|------|------|-------------|
| - | - | Self-contained, uses useUserProfile hook |

**Behavior:**
- แสดง avatar วงกลมขนาดใหญ่ (64px) พร้อมตัวอักษรย่อจากชื่อ
- แสดงชื่อผู้ใช้ด้านล่าง avatar
- กดที่ชื่อเพื่อแก้ไข (inline edit with input field)
- กด Enter หรือ blur เพื่อบันทึก
- ชื่อว่าง → แสดง "Learner"

### LearningStats Component

| Prop | Type | Description |
|------|------|-------------|
| - | - | Self-contained, uses useLearningStats hook |

**Behavior:**
- แสดง 3 stat cards แบบ grid: คำศัพท์, บทสนทนา, flashcard
- อ่านข้อมูลจาก IndexedDB ตอน mount
- แสดง loading skeleton ระหว่างโหลด

### AIConfigPanel Component

| Prop | Type | Description |
|------|------|-------------|
| - | - | Self-contained, uses useAIConfig hook |

**Behavior:**
- Input field สำหรับ API key (type=password)
- แสดง masked value (••••xxxx) เมื่อมี key อยู่แล้ว
- ปุ่ม show/hide key
- Dropdown เลือก model: gemini-2.5-flash-lite, gemini-2.5-flash, gemini-2.5-pro, gpt-4o-mini, gpt-4o
- ปุ่ม Save / Clear

### ThemeToggle Component

| Prop | Type | Description |
|------|------|-------------|
| - | - | Self-contained, uses useTheme hook |

**Behavior:**
- Toggle switch แบบ neobrutalist (pill shape with sun/moon icon)
- เปลี่ยนธีมทันทีเมื่อกด
- เพิ่ม/ลบ class "dark" บน document.documentElement

### DataManagement Component

| Prop | Type | Description |
|------|------|-------------|
| - | - | Self-contained, uses useDataReset hook |

**Behavior:**
- ปุ่ม "Reset All Data" สีแดง
- กดแล้วแสดง confirmation modal
- ยืนยัน → ลบ IndexedDB ทุก store + localStorage ทุก key → reload

### Hook Interfaces

```typescript
// useUserProfile
interface UseUserProfileReturn {
  displayName: string;
  setDisplayName: (name: string) => void;
  avatarInitial: string;
}

// useLearningStats
interface LearningStats {
  totalWords: number;
  totalConversations: number;
  totalScans: number;
  isLoading: boolean;
}

// useAIConfig
interface AIConfig {
  apiKey: string | null;
  model: string;
  setApiKey: (key: string | null) => void;
  setModel: (model: string) => void;
  maskedKey: string | null;
}

// useTheme
interface UseThemeReturn {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

// useDataReset
interface UseDataResetReturn {
  resetAllData: () => Promise<void>;
  isResetting: boolean;
}
```

## Data Models

### localStorage Schema

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `tarnly:display-name` | string | "Learner" | User's display name |
| `tarnly:translation-language` | "thai" \| "english" | "thai" | Translation language (existing) |
| `tarnly:ai-api-key` | string \| null | null | Custom AI API key |
| `tarnly:ai-model` | string | "gemini-2.5-flash-lite" | Selected AI model |
| `tarnly:theme` | "light" \| "dark" | "light" | App theme preference |

### Available AI Models

| Model ID | Display Name |
|----------|-------------|
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash Lite (Default) |
| `gemini-2.5-flash` | Gemini 2.5 Flash |
| `gemini-2.5-pro` | Gemini 2.5 Pro |
| `gpt-4o-mini` | GPT-4o Mini |
| `gpt-4o` | GPT-4o |

### Dark Mode Color Palette

| Element | Light | Dark |
|---------|-------|------|
| Background | #FFFFFF / #FFFDF7 | #1a1a2e |
| Card BG | #FFFFFF | #2d2d44 |
| Text Primary | #000000 | #FFFFFF |
| Text Secondary | rgba(0,0,0,0.5) | rgba(255,255,255,0.6) |
| Border | #000000 | #4a4a6a |
| Shadow | #000000 | rgba(0,0,0,0.4) |
| Accent Green | #52C41A | #52C41A |
| Accent Pink BG | #FFF0F6 | #3d2d44 |

## Error Handling

| Scenario | Handling |
|----------|----------|
| IndexedDB unavailable (private browsing) | Show stats as "—" with tooltip "Data unavailable" |
| localStorage full | Show toast error "Storage full, cannot save preference" |
| Invalid API key format | Allow any string, validation happens server-side on use |
| Reset data fails mid-operation | Show error toast, suggest page reload |
| Theme class not applied (SSR mismatch) | Inline script in `<head>` prevents flash by applying class before React hydrates |

## Testing Strategy

- Unit tests for pure functions: `avatarInitial()`, `maskKey()`, theme read/write
- Component tests for UserHeader (edit flow), ThemeToggle (toggle state), DataManagement (confirmation flow)
- Integration test for AI config headers being sent correctly in fetch calls

## Correctness Properties

### Property 1: Avatar Initial Derivation

**Validates: Requirements 1.4, 1.5**

For all non-empty display names, the avatar initial equals the first character of the display name. For empty strings, the avatar initial equals "L" (from "Learner").

```
avatarInitial(name) = name.length > 0 ? name[0] : "L"
```

### Property 2: API Key Masking

**Validates: Requirements 5.2**

For all API keys with length >= 4, the masked output shows "••••" followed by the last 4 characters. For keys shorter than 4 characters, the entire key is masked as "••••".

```
maskKey(key) = key.length >= 4 ? "••••" + key.slice(-4) : "••••"
```

### Property 3: Theme Persistence Round-Trip

**Validates: Requirements 6.4, 6.5**

For all theme values ("light" | "dark"), saving a theme to localStorage and reading it back produces the same value.

```
readTheme(saveTheme(theme)) == theme
```

### Property 4: Data Reset Completeness

**Validates: Requirements 4.3**

After resetAllData() completes, all IndexedDB stores (words, conversations, conversation-messages, feed-words, captures, flashcards) contain zero records, and all tarnly:* localStorage keys are removed.

### Property 5: Stats Count Accuracy

**Validates: Requirements 2.1, 2.2, 2.3**

The total words count displayed equals the exact number of records in the words IndexedDB store. Same for conversations count.

```
displayedWordCount == indexedDB.words.count()
displayedConversationCount == indexedDB.conversations.count()
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/profile/page.tsx` | Modify | Refactor to use new components |
| `app/profile/_components/UserHeader.tsx` | Create | Avatar + name display/edit |
| `app/profile/_components/LearningStats.tsx` | Create | Stats cards |
| `app/profile/_components/SettingsSection.tsx` | Create | Settings container |
| `app/profile/_components/LanguageSelector.tsx` | Create | Extract from current page |
| `app/profile/_components/AIConfigPanel.tsx` | Create | API key + model config |
| `app/profile/_components/ThemeToggle.tsx` | Create | Dark/light toggle |
| `app/profile/_components/DataManagement.tsx` | Create | Reset data button + modal |
| `app/profile/_components/AppInfo.tsx` | Create | Version display |
| `app/profile/_lib/useUserProfile.ts` | Create | Display name hook |
| `app/profile/_lib/useLearningStats.ts` | Create | Stats from IndexedDB |
| `app/profile/_lib/useAIConfig.ts` | Create | AI config persistence |
| `app/profile/_lib/useTheme.ts` | Create | Theme management |
| `app/profile/_lib/useDataReset.ts` | Create | Data clearing |
| `app/api/chat/route.ts` | Modify | Accept custom API key/model headers |
| `app/api/feed/route.ts` | Modify | Accept custom API key/model headers |
| `app/layout.tsx` | Modify | Add theme initialization script |
| `tailwind.config.ts` | Modify | Add darkMode: 'class' |
| `app/globals.css` | Modify | Add dark mode CSS variables |
