"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "tarnly:theme";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border-color bg-card-bg text-foreground/70 transition-colors hover:text-foreground cursor-pointer"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
