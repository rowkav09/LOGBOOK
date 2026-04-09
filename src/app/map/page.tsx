"use client";

import dynamic from "next/dynamic";

const CyberpunkMap = dynamic(() => import("@/components/CyberpunkMap"), { ssr: false });

export default function MapPage() {
  return (
    <main className="h-screen pb-16 md:pb-0">
      <CyberpunkMap />
    </main>
  );
}
