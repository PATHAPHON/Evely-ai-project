# Tarnly - Illustration Style Design System (Neobrutalism)

The app is named **Tarnly** (one word, everywhere — landing, metadata, manifest, App Info).
This design system uses a high-contrast, playful, and distinct **Illustration/Neobrutalist Style** built on Ant Design components. Other AIs (like Gemini or Claude) working on this codebase **MUST** read, respect, and apply this theme consistency throughout all page constructions.

---

## 🎨 Core Design Concept: Neobrutalism

- **High Contrast Borders**: Hard-coded solid black borders (`#2C2C2C`) with a standard line-width of `3px`.
- **Flat Box Shadows**: Card elements, dropdowns, inputs, and selected components feature flat, solid offsets (`boxShadow: '4px 4px 0 #2C2C2C'`) without fuzzy gradients or blurs.
- **Warm, Textured Backgrounds**: Default base canvas color is a warm cream (`#FFF9F0`), and container background is clean white (`#FFFFFF`).
- **Accent Colors**: Vibrant, saturated colors:
  - Primary Green: `#52C41A`
  - Success Green: `#51CF66`
  - Warning Yellow: `#FFD93D`
  - Error Red: `#FA5252`
  - Info Blue: `#4DABF7`
  - Card background: `#FFF0F6` (Cute soft-pink accent)

---

## 🚀 Theme Integration Guide

All routes, layouts, and sub-pages must reside inside the `<ConfigProvider>` configured with the `useIllustrationTheme` hook.

### 1. Installation

If not already installed, make sure to add `antd` and `antd-style`:
```bash
npm install antd @ant-design/nextjs-registry @ant-design/icons antd-style
```

### 2. The Custom Theme Hook

The theme is implemented as a custom hook leveraging `antd-style` to inject Neobrutalist css variables into the Ant Design design tokens.

File location: `app/theme/illustrationTheme.ts`
```typescript
"use client";

import { useMemo } from 'react';
import { theme } from 'antd';
import type { ConfigProviderProps } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css, cssVar }) => {
  const illustrationBorder = {
    border: `${cssVar.lineWidth} solid ${cssVar.colorBorder}`,
  };

  const illustrationBox = {
    ...illustrationBorder,
    boxShadow: `4px 4px 0 ${cssVar.colorBorder}`,
  };

  return {
    illustrationBorder,
    illustrationBox,
    buttonRoot: css({
      ...illustrationBox,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }),
    modalContainer: css({
      ...illustrationBox,
    }),
    tooltipRoot: css({
      padding: cssVar.padding,
    }),
    popupBox: css({
      ...illustrationBox,
      borderRadius: cssVar.borderRadiusLG,
      backgroundColor: cssVar.colorBgContainer,
    }),
    progressRail: css({
      border: `${cssVar.lineWidth} solid ${cssVar.colorBorder}`,
      boxShadow: `2px 2px 0 ${cssVar.colorBorder}`,
    }),
    progressTrack: css({
      border: 'none',
    }),
    inputNumberActions: css({
      width: 12,
    }),
  };
});

const useIllustrationTheme = () => {
  const { styles } = useStyles();

  return useMemo<ConfigProviderProps>(
    () => ({
      theme: {
        algorithm: theme.defaultAlgorithm,
        token: {
          colorText: '#2C2C2C',
          colorPrimary: '#52C41A',
          colorSuccess: '#51CF66',
          colorWarning: '#FFD93D',
          colorError: '#FA5252',
          colorInfo: '#4DABF7',
          colorBorder: '#2C2C2C',
          colorBorderSecondary: '#2C2C2C',
          lineWidth: 3,
          lineWidthBold: 3,
          borderRadius: 12,
          borderRadiusLG: 16,
          borderRadiusSM: 8,
          controlHeight: 40,
          controlHeightSM: 34,
          controlHeightLG: 48,
          fontSize: 15,
          fontWeightStrong: 600,
          colorBgBase: '#FFF9F0',
          colorBgContainer: '#FFFFFF',
        },
        components: {
          Button: {
            primaryShadow: 'none',
            dangerShadow: 'none',
            defaultShadow: 'none',
            fontWeight: 600,
          },
          Modal: {
            boxShadow: 'none',
          },
          Card: {
            boxShadow: '4px 4px 0 #2C2C2C',
            colorBgContainer: '#FFF0F6',
          },
          Tooltip: {
            colorBorder: '#2C2C2C',
            colorBgSpotlight: 'rgba(100, 100, 100, 0.95)',
            borderRadius: 8,
          },
          Select: {
            optionSelectedBg: 'transparent',
          },
          Slider: {
            dotBorderColor: '#237804',
            dotActiveBorderColor: '#237804',
            colorPrimaryBorder: '#237804',
            colorPrimaryBorderHover: '#237804',
          },
        },
      },
      button: {
        classNames: {
          root: styles.buttonRoot,
        },
      },
      modal: {
        classNames: {
          container: styles.modalContainer,
        },
      },
      alert: {
        className: styles.illustrationBorder,
      },
      colorPicker: {
        arrow: false,
        classNames: {
          root: styles.illustrationBox,
        },
      },
      popover: {
        classNames: {
          container: styles.illustrationBox,
        },
      },
      tooltip: {
        arrow: false,
        classNames: {
          root: styles.tooltipRoot,
          container: styles.illustrationBox,
        },
      },
      dropdown: {
        classNames: {
          root: styles.popupBox,
        },
      },
      select: {
        classNames: {
          root: styles.illustrationBox,
          popup: {
            root: styles.popupBox,
          },
        },
      },
      input: {
        classNames: {
          root: styles.illustrationBox,
        },
      },
      inputNumber: {
        classNames: {
          root: styles.illustrationBox,
          actions: styles.inputNumberActions,
        },
      },
      progress: {
        classNames: {
          rail: styles.progressRail,
          track: styles.progressTrack,
        },
        styles: {
          rail: {
            height: 16,
          },
          track: {
            height: 10,
          },
        },
      },
    }),
    [styles],
  );
};

export default useIllustrationTheme;
```

