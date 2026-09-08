# Tarnly Design System & UI Specifications

This document outlines the unified design system for **Tarnly**, establishing standard tokens, scales, and rules to resolve UI inconsistency across the app. 

---

## 1. Core Theme Style: Modern Soft UI (Gemini Style)

Tarnly adopts a **Modern Soft UI** theme, inspired by Google Gemini, moving away from Neobrutalist borders and flat-offset shadows.

*   **Overall Vibe**: Sleek, clean, responsive, and premium.
*   **Corners**: Generous, smooth curvature (`rounded-2xl`, `rounded-[28px]`).
*   **Borders**: Soft, thin, and subtle borders (`border-gray-150` or `border-black/5`) instead of thick black borders.
*   **Shadows**: Natural, ambient, and diffuse shadows to simulate depth (e.g., `shadow-[0_2px_16px_rgba(0,0,0,0.08)]`) instead of solid offset shadows.
*   **Theme Transitions**: Smooth background and color transitions for Dark/Light mode toggle.

---

## 2. Color Palette (No Neon Theme)

The color palette is built using **Sleek Blue & Cool Grays** to emphasize a premium learning atmosphere. Neon colors are avoided to maintain readability and accessibility (WCAG AA compliance).

### 2.1 Brand & UI Colors

| Token Name | Light Mode Value | Dark Mode Value | Usage Context |
| :--- | :--- | :--- | :--- |
| `--background` | `#FFFFFF` | `#131314` (Gemini Dark) | Main viewport page background |
| `--foreground` | `#1F1F1F` | `#E3E3E3` | Main body text |
| `--card-bg` | `#F0F4F9` | `#1E1F20` | Drawer sidebar, chat container, content cards |
| `--primary` | `#0A58CA` (Blue-600) | `#A8C7FA` (Blue-200) | Primary buttons, active states, brand icons |
| `--primary-hover` | `#084298` | `#D3E3FD` | Primary button hover |
| `--primary-bg` | `#E8F0FE` | `#004A77`/`30` | Subtle background highlights, active navigation links |
| `--border-color` | `#E1E3E1` | `#3C4043` | Dividers, subtle borders around inputs/containers |
| `--shadow-color` | `rgba(0, 0, 0, 0.08)` | `rgba(0, 0, 0, 0.45)` | Ambient elevation shadow color |

### 2.2 Validation & Status Colors (Accessibility Standard)

These colors are standardized to provide high readability on both light and dark backgrounds.

*   **Correct (Green)**:
    *   Light Mode: `#15803D` (Green-700) | Dark Mode: `#4ADE80` (Green-400)
    *   *Usage*: Correct quiz options, success toast messages, completed milestones.
*   **Incorrect (Red)**:
    *   Light Mode: `#B91C1C` (Red-700) | Dark Mode: `#F87171` (Red-400)
    *   *Usage*: Incorrect quiz options, error validations, danger alerts.
*   **Warning (Yellow)**:
    *   Light Mode: `#B45309` (Amber-700) | Dark Mode: `#FBBF24` (Amber-400)
    *   *Usage*: Upgrade warnings, premium placeholders, tips.

---

## 3. Border Radius System (Soft & Friendly Scale)

To unify the curvature of components across the app, we organize elements into 4 distinct groups:

| Curvature Level | Tailwind Class | Value | Target Components |
| :--- | :--- | :--- | :--- |
| **Small** | `rounded-lg` | `8px` | Badges, tags, checkmarks, status labels |
| **Medium** | `rounded-xl` | `12px` | Buttons, input fields, dropdown select boxes |
| **Large** | `rounded-2xl` | `16px` | Standard cards, popup dialogs, modal frames |
| **Extra Large** | `rounded-[28px]` | `28px` | Main chat containers, floating input boxes, sidebar drawer |
| **Pill/Circle** | `rounded-full` | `9999px` | Avatars, toggle handles, pill badges |

> [!IMPORTANT]
> **Nested Border Radius Rule**: Always ensure nested child components have a smaller border radius than their parent component to prevent corner overlaps.
> **Formula**: $\text{Child Radius} = \text{Parent Radius} - \text{Padding}$.

---

## 4. Typography Scale

Text sizes use a modular scale to ensure comfortable reading hierarchy:

| Scale Level | Tailwind Class | Value | Usage Context |
| :--- | :--- | :--- | :--- |
| **Hero** | `text-4xl` | `36px` | Hero headings, large numbers, mascot reaction headers |
| **Title Large** | `text-3xl` | `30px` | Main onboarding header, landing title |
| **Title Base** | `text-2xl` | `24px` | Main page title, modal header |
| **Title Small** | `text-xl` | `20px` | Section titles, header text on cards |
| **Subtitle** | `text-lg` | `18px` | Word list entries, quiz questions |
| **Body Base** | `text-base` | `16px` | Chat bubble messages, main content, input values |
| **Body Small** | `text-sm` | `14px` | Input labels, descriptive helper text, secondary buttons |
| **Meta/Caption** | `text-xs` | `12px` | Micro-copy, timestamp, secondary metadata labels |

---

## 5. Spacing Scale (8-Point Grid System)

Layout spacing, padding, margins, and gaps strictly follow the **8-Point Grid System** (with 4px for tight couplings) to build rhythm:

| Spacing Token | Tailwind Class | Value | Typical Usage |
| :--- | :--- | :--- | :--- |
| `--space-2xs` | `p-1` / `gap-1` | `4px` | Tight coupling (e.g., Lucide icon + inline label) |
| `--space-xs` | `p-2` / `gap-2` | `8px` | Standard coupling (e.g., input label to input field) |
| `--space-sm` | `p-3` / `gap-3` | `12px` | Tight list items, small component padding |
| `--space-md` | `p-4` / `gap-4` | `16px` | Standard card padding, chat bubble separation, main layouts |
| `--space-lg` | `p-6` / `gap-6` | `24px` | Card-to-card gaps, page-level padding |
| `--space-xl` | `p-8` / `gap-8` | `32px` | Large section gaps |
| `--space-2xl` | `p-12` / `gap-12` | `48px` | Hero section height padding, empty state centering |
| `--space-3xl` | `p-16` / `gap-16` | `64px` | Margins from headers to footer boundaries |
