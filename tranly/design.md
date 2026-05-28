# Ant Design - Illustration Style Design System (Neobrutalism)

This design system uses a high-contrast, playful, and distinct **Illustration/Neobrutalist Style** for all Ant Design components. Other AIs (like Gemini or Claude) working on this codebase **MUST** read, respect, and apply this theme consistency throughout all page constructions.

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