---

## 🛠️ Usage Guideline for AI coding agents

When building forms, dashboards, and layouts, ensure you import and wrap pages with the custom theme ConfigProvider:

### Example Integration in `page.tsx` or `App.tsx`
```tsx
"use client";

import React from "react";
import { ConfigProvider, Button, Card, Space, Input, Select, Progress } from "antd";
import useIllustrationTheme from "@/theme/illustrationTheme";

export default function IllustrationDemo() {
  const configProps = useIllustrationTheme();

  return (
    <ConfigProvider {...configProps}>
      {/* Set a background corresponding to the theme's warm tone: bg-[#FFF9F0] */}
      <div className="min-h-screen bg-[#FFF9F0] p-8 flex flex-col items-center justify-center">
        <Card title="Neobrutalist Card" style={{ width: 400 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Input placeholder="Enter username" />
            <Select 
              placeholder="Select tag" 
              options={[{ value: 'code', label: 'Coding' }, { value: 'design', label: 'Design' }]} 
            />
            <Progress percent={70} strokeColor="#52C41A" />
            <Button type="primary" block>
              Submit Action
            </Button>
          </Space>
        </Card>
      </div>
    </ConfigProvider>
  );
}
```

### Critical styling checklist for AIs:
1. **Never use deep blur shadows**: Do not inject custom inline styles that introduce fuzzy box-shadows. Use `boxShadow: '4px 4px 0 #2C2C2C'` for custom containers.
2. **Apply High-Contrast borders to non-AntD containers**: If you create a custom custom HTML container or absolute element, style it with `border: '3px solid #2C2C2C'` and `borderRadius: '12px'`.
3. **Use the theme variables**: Always prioritize using tokens in `<ConfigProvider>` instead of hard-coding inline CSS styles, to allow smooth color updates.
4. **Use uppercase primary text on buttons**: Use uppercase for primary headings and strong labels to complement the chunky illustrations aesthetic.

---

# 🧪 UX Heuristics Audit (added 2026-05-29)

A usability review of the live app screens against **Krug's Laws** ("Don't Make Me Think"),
**Nielsen's 10 Heuristics**, and **WCAG 2.1 AA**. Severity scale: **4** catastrophic →
**1** cosmetic. Scope: `app/` (landing, home/feed, learn, chat, scan, profile).

> This section is a usability evaluation only. The Neobrutalism design-system spec above
> remains the source of truth for visual tokens — nothing here changes it.

## Overall Score: **6.5 / 10**

A polished, confident visual system with strong loading/empty states and clear tab
orientation. The gap to 10/10 is **consistency** (mixed Thai/English, drifting brand name)
and a few control/feedback gaps (no undo, silent nav-lock, low-contrast captions).

## Per-Screen Scores

| Screen | File | Score | Biggest gap |
|--------|------|-------|-------------|
| Landing | `app/page.tsx` | 7/10 | Brand name drift; auto-redirect with no skip affordance besides the button |
| Home / Word Feed | `app/home/page.tsx`, `_components/WordFeed.tsx` | 6/10 | Decorative icon noise; tab label "Word" ≠ active state "Learn" |
| Learn (My Words) | `app/learn/page.tsx` | 6/10 | Mixed languages; native `confirm()` delete with no undo |
| AI Chat / Lessons | `app/chat/page.tsx` | 7/10 | Nav-lock dims tabs with no explanation |
| Scan (camera) | `app/scan/page.tsx` | 8/10 | No capture guidance; otherwise exemplary (44px targets, labels) |
| Profile | `app/profile/page.tsx` | 7/10 | Inherits language/contrast issues |

