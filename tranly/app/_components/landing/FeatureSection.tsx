"use client";

import { type LucideIcon } from "lucide-react";
import { useReveal } from "@/app/_lib/hooks/useReveal";

interface FeatureSectionProps {
  icon: LucideIcon;
  title: string;
  body: string;
  reversed?: boolean;
}

export default function FeatureSection({ icon: Icon, title, body, reversed }: FeatureSectionProps) {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-14 sm:flex-row ${
        reversed ? "sm:flex-row-reverse" : ""
      }`}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-bg text-primary">
        <Icon size={32} />
      </div>
      <div className={reversed ? "text-center sm:text-right" : "text-center sm:text-left"}>
        <h3 className="mb-2 text-2xl font-black text-foreground">{title}</h3>
        <p className="font-semibold text-foreground/70">{body}</p>
      </div>
    </div>
  );
}
