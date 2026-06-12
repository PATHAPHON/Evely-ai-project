"use client";

import dynamic from "next/dynamic";

// sessionStorage is read during first render, so skip SSR entirely
const WordDetailClient = dynamic(() => import("./_components/WordDetailClient"), {
  ssr: false,
});

export default function WordDetailPage() {
  return <WordDetailClient />;
}