## Findings by Severity

### 🟥 Severity 3 — Major (fix soon)

**3.1 — Inconsistent language (Thai ↔ English)**
*Heuristics: Nielsen #4 Consistency, #2 Match real world; Krug Law #1.*
The UI mixes Thai and English unpredictably. `learn/page.tsx` shows the English heading
"My Words" beside Thai toggles "คำทั้งหมด" and a Thai `confirm()` ("ลบคำว่า…"); `scan/page.tsx`
uses Thai aria-labels ("ปิดกล้อง", "ถ่ายภาพ"); `chat/page.tsx` correctly switches on the
`isThai` language preference, but home/learn/profile hardcode English. A user picks a mental
model of "what language is this app" and the app keeps breaking it.
**Fix:** route *all* user-facing strings through the existing `useLanguagePreference` hook
(already used in chat) and a shared string table. One language per session, everywhere.

### 🟧 Severity 2 — Minor (schedule fix)

**2.1 — No undo; blocking native `confirm()`**
*Heuristics: Krug Law #1, Nielsen #3 Control & Freedom.*
Deleting a saved word (`learn/page.tsx:99`) fires `window.confirm()`, and the feed error path
uses native dialogs. Confirmation dialogs train users to click through without reading; undo
is safer and less interruptive.
**Fix:** replace `confirm()` with an inline soft-delete + "Undo" toast (the card fades out,
a 5s undo affordance restores it). Reuse the existing Neobrutalist button styling.

**2.2 — Brand-name drift**
*Heuristics: Nielsen #4 Consistency, Krug clarity.*
The product is called "TARNLY KOREAN" on the landing card (`page.tsx:39`), "Tarnly" in
`layout.tsx` metadata, "Tranly" in the repo/folder, and the design.md header still says
"Ant Design". Four names for one app erodes trust and the trunk-test "what site am I on?".
**Fix:** pick one canonical name and apply it to `layout.tsx` metadata, landing title,
manifest, and this doc's header.

**2.3 — Nav-lock dims tabs without explanation**
*Heuristics: Nielsen #1 Visibility of status, #3 Control & Freedom.*
During an active chat/lesson the tab bar is locked (`chat/page.tsx:165`, `navLocked`). Tabs
only drop to `opacity-40` and silently no-op on tap — the user can't tell *why* they're stuck
or how to leave. The escape hatch (the red End/Quit button) is in the header, far from where
they're tapping.
**Fix:** on a locked-tab tap, surface a brief hint ("Finish or end this session first") and/or
visually point to the End button. Keep the lock (it prevents data loss) but explain it.

**2.4 — Low-contrast secondary text**
*Heuristics: WCAG 2.1 AA 1.4.3 (4.5:1).*
Timestamps and captions use `text-black/40` / `text-white/40` (e.g. `learn/page.tsx:78`,
`WordFeed.tsx:287`). At 40% opacity these fall below the 4.5:1 minimum on white/dark cards.
**Fix:** raise secondary text to at least `/60–/70` opacity or a token that tests ≥4.5:1.

### 🟨 Severity 1 — Cosmetic (fix if time)

**1.1 — Tab label vs destination mismatch**
*Heuristics: Krug Law #1 clarity.*
The second tab reads "Word", routes to `/learn`, lands on a heading "My Words", while the
internal state key is `"Learn"` (`home/page.tsx:29,210`). Harmless but four names for one
destination. Pick one label ("Words") and match the heading.

**1.2 — Decorative icon noise on Home**
*Heuristics: Nielsen #8 Aesthetic & Minimalist; "Get rid of half the words/things".*
Home renders ~16 floating animated icons plus a meteor shower (`home/page.tsx:74–129`). They
sit at `z-0` / `pointer-events-none` so they don't block interaction, but constant motion
competes with the one thing that matters — the word card. Consider thinning the set or
respecting `prefers-reduced-motion`.

**1.3 — Landing auto-redirect**
*Heuristics: Nielsen #1 Visibility, #3 Control.*
`page.tsx` auto-pushes to `/home` after 1.5s. The "Open App" button is a good manual path,
but the redirect can feel abrupt. Low impact since the destination is the home screen anyway.

## ✅ What's Already Working Well

- **Loading states everywhere** — feed load/advance spinners (`WordFeed.tsx`), capture
  spinner (`scan/page.tsx`), "Loading…" placeholders. Strong Nielsen #1.
- **Good empty states** — Learn's "No saved words yet" + a primary "Scan Now" CTA guides the
  next action instead of dead-ending.
- **Scan screen accessibility** — explicit 44×44px tap targets and aria-labels; a model for
  the rest of the app.
- **Clear "you are here"** — the active tab gets the pink Neobrutalist chip; trunk-test
  orientation is solid for a tabbed mobile app.
- **Affordance hints** — "↑ Swipe up for next word" teaches the core gesture (Nielsen #6
  Recognition over recall).
- **Confirmation modals for destructive flows** — End Conversation / Quit Lesson use styled
  modals that explain the consequence ("saved to your history").

## 🎯 Top 5 Fixes to Reach 10/10

1. **Unify language** — drive every string through `useLanguagePreference` (kills the #1 issue). `(+1.5)`
2. **Replace `confirm()` with soft-delete + Undo toast** on Learn. `(+0.5)`
3. **Pick one brand name** across landing, metadata, manifest, and this doc. `(+0.5)`
4. **Explain the chat nav-lock** with an inline hint + point to End/Quit. `(+0.5)`
5. **Fix secondary-text contrast** to WCAG AA and honor `prefers-reduced-motion` on Home. `(+0.5)`

---

# 🎨 Refactoring-UI Review (added 2026-05-29)

A visual-design pass against the **Refactoring UI** framework (hierarchy, spacing, color,
depth, typography), applied *within* the Neobrutalism system above — borders and flat-offset
shadows are kept; the goal was **consistency and hierarchy**, not a restyle.

> Score before: **~6/10** (strong style, but "everything bold," ad-hoc colors/shadows, and
> sub-AA captions undercut it). Score after this pass: **~8.5/10**. Remaining gap is the
> dark-surface hexes and the cross-cutting language inconsistency (tracked in the UX audit).

## What changed (and the rules going forward)

### 1. Tokenized the design scale (`app/globals.css`)
The accent palette, a meta-text color, and a shadow scale now live as CSS variables exposed
through `@theme inline`, so the same value is reused everywhere instead of being re-typed.

| Token | Use |
|-------|-----|
| `--accent-green/-red/-blue/-yellow` → `bg-accent-*`, `text-accent-*` | Replaces ~90 inline hexes. **Red is now one value** (`#fa5252`) — the old `#FF4D4F` drift is gone. |
| `--text-meta` → `text-text-meta` | De-emphasized captions/timestamps that are still AA-legible (was `text-black/40`). |
| `--shadow-nb-sm / -md / -lg` → `shadow-nb-*` | The flat offset scale: **2px raised · 4px card · 6px modal**. The dark variant is baked in via `--shadow-color`, so the `dark:shadow-[…]` duplicate is no longer needed. |

**Rule:** never hardcode an accent hex or a `shadow-[Npx_Npx_0_#000]` literal again — use the
token. Colored shadows (e.g. `#EF4444`, `#d9d9d9`) are the only sanctioned raw-hex shadows.

### 2. Established a 3-tier weight hierarchy
Was: nearly every text node `font-extrabold`/`font-black`, so nothing stood out. Now:
**Primary** (page title, headword) extrabold · **Secondary** (Korean line, body, labels)
semibold · **Meta** (timestamps, hints) medium + `text-text-meta`. See `learn/page.tsx`
`WordCard` and the shared header.

### 3. Shared `PageHeader` + spacing scale (`app/_components/PageHeader.tsx`)
The header block was copy-pasted on 4 screens with arbitrary `p-[20px_16px_0]` / `pt-[10px]`
/ `text-[28px]`. Extracted to one component using scale spacing (`px-4 pt-6`) and the type
scale (`text-3xl`, `leading-tight`). Adopted by Home, Word, Profile.

### 4. Contrast + reduced motion
Sub-AA `/40` captions → `text-text-meta`; `/50` inactive states → `text-text-secondary`
(bumped to 0.62/0.70). Home's decorative icons now respect `prefers-reduced-motion` and their
peak opacity was lowered so they compete less with the word card (Aesthetic & Minimalist).

## Follow-ups (not done in this pass)
- **Dark-surface hexes** (`dark:bg-[#2d2d44]`, `#3d2d44`, `#1a3a5c`, …) are still inline —
  tokenize as `--surface-1/-2` once their roles are pinned down.
- **`chat/page.tsx` header** kept its bespoke layout (it's a stateful control cluster, not a
  plain header); fold it into `PageHeader` with an `action` slot later.
- **Secondary blue `#4096FF`** vs `accent-blue #4DABF7` — decide if these are one role.
